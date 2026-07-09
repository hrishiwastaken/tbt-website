import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET all clients
export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "THERAPIST")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Admin clients GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE client for GDPR/India IT Act data removal
export async function DELETE(request) {
  try {
    const session = await getSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "THERAPIST")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { clientId } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: "Missing Client ID" }, { status: 400 });
    }

    // Deletion cascade logic
    // 1. Delete associated payments
    await prisma.payment.deleteMany({
      where: {
        booking: {
          clientId: clientId,
        },
      },
    });

    // 2. Delete bookings
    await prisma.booking.deleteMany({
      where: {
        clientId: clientId,
      },
    });

    // 3. Delete client profile
    await prisma.client.delete({
      where: {
        id: clientId,
      },
    });

    console.log(`Admin ${session.email} successfully purged Client ${clientId} for compliance.`);
    return NextResponse.json({ message: "Client account and all associated booking/payment logs have been permanently erased for compliance." });
  } catch (error) {
    console.error("Admin client DELETE Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
