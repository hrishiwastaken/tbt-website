import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  try {
    // 1. Authenticate Admin session
    const session = await getSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "THERAPIST")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Fetch metrics
    const therapistCount = await prisma.therapist.count({ where: { isActive: true } });
    const clientCount = await prisma.client.count();
    
    // Revenue (Sum of PAID bookings)
    const paidBookings = await prisma.booking.findMany({
      where: { paymentStatus: "PAID" },
      select: { amount: true },
    });
    const totalRevenue = paidBookings.reduce((sum, b) => sum + b.amount, 0);

    // Bookings summary
    const totalBookings = await prisma.booking.count();
    const completedBookings = await prisma.booking.count({ where: { status: "COMPLETED" } });
    const pendingBookings = await prisma.booking.count({ where: { status: "PENDING" } });
    const confirmedBookings = await prisma.booking.count({ where: { status: "CONFIRMED" } });

    // Therapist specific distribution for stats
    const therapistsList = await prisma.therapist.findMany({
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    const therapistDistribution = therapistsList.map((t) => ({
      name: t.name,
      bookingsCount: t._count.bookings,
    }));

    return NextResponse.json({
      stats: {
        therapistsCount: therapistCount,
        clientsCount: clientCount,
        totalRevenue,
        bookingsCount: {
          total: totalBookings,
          completed: completedBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
        },
        therapistDistribution,
      },
    });
  } catch (error) {
    console.error("Admin stats GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
