import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  handleApi,
  paginated,
  parsePagination,
  requireStaff,
} from "@/server/http";
import { BOOKING_STATUSES } from "@/server/domain/bookingStatus";

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
