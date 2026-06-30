import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { encryptText } from "@/lib/encryption";

export async function PUT(request, { params }) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    const { status, notes } = body;

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

    // 3. Find booking and verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.therapistId !== therapist.id) {
      return NextResponse.json({ error: "Unauthorized modification" }, { status: 403 });
    }

    // 4. Update data structure
    const updateData = {};
    
    if (status) {
      const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid booking status" }, { status: 400 });
      }
      updateData.status = status;
      
      // Auto-update paymentStatus to PAID if marked completed and was pending
      if (status === "COMPLETED" && booking.paymentStatus === "PENDING") {
        updateData.paymentStatus = "PAID";
        
        // Ensure invoice is generated if completed
        if (!booking.invoiceNumber) {
          updateData.invoiceNumber = `INV-${new Date().getFullYear()}-${booking.id.slice(0, 6).toUpperCase()}`;
        }
      }
    }

    if (notes !== undefined) {
      // Encrypt notes before writing to database
      updateData.notes = notes ? encryptText(notes) : null;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    return NextResponse.json({
      message: "Session updated successfully.",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Booking PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
