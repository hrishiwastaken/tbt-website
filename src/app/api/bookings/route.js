import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimiter } from "@/lib/rateLimit";

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
    const { isBlocked } = rateLimiter(ip, 5, 60000); // 5 bookings per minute

    if (isBlocked) {
      return NextResponse.json(
        { error: "Too many booking requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      therapistSlug,
      serviceSlug,
      date: dateStr, // YYYY-MM-DD
      time: timeStr, // HH:MM
      name,
      email,
      phone,
      dob,
      emergencyContact,
      gdprConsent,
      paymentOption, // "PAY_NOW" or "PAY_LATER"
      upiUtr,
    } = body;

    // 1. Basic validation
    if (
      !therapistSlug ||
      !serviceSlug ||
      !dateStr ||
      !timeStr ||
      !name ||
      !email ||
      !phone ||
      !dob ||
      !emergencyContact ||
      !gdprConsent ||
      !paymentOption
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!gdprConsent) {
      return NextResponse.json({ error: "GDPR Consent is mandatory to book a session" }, { status: 400 });
    }

    // 2. Fetch Therapist & Service
    const therapist = await prisma.therapist.findUnique({ where: { slug: therapistSlug } });
    const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });

    if (!therapist || !service) {
      return NextResponse.json({ error: "Therapist or service not found" }, { status: 404 });
    }

    // 3. Check for double booking
    const bookingDate = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json({ error: "Invalid date or time format" }, { status: 400 });
    }

    const endSlot = new Date(bookingDate);
    endSlot.setMinutes(endSlot.getMinutes() + service.durationMinutes);

    const existingBooking = await prisma.booking.findFirst({
      where: {
        therapistId: therapist.id,
        dateTime: bookingDate,
        status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "The selected time slot is no longer available. Please select another slot." },
        { status: 409 }
      );
    }

    // 4. Create or update Client
    let client = await prisma.client.findUnique({ where: { email } });
    if (client) {
      client = await prisma.client.update({
        where: { email },
        data: { name, phone, dob, emergencyContact },
      });
    } else {
      client = await prisma.client.create({
        data: { name, email, phone, dob, emergencyContact, gdprConsent },
      });
    }

    // 5. Calculate amount (using USD to INR multiplier: 80)
    const amountInINR = service.price * 80;

    // 6. Save Booking record
    const initialStatus = paymentOption === "PAY_LATER" ? "CONFIRMED" : "PENDING";
    const initialPaymentStatus = "PENDING";

    const booking = await prisma.booking.create({
      data: {
        therapistId: therapist.id,
        serviceId: service.id,
        clientId: client.id,
        dateTime: bookingDate,
        durationMinutes: service.durationMinutes,
        amount: amountInINR,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
      },
    });

    // 7. Handle Payment integration
    if (paymentOption === "PAY_NOW") {
      try {
        if (!upiUtr || upiUtr.length !== 12 || !/^\d+$/.test(upiUtr)) {
          // Clean up pending booking
          await prisma.booking.delete({ where: { id: booking.id } });
          return NextResponse.json({ error: "Invalid UPI Reference/UTR Number. Must be a 12-digit number." }, { status: 400 });
        }

        const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.id.slice(0, 6).toUpperCase()}`;

        // Update booking with UTR code
        const updatedBooking = await prisma.booking.update({
          where: { id: booking.id },
          data: { 
            razorpayPaymentId: upiUtr,
            invoiceNumber
          },
        });

        // Create a pending payment log in the transactions database
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: amountInINR,
            status: "PENDING",
            razorpayPaymentId: upiUtr,
            invoiceNumber,
          },
        });

        return NextResponse.json({
          booking: updatedBooking,
          client: {
            name: client.name,
            email: client.email,
            phone: client.phone,
          },
        });
      } catch (paymentErr) {
        console.error("UPI Payment Save Failed:", paymentErr);
        // Clean up pending booking
        await prisma.booking.delete({ where: { id: booking.id } });
        return NextResponse.json({ error: "Failed to process payment details." }, { status: 500 });
      }
    }

    // Return invoice-ready details for Pay Later
    const invoiceNumber = `INV-${new Date().getFullYear()}-${booking.id.slice(0, 6).toUpperCase()}`;
    const confirmedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { invoiceNumber },
    });

    // TODO: Send notifications for Pay Later bookings (SMTP/SMS)

    return NextResponse.json({
      booking: confirmedBooking,
      client,
    });
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
