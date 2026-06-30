import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature && !process.env.RAZORPAY_WEBHOOK_SECRET.includes("mock")) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    // Verify webhook signature
    let isValid = false;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "mockwebhooksecret123";

    if (webhookSecret.includes("mock")) {
      console.warn("Bypassing webhook signature validation in dev/mock mode.");
      isValid = true;
    } else {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");
      isValid = expectedSignature === signature;
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Handle payment capture / order paid events
    if (event === "order.paid" || event === "payment.captured") {
      const entity = payload.payload.payment?.entity || payload.payload.order?.entity;
      const razorpayOrderId = entity.order_id;
      const razorpayPaymentId = entity.id;

      if (razorpayOrderId) {
        // Find booking matching this Razorpay Order ID
        const booking = await prisma.booking.findUnique({
          where: { razorpayOrderId },
        });

        if (booking && booking.status === "PENDING") {
          const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.id.slice(0, 6).toUpperCase()}`;

          // Confirm the booking
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: "CONFIRMED",
              paymentStatus: "PAID",
              razorpayPaymentId,
              invoiceNumber,
            },
          });

          // Check if payment transaction already logged
          const existingPayment = await prisma.payment.findFirst({
            where: { bookingId: booking.id, razorpayPaymentId },
          });

          if (!existingPayment) {
            await prisma.payment.create({
              data: {
                bookingId: booking.id,
                amount: booking.amount,
                status: "SUCCESS",
                razorpayPaymentId,
                invoiceNumber,
              },
            });
          }

          console.log(`Webhook auto-confirmed booking ${booking.id} upon payment success.`);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
