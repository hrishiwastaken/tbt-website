import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BookingConfirmedPage({ searchParams }) {
  const sParams = await searchParams;
  const bookingId = sParams.id;

  if (!bookingId) {
    notFound();
  }

  // Fetch complete booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      therapist: true,
      service: true,
      client: true,
    },
  });

  if (!booking) {
    notFound();
  }

  // An unpaid hold is not a confirmation — a stale/shared link must land on
  // the live payment-status page, never a "reserved" screen.
  if (booking.status === "AWAITING_PAYMENT") {
    redirect(`/booking/payment-status?bookingId=${booking.id}`);
  }
  if (["CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(booking.status)) {
    redirect(`/booking/payment-status?bookingId=${booking.id}`);
  }

  const formattedDate = new Date(booking.dateTime).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(booking.dateTime).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-6 md:px-12 py-28 text-center">
      <div className="glass-card rounded-2xl p-8 md:p-12 border border-mist/30 shadow-warm-soft max-w-2xl mx-auto flex flex-col items-center">
        {/* Checkmark Icon */}
        <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 border border-emerald-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        <span className="font-dmsans text-xs font-bold tracking-widest text-terracotta uppercase block mb-2">
          Reservation Completed
        </span>
        <h1 className="font-cormorant text-4xl font-semibold text-charcoal mb-4">
          Your Slot is Reserved
        </h1>
        <p className="font-dmsans text-sm text-sage mb-8 max-w-md">
          A confirmation receipt has been sent to{" "}
          <strong>{booking.client.email}</strong>. Please review the details
          below.
        </p>

        {/* Details Table */}
        <div className="w-full bg-warm-white/50 rounded-xl border border-mist/20 p-6 flex flex-col gap-4 text-left mb-8 font-dmsans text-sm">
          <div className="flex justify-between items-center border-b border-mist/10 pb-3">
            <span className="text-xs font-bold uppercase text-sage">
              Receipt Number
            </span>
            <span className="font-mono text-charcoal font-semibold">
              {booking.invoiceNumber ||
                `REC-${booking.id.slice(0, 8).toUpperCase()}`}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-mist/10 pb-3">
            <span className="text-xs font-bold uppercase text-sage">
              Practitioner
            </span>
            <span className="text-charcoal font-semibold">
              {booking.therapist.name}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-mist/10 pb-3">
            <span className="text-xs font-bold uppercase text-sage">
              Service
            </span>
            <span className="text-charcoal font-semibold">
              {booking.service.name}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-mist/10 pb-3">
            <span className="text-xs font-bold uppercase text-sage">
              Date & Time
            </span>
            <span className="text-charcoal font-semibold">
              {formattedDate} at {formattedTime}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-mist/10 pb-3">
            <span className="text-xs font-bold uppercase text-sage">
              Amount
            </span>
            <span className="text-charcoal font-semibold">
              ₹{(booking.amountMinor / 100).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-sage">
              Payment Status
            </span>
            <span
              className={`px-3 py-1 rounded text-xs font-semibold ${
                booking.paymentStatus === "PAID"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                  : "bg-mist/20 text-sage"
              }`}
            >
              {booking.paymentStatus === "PAID"
                ? "Paid Online"
                : "Pending (Pay Post-Session)"}
            </span>
          </div>
        </div>

        {/* Guidelines */}
        <div className="text-left font-dmsans text-xs text-sage leading-relaxed border-t border-mist/20 pt-6 w-full">
          <h4 className="font-bold text-charcoal mb-2">
            Important Session Guidelines:
          </h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Please arrive 10 minutes prior to your scheduled time to settle
              into the clinical sanctuary.
            </li>
            <li>
              To reschedule or cancel this slot without penalty, please contact
              support at least <strong>12 hours</strong> in advance.
            </li>
            <li>
              WhatsApp reminders with session logs will be sent 24 hours and 1
              hour before start.
            </li>
          </ul>
        </div>

        <div className="flex gap-4 mt-8">
          <Link
            href="/"
            className="border border-forest/30 text-forest hover:bg-forest hover:text-warm-white px-6 py-3 rounded-full font-dmsans text-xs font-bold tracking-widest uppercase transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="bg-forest hover:bg-terracotta text-warm-white px-6 py-3 rounded-full font-dmsans text-xs font-bold tracking-widest uppercase transition-colors"
          >
            Inquire Support
          </Link>
        </div>
      </div>
    </main>
  );
}
