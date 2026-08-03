import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { paymentReferenceSchema, phoneSchema } from "@/server/validation";
import { prisma } from "@/lib/db";
import {
  badRequest,
  clientIp,
  handleApi,
  paginated,
  parseBody,
  parsePagination,
  requireReception,
} from "@/server/http";
import { BOOKING_STATUSES } from "@/server/domain/bookingStatus";
import { COUNSELING_TYPES } from "@/server/domain/counselingType";
import {
  releaseExpiredReservations,
  scheduleAdminBooking,
} from "@/server/services/bookingService";
import { rupeesToMinor } from "@/server/money";

// Front-desk appointment register. Same filtering surface as the admin
// booking list, plus the desk-specific `queue` presets that drive the
// confirmations screen. The projection omits clinical notes entirely.

const SORTABLE = new Set(["dateTime", "createdAt", "amountMinor", "status"]);

/**
 * Desk work queues, expressed as SQL rather than post-filtering in the UI so
 * paging and counts stay correct.
 *   unconfirmed — upcoming sessions the client has not confirmed yet
 *   holds       — live pay-now reservations still inside their TTL
 *   unpaid      — booked sessions whose fee has not been collected
 *   today       — everything on today's sheet
 *   upcoming    — the next seven days, excluding dead bookings
 */
function queueFilter(
  queue: string | null,
  now: Date,
): Prisma.BookingWhereInput | null {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  switch (queue) {
    case "unconfirmed":
      return { status: "PENDING", dateTime: { gte: now } };
    case "holds":
      return { status: "AWAITING_PAYMENT", dateTime: { gte: now } };
    case "unpaid":
      return {
        paymentStatus: "UNPAID",
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
      };
    case "today":
      return { dateTime: { gte: dayStart, lte: dayEnd } };
    case "upcoming": {
      const weekAhead = new Date(dayStart);
      weekAhead.setDate(weekAhead.getDate() + 7);
      return {
        dateTime: { gte: now, lt: weekAhead },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      };
    }
    default:
      return null;
  }
}

export const GET = handleApi(async (request: Request) => {
  await requireReception(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  // Expired holds are released before the read so the desk never sees (or
  // chases) a reservation the system has already let go.
  await releaseExpiredReservations();

  const now = new Date();
  const where: Prisma.BookingWhereInput = {};
  const and: Prisma.BookingWhereInput[] = [];

  const queue = queueFilter(searchParams.get("queue"), now);
  if (queue) and.push(queue);

  const status = searchParams.get("status");
  if (status === "AWAITING_PAYMENT") {
    // "Awaiting Payment" reads to front-desk staff as "money still owed",
    // not just the transient online-checkout hold — so it also catches
    // confirmed/completed/no-show sessions billed at the clinic that
    // haven't been paid yet (same definition as the `unpaid` desk queue).
    and.push({
      OR: [
        { status: "AWAITING_PAYMENT" },
        {
          paymentStatus: "UNPAID",
          status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
        },
      ],
    });
  } else if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }
  const paymentStatus = searchParams.get("paymentStatus");
  if (paymentStatus && ["UNPAID", "PAID", "REFUNDED"].includes(paymentStatus)) {
    where.paymentStatus = paymentStatus;
  }
  const therapistId = searchParams.get("therapistId");
  if (therapistId) where.therapistId = therapistId;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    where.dateTime = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    };
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    where.OR = [
      { client: { name: { contains: q, mode: "insensitive" } } },
      { client: { email: { contains: q, mode: "insensitive" } } },
      { client: { phone: { contains: q } } },
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { id: { equals: q } },
    ];
  }

  if (and.length > 0) where.AND = and;

  const sortParam = searchParams.get("sort") || "dateTime";
  const sort = SORTABLE.has(sortParam) ? sortParam : "dateTime";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        dateTime: true,
        durationMinutes: true,
        amountMinor: true,
        discountMinor: true,
        status: true,
        paymentStatus: true,
        invoiceNumber: true,
        counselingType: true,
        createdAt: true,
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        therapist: { select: { id: true, name: true, slug: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
      },
      orderBy: { [sort]: order },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.booking.count({ where }),
  ]);

  return NextResponse.json(paginated(bookings, total, pagination));
});

// Desk scheduling — the same service the admin console calls, so slot
// uniqueness, leave blocks, commission snapshotting and (when the fee is
// collected up front) the ledger postings are identical. The status history
// records RECEPTIONIST as the actor.

const newClientSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: phoneSchema,
  age: z.coerce.number().int().min(1).max(120),
  emergencyContact: z.string().min(3).max(200),
});

const scheduleSchema = z
  .object({
    therapistId: z.string().min(1),
    counselingType: z.enum(COUNSELING_TYPES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
    feeRupees: z.number().positive(),
    paymentReceived: z.boolean().default(false),
    paymentRef: paymentReferenceSchema.optional(),
    clientId: z.string().min(1).optional(),
    newClient: newClientSchema.optional(),
  })
  .refine((v) => Boolean(v.clientId) !== Boolean(v.newClient), {
    message: "Provide either an existing client or new client details",
    path: ["clientId"],
  });

export const POST = handleApi(async (request: Request) => {
  const session = await requireReception(request);
  const body = parseBody(scheduleSchema, await request.json());

  const dateTime = new Date(`${body.date}T${body.time}:00`);
  if (isNaN(dateTime.getTime())) throw badRequest("Invalid date or time");

  const booking = await scheduleAdminBooking({
    therapistId: body.therapistId,
    counselingType: body.counselingType,
    dateTime,
    feeMinor: rupeesToMinor(body.feeRupees),
    paymentReceived: body.paymentReceived,
    paymentRef: body.paymentRef,
    client: body.newClient
      ? { new: body.newClient }
      : { existingId: body.clientId! },
    session,
    ip: clientIp(request),
  });

  return NextResponse.json({ booking }, { status: 201 });
});
