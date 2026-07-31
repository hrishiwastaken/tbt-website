import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  handleApi,
  paginated,
  parsePagination,
  requireTherapist,
} from "@/server/http";
import { BOOKING_STATUSES } from "@/server/domain/bookingStatus";
import { stripNotes } from "@/server/serializers/publicBooking";

// Own-scoped appointment register — identical filter/search/sort surface to
// the admin list, but therapistId is fixed to the caller and never a filter
// the client can override.

const SORTABLE = new Set(["dateTime", "createdAt", "amountMinor", "status"]);

export const GET = handleApi(async (request: Request) => {
  const { therapistId } = await requireTherapist(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  const where: Prisma.BookingWhereInput = { therapistId };

  const status = searchParams.get("status");
  if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }
  const paymentStatus = searchParams.get("paymentStatus");
  if (paymentStatus && ["UNPAID", "PAID", "REFUNDED"].includes(paymentStatus)) {
    where.paymentStatus = paymentStatus;
  }

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
        service: { select: { id: true, name: true, durationMinutes: true } },
      },
      orderBy: { [sort]: order },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.booking.count({ where }),
  ]);

  // The encrypted clinical-notes blob is read (and decrypted) only through
  // the single-booking detail route, never surfaced in a list payload.
  return NextResponse.json(paginated(stripNotes(bookings), total, pagination));
});
