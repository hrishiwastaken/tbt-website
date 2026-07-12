import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertTransition,
  SLOT_RELEASING_STATUSES,
  type BookingStatus,
} from "../domain/bookingStatus";
import { resolveBookingCommissionBps } from "./commissionService";
import {
  createCharge,
  recordChargeSuccess,
  invoiceNumberFor,
} from "./paymentService";
import { getPaymentProvider } from "../payments/registry";
import { badRequest, conflict, notFound, type Session } from "../http";
import { recordAudit } from "../audit";

// Booking lifecycle service. All state changes flow through the domain
// state machine, are journalled to BookingStatusHistory, and slot holds are
// enforced by the BookingSlot unique constraint inside the same transaction
// — the database, not application code, is the final double-booking arbiter.

/** Minutes an unpaid AWAITING_PAYMENT reservation holds its slot. */
export const RESERVATION_TTL_MINUTES = 30;

export interface CreateBookingInput {
  therapistSlug: string;
  serviceSlug: string;
  dateTime: Date;
  client: {
    name: string;
    email: string;
    phone: string;
    dob: string;
    emergencyContact: string;
    gdprConsent: boolean;
  };
  paymentOption: "PAY_NOW" | "PAY_LATER";
  paymentProof?: { utr?: string };
}

/**
 * Cancel AWAITING_PAYMENT holds whose TTL lapsed, freeing their slots.
 * Runs lazily ahead of availability reads and booking writes.
 */
export async function releaseExpiredReservations(
  tx: Prisma.TransactionClient = prisma,
): Promise<number> {
  const expired = await tx.booking.findMany({
    where: { status: "AWAITING_PAYMENT", expiresAt: { lt: new Date() } },
    select: { id: true, status: true },
  });
  for (const booking of expired) {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancellationReason: "Payment window expired",
      },
    });
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: "CANCELLED",
        actorType: "SYSTEM",
        reason: "Reservation expired before payment",
      },
    });
    await tx.bookingSlot.deleteMany({ where: { bookingId: booking.id } });
  }
  return expired.length;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function validateSlotWithinSchedule(
  tx: Prisma.TransactionClient,
  therapistId: string,
  dateTime: Date,
  durationMinutes: number,
): Promise<void> {
  if (dateTime.getTime() <= Date.now()) {
    throw badRequest("Sessions must be booked for a future time");
  }
  const hh = String(dateTime.getHours()).padStart(2, "0");
  const mm = String(dateTime.getMinutes()).padStart(2, "0");
  const startTime = `${hh}:${mm}`;

  const slot = await tx.therapistAvailability.findFirst({
    where: { therapistId, dayOfWeek: dateTime.getDay(), startTime },
  });
  if (!slot)
    throw conflict(
      "The selected time is outside the consultant's working hours",
    );

  const end = new Date(dateTime.getTime() + durationMinutes * 60000);
  const block = await tx.slotBlock.findFirst({
    where: { therapistId, startAt: { lt: end }, endAt: { gt: dateTime } },
  });
  if (block)
    throw conflict("The consultant is unavailable at the selected time");
}

export async function createBooking(input: CreateBookingInput) {
  const result = await prisma.$transaction(async (tx) => {
    await releaseExpiredReservations(tx);

    const therapist = await tx.therapist.findUnique({
      where: { slug: input.therapistSlug },
    });
    if (!therapist || !therapist.isActive || therapist.status !== "APPROVED") {
      throw notFound(
        "Consultant not found or not currently accepting bookings",
      );
    }
    const service = await tx.service.findUnique({
      where: { slug: input.serviceSlug },
    });
    if (!service || !service.isActive) throw notFound("Service not found");

    await validateSlotWithinSchedule(
      tx,
      therapist.id,
      input.dateTime,
      service.durationMinutes,
    );

    const client = await tx.client.upsert({
      where: { email: input.client.email },
      update: {
        name: input.client.name,
        phone: input.client.phone,
        dob: input.client.dob,
        emergencyContact: input.client.emergencyContact,
      },
      create: { ...input.client },
    });

    const commissionBps = await resolveBookingCommissionBps(therapist, tx);
    const payNow = input.paymentOption === "PAY_NOW";
    const initialStatus: BookingStatus = payNow
      ? "AWAITING_PAYMENT"
      : "CONFIRMED";

    const booking = await tx.booking.create({
      data: {
        therapistId: therapist.id,
        serviceId: service.id,
        clientId: client.id,
        dateTime: input.dateTime,
        durationMinutes: service.durationMinutes,
        amountMinor: service.priceMinor,
        commissionBps,
        status: initialStatus,
        paymentStatus: "UNPAID",
        expiresAt: payNow
          ? new Date(Date.now() + RESERVATION_TTL_MINUTES * 60000)
          : null,
        invoiceNumber: payNow ? null : undefined,
      },
    });
    if (!payNow) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { invoiceNumber: invoiceNumberFor(booking.id) },
      });
    }

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: initialStatus,
        actorType: "CLIENT",
        reason: payNow
          ? "Reservation created, awaiting payment"
          : "Booked with pay-at-clinic",
      },
    });

    // DB-level double-booking guard: unique(therapistId, startAt).
    try {
      await tx.bookingSlot.create({
        data: {
          therapistId: therapist.id,
          startAt: input.dateTime,
          bookingId: booking.id,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict(
          "The selected time slot is no longer available. Please pick another slot.",
          "SLOT_TAKEN",
        );
      }
      throw err;
    }

    return { booking, client, therapist, service };
  });

  // PAY_NOW: create the charge and verify the supplied proof through the
  // provider abstraction. Verification failure leaves an AWAITING_PAYMENT
  // reservation that expires and frees the slot automatically.
  if (input.paymentOption === "PAY_NOW") {
    const idempotencyKey = `charge:${result.booking.id}`;
    const charge = await createCharge({
      bookingId: result.booking.id,
      idempotencyKey,
    });
    const provider = getPaymentProvider(charge.provider);
    const verification = await provider.verifyPayment({
      providerOrderId: charge.providerOrderId ?? "",
      proof: input.paymentProof?.utr
        ? { utr: input.paymentProof.utr }
        : undefined,
    });
    if (verification.ok === false) {
      throw badRequest(verification.reason, "PAYMENT_VERIFICATION_FAILED");
    }
    await recordChargeSuccess({
      paymentRecordId: charge.id,
      providerPaymentId: verification.providerPaymentId,
      providerRef: input.paymentProof?.utr,
    });
  }

  return prisma.booking.findUniqueOrThrow({
    where: { id: result.booking.id },
    include: { client: true, therapist: true, service: true },
  });
}

