import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  try {
    // 1. Authenticate Admin session
    const session = await getSession(request);
    if (!session || session.role !== "ADMIN") {
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

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Admin bookings GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
