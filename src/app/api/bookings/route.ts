import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimiter } from "@/lib/rateLimit";
import { createBooking } from "@/server/services/bookingService";
import { badRequest, clientIp, handleApi, parseBody } from "@/server/http";
import { publicBookingView } from "@/server/serializers/publicBooking";

const bookingSchema = z.object({
  therapistSlug: z.string().min(1),
  serviceSlug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  emergencyContact: z.string().min(3).max(200),
  gdprConsent: z.literal(true, {
    message: "Consent is mandatory to book a session",
  }),
  paymentOption: z.enum(["PAY_NOW", "PAY_LATER"]),
});

export const POST = handleApi(async (request: Request) => {
  const { isBlocked } = rateLimiter(clientIp(request), 5, 60000);
  if (isBlocked) {
    return NextResponse.json(
      {
        error: "Too many booking requests. Please wait a minute and try again.",
      },
      { status: 429 },
    );
  }

  const body = parseBody(bookingSchema, await request.json());

  const dateTime = new Date(`${body.date}T${body.time}:00`);
  if (isNaN(dateTime.getTime())) throw badRequest("Invalid date or time");

  const { booking, payment } = await createBooking({
    therapistSlug: body.therapistSlug,
    serviceSlug: body.serviceSlug,
    dateTime,
    client: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      dob: body.dob,
      emergencyContact: body.emergencyContact,
      gdprConsent: body.gdprConsent,
    },
    paymentOption: body.paymentOption,
  });

  return NextResponse.json({
    // Whitelisted view — never the raw row. Keeps commissionBps, the
    // encrypted notes blob and internal ids out of an anonymous response.
    booking: publicBookingView(booking),
    // PAY_NOW: the client must complete checkout at this URL; confirmation
    // arrives server-side (webhook / status poll), never from the client.
    payment,
    client: {
      name: booking.client.name,
      email: booking.client.email,
      phone: booking.client.phone,
    },
  });
});
