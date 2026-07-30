import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, requireReception } from "@/server/http";
import { releaseExpiredReservations } from "@/server/services/bookingService";

// Front-desk overview. Everything here is aggregated live from Booking,
// PaymentRecord and Client — no cached counters — and is scoped to what a
// receptionist acts on: today's list, what still needs confirming, what
// still needs collecting, and what was taken at the desk today.
//
// Platform margin, commission and payout figures are deliberately absent;
// those live in the admin console.

const BOOKING_CARD = {
  id: true,
  dateTime: true,
  durationMinutes: true,
  amountMinor: true,
  status: true,
  paymentStatus: true,
  invoiceNumber: true,
  counselingType: true,
  client: { select: { id: true, name: true, email: true, phone: true } },
  therapist: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
} as const;

export const GET = handleApi(async (request: Request) => {
  await requireReception(request);

  // Lapsed payment holds free their slots before anything is counted, so the
  // desk never chases a reservation the system has already let go.
  await releaseExpiredReservations();

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const weekAhead = new Date(dayStart);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekBack = new Date(dayStart);
  weekBack.setDate(weekBack.getDate() - 7);

  const today = { gte: dayStart, lte: dayEnd };

  const [
    todayTotal,
    todayConfirmed,
    todayUnpaid,
    awaitingConfirmation,
    awaitingPayment,
    unpaidOutstanding,
    upcomingWeek,
    collectedToday,
    refundedToday,
    outstandingValue,
    newClientsWeek,
    totalClients,
    todaySchedule,
    needsAttention,
  ] = await Promise.all([
    prisma.booking.count({ where: { dateTime: today } }),
    prisma.booking.count({
      where: { dateTime: today, status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    prisma.booking.count({
      where: {
        dateTime: today,
        paymentStatus: "UNPAID",
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
    }),
    prisma.booking.count({
      where: { status: "PENDING", dateTime: { gte: now } },
    }),
    prisma.booking.count({
      where: { status: "AWAITING_PAYMENT", dateTime: { gte: now } },
    }),
    prisma.booking.count({
      where: {
        paymentStatus: "UNPAID",
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
      },
    }),
    prisma.booking.count({
      where: {
        dateTime: { gte: dayStart, lt: weekAhead },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
    }),
    prisma.paymentRecord.aggregate({
      _sum: { amountMinor: true },
      _count: { _all: true },
      where: { kind: "CHARGE", status: "SUCCEEDED", createdAt: today },
    }),
    prisma.paymentRecord.aggregate({
      _sum: { amountMinor: true },
      _count: { _all: true },
      where: { kind: "REFUND", status: "SUCCEEDED", createdAt: today },
    }),
    prisma.booking.aggregate({
      _sum: { amountMinor: true },
      where: {
        paymentStatus: "UNPAID",
        status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
      },
    }),
    prisma.client.count({ where: { createdAt: { gte: weekBack } } }),
    prisma.client.count(),
    prisma.booking.findMany({
      where: { dateTime: today },
      select: BOOKING_CARD,
      orderBy: { dateTime: "asc" },
    }),
    // The desk's working queue: upcoming sessions that are unconfirmed, on a
    // live payment hold, or confirmed-but-unpaid.
    prisma.booking.findMany({
      where: {
        dateTime: { gte: now },
        OR: [
          { status: { in: ["PENDING", "AWAITING_PAYMENT"] } },
          { status: "CONFIRMED", paymentStatus: "UNPAID" },
        ],
      },
      select: BOOKING_CARD,
      orderBy: { dateTime: "asc" },
      take: 12,
    }),
  ]);

  return NextResponse.json({
    kpis: {
      todayTotal,
      todayConfirmed,
      todayUnpaid,
      awaitingConfirmation,
      awaitingPayment,
      unpaidOutstanding,
      upcomingWeek,
      collectedTodayMinor: collectedToday._sum.amountMinor ?? 0,
      collectedTodayCount: collectedToday._count._all,
      refundedTodayMinor: refundedToday._sum.amountMinor ?? 0,
      refundedTodayCount: refundedToday._count._all,
      outstandingMinor: outstandingValue._sum.amountMinor ?? 0,
      newClientsWeek,
      totalClients,
    },
    todaySchedule,
    needsAttention,
  });
});
