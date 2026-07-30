import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertTransition,
  SLOT_RELEASING_STATUSES,
  type BookingStatus,
} from "../domain/bookingStatus";
import {
  COUNSELING_SERVICE_DEFAULTS,
  type CounselingType,
} from "../domain/counselingType";
import { resolveBookingCommissionBps } from "./commissionService";
import {
  chargeIdempotencyKey,
  createCharge,
  recordChargeSuccess,
  invoiceNumberFor,
} from "./paymentService";
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
  let released = 0;
  for (const booking of expired) {
    // CAS: only cancel if the hold is STILL an expired AWAITING_PAYMENT.
    // A payment confirmation racing this sweep may have just flipped the
    // booking to CONFIRMED — an unconditional update here would clobber a
    // paid booking with CANCELLED. When the guard misses, skip: no history
    // row, no slot release.
    const cancelled = await tx.booking.updateMany({
      where: {
        id: booking.id,
        status: "AWAITING_PAYMENT",
        expiresAt: { lt: new Date() },
      },
      data: {
        status: "CANCELLED",
        cancellationReason: "Payment window expired",
        expiresAt: null,
      },
    });
    if (cancelled.count === 0) continue;
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
    released++;
  }
  return released;
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
      include: {
        therapists: { where: { id: therapist.id }, select: { id: true } },
      },
    });
    if (!service || !service.isActive) throw notFound("Service not found");
    // The service-first flow only ever offers consultants who provide the
    // chosen service; enforce it server-side so a crafted request can't book
    // a consultant for a service they don't offer.
    if (service.therapists.length === 0) {
      throw conflict("This consultant does not offer the selected service");
    }

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
        // The client pays the consultant's own rate (fee model), not a
        // fixed per-service price.
        amountMinor: therapist.feeMinor,
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

  // PAY_NOW: open a gateway checkout for the reservation. The booking stays
  // AWAITING_PAYMENT until the gateway confirms (webhook or status poll) —
  // the client redirect is never trusted. If checkout creation fails, the
  // reservation survives; the payment-status page's retry recovers it and
  // the TTL cleans up abandoned holds.
  let payment: { checkoutUrl: string } | null = null;
  if (input.paymentOption === "PAY_NOW") {
    const { clientAction } = await createCharge({
      bookingId: result.booking.id,
      idempotencyKey: chargeIdempotencyKey(result.booking.id, 1),
    });
    if (
      clientAction.type === "checkout" &&
      typeof clientAction.payload.checkoutUrl === "string"
    ) {
      payment = { checkoutUrl: clientAction.payload.checkoutUrl };
    } else {
      // The configured provider cannot take online payments (e.g. the
      // manual/offline provider) — never leave a client on an unpayable
      // reservation. The transaction already committed, so cancel the hold
      // explicitly before reporting the misconfiguration.
      await transitionBooking({
        bookingId: result.booking.id,
        toStatus: "CANCELLED",
        actorType: "SYSTEM",
        reason: "Online payment unavailable (no checkout-capable provider)",
      });
      throw conflict(
        "Online payment is temporarily unavailable. Please choose pay at clinic, or try again later.",
        "ONLINE_PAYMENT_UNAVAILABLE",
      );
    }
  }

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: result.booking.id },
    include: { client: true, therapist: true, service: true },
  });
  return { booking, payment };
}

/**
 * Admin/consultant-driven status transition with full journalling.
 * Slot holds are released when the booking reaches a releasing status.
 */
