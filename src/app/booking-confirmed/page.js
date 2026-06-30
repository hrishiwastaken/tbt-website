import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
    <>
      <Navbar />

      <main className="flex-grow w-full max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-16 text-center">
        <div className="bg-linen-surface/80 rounded-[20px] p-8 md:p-12 border border-surface-variant/40 shadow-sm max-w-2xl mx-auto flex flex-col items-center">
          
          {/* Animated check motif */}
          <div className="h-16 w-16 bg-[#d6e7d7] text-[#111f15] rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[32px]">check_circle</span>
          </div>

          <span className="font-label text-label text-rosewood-cta uppercase tracking-widest block mb-2">Reservation Completed</span>
          <h1 className="font-hero text-h1 text-on-surface mb-4">Your Slot is Reserved</h1>
          <p className="font-body text-body text-taupe-body mb-8 max-w-md">
            A confirmation receipt has been sent to <strong>{booking.client.email}</strong>. Please review the details below.
          </p>

          {/* Details Table */}
          <div className="w-full bg-alabaster-bg rounded-xl border border-surface-variant/30 p-6 flex flex-col gap-4 text-left mb-8 font-body text-body">
            <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
              <span className="font-label text-label text-taupe-body uppercase">Receipt Number</span>
              <span className="font-mono text-caption text-on-surface font-semibold">
                {booking.invoiceNumber || `REC-${booking.id.slice(0, 8).toUpperCase()}`}
              </span>
            </div>
            
            <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
              <span className="font-label text-label text-taupe-body uppercase">Practitioner</span>
              <span className="text-on-surface font-semibold">{booking.therapist.name}</span>
            </div>

            <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
              <span className="font-label text-label text-taupe-body uppercase">Service</span>
              <span className="text-on-surface font-semibold">{booking.service.name}</span>
            </div>

            <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
              <span className="font-label text-label text-taupe-body uppercase">Date & Time</span>
              <span className="text-on-surface font-semibold">
                {formattedDate} at {formattedTime}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-surface-variant/20 pb-3">
              <span className="font-label text-label text-taupe-body uppercase">Amount</span>
              <span className="text-on-surface font-semibold">
                ₹{(booking.amount).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-label text-label text-taupe-body uppercase">Payment Status</span>
              <span className={`px-3 py-1 rounded text-caption font-semibold ${
                booking.paymentStatus === "PAID" 
                  ? "bg-[#d6e7d7] text-[#111f15]"
                  : "bg-surface-container text-taupe-body"
              }`}>
                {booking.paymentStatus === "PAID" ? "Paid Online" : "Pending (Pay Post-Session)"}
              </span>
            </div>
          </div>

          {/* Guide notes */}
          <div className="text-left font-body text-caption text-taupe-body leading-relaxed border-t border-surface-variant/30 pt-6 w-full">
            <h4 className="font-semibold text-on-surface mb-2">Important Session Guidelines:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Please arrive 10 minutes prior to your scheduled time to settle into the clinical sanctuary.</li>
              <li>To reschedule or cancel this slot without penalty, please contact support at least <strong>12 hours</strong> in advance.</li>
              <li>WhatsApp reminders with the direct session links will be sent 24 hours and 1 hour before start.</li>
            </ul>
          </div>

          <div className="flex gap-4 mt-8">
            <Link
              href="/"
              className="border border-outline text-on-surface hover:bg-surface-container-low px-6 py-3 rounded-full font-label text-label uppercase tracking-widest transition-colors"
            >
              Back to Home
            </Link>
            <Link
              href="/contact"
              className="bg-rosewood-cta text-on-primary hover:opacity-90 px-6 py-3 rounded-full font-label text-label uppercase tracking-widest transition-opacity"
            >
              Inquire Support
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
}
