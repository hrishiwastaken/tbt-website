import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { decryptText } from "@/lib/encryption";

export async function GET(request) {
  try {
    // 1. Authenticate session
    const session = await getSession(request);
    if (!session || session.role !== "THERAPIST") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Fetch therapist profile linked to this user
    const therapist = await prisma.therapist.findUnique({
      where: { userId: session.userId },
    });

    if (!therapist) {
      return NextResponse.json({ error: "Therapist profile not found" }, { status: 404 });
    }

    // 3. Query bookings
    const bookings = await prisma.booking.findMany({
      where: { therapistId: therapist.id },
      include: {
        client: true,
        service: true,
      },
      orderBy: { dateTime: "desc" },
    });

    // 4. Decrypt sensitive notes before sending
    const decryptedBookings = bookings.map((booking) => ({
      ...booking,
      notes: booking.notes ? decryptText(booking.notes) : "",
    }));

    return NextResponse.json({ bookings: decryptedBookings, therapist });
  } catch (error) {
    console.error("Therapist bookings GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