export async function transitionBooking(input: {
  bookingId: string;
  toStatus: BookingStatus;
  session?: Session | null;
  actorType?: "ADMIN" | "RECEPTIONIST" | "THERAPIST" | "CLIENT" | "SYSTEM";
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

    // Rejecting a refund reinstates the booking — but not while the gateway
    // is still processing the refund; the money may already be on its way
    // back to the payer.
    if (booking.status === "REFUND_PENDING" && input.toStatus === "CONFIRMED") {
      const inflight = await tx.paymentRecord.findFirst({
        where: {
          bookingId: booking.id,
          kind: "REFUND",
          status: { in: ["CREATED", "PROCESSING"] },
        },
      });
      if (inflight) {
        throw conflict(
          "A refund is currently being processed for this booking and cannot be rejected. Wait for it to settle.",
        );
      }
    }

    const data: Prisma.BookingUpdateManyMutationInput = {
      status: input.toStatus,
    };
    if (input.toStatus === "CANCELLED") {
      data.cancellationReason = input.reason ?? "Cancelled by staff";
      data.expiresAt = null;
    }

    // CAS on the status we validated against: if a concurrent actor (e.g. a
    // payment webhook confirming this booking) moved it first, this stale
    // transition must not clobber theirs.
    const moved = await tx.booking.updateMany({
      where: { id: booking.id, status: booking.status },
      data,
    });
    if (moved.count === 0) {
      throw conflict(
        "The booking was updated concurrently — reload and try again",
      );
    }
    const updated = await tx.booking.findUniqueOrThrow({
      where: { id: booking.id },
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

/**
 * Resolve a counselling type to a concrete Service row, upserting the
 * canonical offering by slug the first time a type is scheduled so the
 * catalogue always carries a matching, priced, timed service.
 */
async function resolveCounselingService(
  tx: Prisma.TransactionClient,
  type: CounselingType,
) {
  const def = COUNSELING_SERVICE_DEFAULTS[type];
  return tx.service.upsert({
    where: { slug: def.slug },
    update: {},
    create: {
      name: def.name,
      description: def.description,
      durationMinutes: def.durationMinutes,
      priceMinor: def.priceMinor,
      slug: def.slug,
      isActive: true,
    },
  });
}

export type ScheduleClientInput =
  | { existingId: string }
  | {
      new: {
        name: string;
        email: string;
        phone: string;
        dob: string;
        emergencyContact: string;
      };
    };

export interface ScheduleAdminBookingInput {
  therapistId: string;
  counselingType: CounselingType;
  dateTime: Date;
  feeMinor: number;
  paymentReceived: boolean;
  paymentRef?: string;
  client: ScheduleClientInput;
  session: Session;
  ip?: string;
}

/**
 * Staff appointment scheduling (admin console and reception desk). Captures
 * the consultant, counselling type, date/time and fee, attaching an existing
 * or freshly-created client.
 * The booking is created CONFIRMED (staff-scheduled, no reservation TTL); the
 * DB slot-uniqueness guard prevents double-booking and leave blocks are
 * honoured. When the fee has already been collected the payment is recorded
 * through the manual provider so revenue/commission ledgers stay accurate.
 *
 * Deliberately not exposed to consultants — only /api/admin and
 * /api/reception routes call this.
 */
export async function scheduleAdminBooking(input: ScheduleAdminBookingInput) {
  if (!Number.isInteger(input.feeMinor) || input.feeMinor <= 0) {
    throw badRequest("The session fee must be a positive amount");
  }

  const created = await prisma.$transaction(async (tx) => {
    await releaseExpiredReservations(tx);

    const therapist = await tx.therapist.findUnique({
      where: { id: input.therapistId },
    });
    if (!therapist) throw notFound("Consultant not found");
    if (!therapist.isActive || therapist.status !== "APPROVED") {
      throw conflict("This consultant is not currently accepting appointments");
    }

    const service = await resolveCounselingService(tx, input.counselingType);

    // Resolve the client: an existing record by id, or upsert a new one by
    // email so repeat clients are never duplicated.
    let clientId: string;
    if ("existingId" in input.client) {
      const existing = await tx.client.findUnique({
        where: { id: input.client.existingId },
      });
      if (!existing) throw notFound("Selected client not found");
      clientId = existing.id;
    } else {
      const c = input.client.new;
      const client = await tx.client.upsert({
        where: { email: c.email.toLowerCase() },
        update: {
          name: c.name,
          phone: c.phone,
          dob: c.dob,
          emergencyContact: c.emergencyContact,
        },
        create: {
          name: c.name,
          email: c.email.toLowerCase(),
          phone: c.phone,
          dob: c.dob,
          emergencyContact: c.emergencyContact,
          gdprConsent: true,
        },
      });
      clientId = client.id;
    }

    if (input.dateTime.getTime() <= Date.now()) {
      throw badRequest("Appointments must be scheduled for a future time");
    }
    // Admin scheduling isn't bound to the weekly availability template, but it
    // must never land inside a consultant's leave block.
    const end = new Date(
      input.dateTime.getTime() + service.durationMinutes * 60000,
    );
    const block = await tx.slotBlock.findFirst({
      where: {
        therapistId: therapist.id,
        startAt: { lt: end },
        endAt: { gt: input.dateTime },
      },
    });
    if (block) {
      throw conflict(
        "The consultant is on leave or otherwise unavailable at the selected time",
      );
    }

    const commissionBps = await resolveBookingCommissionBps(therapist, tx);

    const booking = await tx.booking.create({
      data: {
        therapistId: therapist.id,
        serviceId: service.id,
        clientId,
        dateTime: input.dateTime,
        durationMinutes: service.durationMinutes,
        amountMinor: input.feeMinor,
        commissionBps,
        counselingType: input.counselingType,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        expiresAt: null,
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: { invoiceNumber: invoiceNumberFor(booking.id) },
    });

    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: "CONFIRMED",
        actorType: input.session.role,
        actorId: input.session.userId,
        reason:
          input.session.role === "RECEPTIONIST"
            ? "Appointment scheduled at the front desk"
            : "Appointment scheduled by admin",
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
          "The consultant already has an appointment at this time. Please pick another slot.",
          "SLOT_TAKEN",
        );
      }
      throw err;
    }

    await recordAudit(
      {
        session: input.session,
        action: "booking.schedule",
        entityType: "Booking",
        entityId: booking.id,
        detail: {
          therapistId: therapist.id,
          counselingType: input.counselingType,
          dateTime: input.dateTime.toISOString(),
          feeMinor: input.feeMinor,
          paymentReceived: input.paymentReceived,
        },
        ip: input.ip,
      },
      tx,
    );

    return booking;
  });

  // Fee already collected out-of-band (cash / UPI at the clinic): record it
  // through the manual provider — pinned explicitly, because the DEFAULT
  // provider may be a real gateway and an in-person payment must never
  // create a gateway order — so the GROSS_REVENUE / commission / platform
  // ledger postings and payout maths all stay correct and idempotent.
  if (input.paymentReceived) {
    const { record: charge } = await createCharge({
      bookingId: created.id,
      idempotencyKey: chargeIdempotencyKey(created.id, 1),
      providerName: "manual",
    });
    const providerRef = input.paymentRef?.trim() || undefined;
    await recordChargeSuccess({
      paymentRecordId: charge.id,
      providerPaymentId: providerRef ?? `manual-${created.id.slice(0, 12)}`,
      providerRef,
      actor: input.session,
    });
  }

  return prisma.booking.findUniqueOrThrow({
    where: { id: created.id },
    include: { client: true, therapist: true, service: true },
  });
}