/**
 * Admin/consultant-driven status transition with full journalling.
 * Slot holds are released when the booking reaches a releasing status.
 */
export async function transitionBooking(input: {
  bookingId: string;
  toStatus: BookingStatus;
  session?: Session | null;
  actorType?: "ADMIN" | "THERAPIST" | "CLIENT" | "SYSTEM";
  reason?: string;
  ip?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { slot: true },
    });
    if (!booking) throw notFound("Booking not found");

    assertTransition(booking.status, input.toStatus);

    const data: Prisma.BookingUpdateInput = { status: input.toStatus };
    if (input.toStatus === "CANCELLED") {
      data.cancellationReason = input.reason ?? "Cancelled by staff";
      data.expiresAt = null;
    }

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data,
    });
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: input.toStatus,
        actorType: input.actorType ?? input.session?.role ?? "SYSTEM",
        actorId: input.session?.userId ?? null,
        reason: input.reason ?? null,
      },
    });
    if (SLOT_RELEASING_STATUSES.includes(input.toStatus) && booking.slot) {
      await tx.bookingSlot.delete({ where: { id: booking.slot.id } });
    }
    await recordAudit(
      {
        session: input.session ?? null,
        action: `booking.${input.toStatus.toLowerCase()}`,
        entityType: "Booking",
        entityId: booking.id,
        detail: {
          from: booking.status,
          to: input.toStatus,
          reason: input.reason,
        },
        ip: input.ip,
      },
      tx,
    );
    return updated;
  });
}

/** Move a booking to a new slot, revalidating availability atomically. */
export async function rescheduleBooking(input: {
  bookingId: string;
  newDateTime: Date;
  session: Session;
  reason?: string;
  ip?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await releaseExpiredReservations(tx);

    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { slot: true },
    });
    if (!booking) throw notFound("Booking not found");
    if (
      !["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status)
    ) {
      throw conflict(
        `A ${booking.status.toLowerCase()} booking cannot be rescheduled`,
      );
    }

    await validateSlotWithinSchedule(
      tx,
      booking.therapistId,
      input.newDateTime,
      booking.durationMinutes,
    );

    if (booking.slot) {
      await tx.bookingSlot.delete({ where: { id: booking.slot.id } });
    }
    try {
      await tx.bookingSlot.create({
        data: {
          therapistId: booking.therapistId,
          startAt: input.newDateTime,
          bookingId: booking.id,
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw conflict(
          "The new time slot is no longer available",
          "SLOT_TAKEN",
        );
      }
      throw err;
    }

    const previous = booking.dateTime;
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { dateTime: input.newDateTime },
    });
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: booking.status,
        actorType: input.session.role,
        actorId: input.session.userId,
        reason:
          input.reason ??
          `Rescheduled from ${previous.toISOString()} to ${input.newDateTime.toISOString()}`,
      },
    });
    await recordAudit(
      {
        session: input.session,
        action: "booking.reschedule",
        entityType: "Booking",
        entityId: booking.id,
        detail: {
          from: previous.toISOString(),
          to: input.newDateTime.toISOString(),
        },
        ip: input.ip,
      },
      tx,
    );
    return updated;
  });
}
