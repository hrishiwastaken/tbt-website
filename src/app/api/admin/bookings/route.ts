import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  badRequest,
  clientIp,
  handleApi,
  paginated,
  parseBody,
  parsePagination,
  requireAdmin,
  requireStaff,
} from "@/server/http";
import { BOOKING_STATUSES } from "@/server/domain/bookingStatus";
import { COUNSELING_TYPES } from "@/server/domain/counselingType";
import { scheduleAdminBooking } from "@/server/services/bookingService";
import { rupeesToMinor } from "@/server/money";

// Admin booking list: pagination + status/payment/consultant filters,
// free-text search over client and invoice fields, date windowing, sorting.

const SORTABLE = new Set(["dateTime", "createdAt", "amountMinor", "status"]);

export const GET = handleApi(async (request: Request) => {
  await requireStaff(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  const where: Prisma.BookingWhereInput = {};

  const status = searchParams.get("status");
  if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) {
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

  const sortParam = searchParams.get("sort") || "dateTime";
  const sort = SORTABLE.has(sortParam) ? sortParam : "dateTime";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
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

// Admin-only appointment scheduling. Captures consultant, counselling type,
// date/time, fee and (existing or new) client, plus whether the fee has
// already been collected. Consultants have no equivalent create route — only
// the admin can schedule appointments.

const newClientSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
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
    paymentRef: z.string().max(64).optional(),
    clientId: z.string().min(1).optional(),
    newClient: newClientSchema.optional(),
  })
  .refine((v) => Boolean(v.clientId) !== Boolean(v.newClient), {
    message: "Provide either an existing client or new client details",
    path: ["clientId"],
  });

export const POST = handleApi(async (request: Request) => {
  const session = await requireAdmin(request);
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
