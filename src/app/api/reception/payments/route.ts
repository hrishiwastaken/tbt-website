import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  handleApi,
  paginated,
  parsePagination,
  requireReception,
} from "@/server/http";

// Read-only payment record for the desk: which fees have actually landed,
// through which provider, against which invoice.
//
// The totals returned alongside are *collection* figures (what came in, what
// went back out, what is still owed) — not the platform's margin. Commission,
// platform share and consultant payouts stay in the admin console.

export const GET = handleApi(async (request: Request) => {
  await requireReception(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  const where: Prisma.PaymentRecordWhereInput = {};

  const status = searchParams.get("status");
  if (
    status &&
    ["CREATED", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED"].includes(
      status,
    )
  ) {
    where.status = status;
  }
  const kind = searchParams.get("kind");
  if (kind && ["CHARGE", "REFUND"].includes(kind)) where.kind = kind;
  const provider = searchParams.get("provider");
  if (provider) where.provider = provider;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    };
  }

  const q = searchParams.get("q")?.trim();
  if (q) {
    where.OR = [
      { providerPaymentId: { contains: q, mode: "insensitive" } },
      { providerRef: { contains: q, mode: "insensitive" } },
      { booking: { invoiceNumber: { contains: q, mode: "insensitive" } } },
      { booking: { client: { name: { contains: q, mode: "insensitive" } } } },
      { booking: { client: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }

  // "Today" is the closed [00:00, 23:59:59.999] window, matching the front-desk
  // dashboard exactly — an unbounded `gte` would drift from it.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const [payments, total, collected, refunded, collectedToday, outstanding] =
    await Promise.all([
      prisma.paymentRecord.findMany({
        where,
        select: {
          id: true,
          kind: true,
          provider: true,
          amountMinor: true,
          status: true,
          providerPaymentId: true,
          providerRef: true,
          failureReason: true,
          createdAt: true,
          booking: {
            select: {
              id: true,
              invoiceNumber: true,
              dateTime: true,
              status: true,
              paymentStatus: true,
              client: { select: { id: true, name: true, email: true } },
              service: { select: { name: true } },
              therapist: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.paymentRecord.count({ where }),
      prisma.paymentRecord.aggregate({
        _sum: { amountMinor: true },
        where: { kind: "CHARGE", status: "SUCCEEDED" },
      }),
      prisma.paymentRecord.aggregate({
        _sum: { amountMinor: true },
        where: { kind: "REFUND", status: "SUCCEEDED" },
      }),
      prisma.paymentRecord.aggregate({
        _sum: { amountMinor: true },
        where: {
          kind: "CHARGE",
          status: "SUCCEEDED",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      prisma.booking.aggregate({
        _sum: { amountMinor: true },
        _count: { _all: true },
        where: {
          paymentStatus: "UNPAID",
          status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
        },
      }),
    ]);

  return NextResponse.json({
    ...paginated(payments, total, pagination),
    summary: {
      collectedMinor: collected._sum.amountMinor ?? 0,
      refundedMinor: refunded._sum.amountMinor ?? 0,
      collectedTodayMinor: collectedToday._sum.amountMinor ?? 0,
      outstandingMinor: outstanding._sum.amountMinor ?? 0,
      outstandingCount: outstanding._count._all,
    },
  });
});
