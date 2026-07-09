import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { decryptText } from "@/lib/encryption";

export async function GET(request) {
  try {
    // 1. Authenticate session
    const session = await getSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "THERAPIST")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Fetch bookings
    const bookings = await prisma.booking.findMany({
      include: {
        therapist: true,
        client: true,
        service: true,
      },
      orderBy: { dateTime: "desc" },
    });

    // 3. Decrypt clinical notes securely
    const decryptedBookings = bookings.map((booking) => ({
      ...booking,
      notes: booking.notes ? decryptText(booking.notes) : "",
    }));

    return NextResponse.json({ bookings: decryptedBookings });
  } catch (error) {
    console.error("Admin bookings GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
