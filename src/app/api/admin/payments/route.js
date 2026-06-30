import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            client: true,
            service: true,
            therapist: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Admin payments GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
