import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      isMock,
    } = body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking record not found" }, { status: 404 });
    }

    // Verify signature
    let signatureVerified = false;

    const isMockKeys =
      isMock ||
      !process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_KEY_SECRET.includes("mock") ||
      razorpay_order_id.startsWith("order_mock_");

    if (isMockKeys) {
      console.warn("Bypassing signature validation for mock transaction.");
      signatureVerified = true;
    } else {
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest("hex");

      signatureVerified = generated_signature === razorpay_signature;
    }

    if (!signatureVerified) {
      return NextResponse.json({ error: "Invalid payment signature verification failed." }, { status: 400 });
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.id.slice(0, 6).toUpperCase()}`;

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        razorpayPaymentId: razorpay_payment_id,
        invoiceNumber,
      },
    });

    // Create payment entry
    await prisma.payment.create({
      data: {
        bookingId: bookingId,
        amount: booking.amount,
        status: "SUCCESS",
        razorpayPaymentId: razorpay_payment_id,
        invoiceNumber,
      },
    });

    // TODO: Send confirmation email (Nodemailer/Resend) and schedule WhatsApp messages here

    return NextResponse.json({
      message: "Payment successfully verified and appointment confirmed.",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
