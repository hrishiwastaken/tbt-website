import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  try {
    // 1. Authenticate Admin session
    const session = await getSession(request);
    if (!session || (session.role !== "ADMIN" && session.role !== "THERAPIST")) {
      return new Response("Unauthorized access", { status: 401 });
    }

    // 2. Fetch booking records
    const bookings = await prisma.booking.findMany({
      include: {
        therapist: true,
        client: true,
        service: true,
      },
      orderBy: { dateTime: "desc" },
    });

    // 3. Build CSV headers and rows
    const headers = [
      "Invoice Number",
      "Date & Time",
      "Client Name",
      "Client Email",
      "Client Phone",
      "Therapist",
      "Service",
      "Duration (Mins)",
      "Amount (INR)",
      "Status",
      "Payment Status",
      "Created At",
    ];

    const rows = bookings.map((b) => {
      const formattedDate = new Date(b.dateTime).toISOString().replace("T", " ").slice(0, 19);
      const createdAtDate = new Date(b.createdAt).toISOString().replace("T", " ").slice(0, 19);
      
      // Escape values containing quotes
      return [
        b.invoiceNumber || `REC-${b.id.slice(0, 8).toUpperCase()}`,
        formattedDate,
        b.client.name.replace(/"/g, '""'),
        b.client.email.replace(/"/g, '""'),
        b.client.phone.replace(/"/g, '""'),
        b.therapist.name.replace(/"/g, '""'),
        b.service.name.replace(/"/g, '""'),
        b.durationMinutes,
        b.amount,
        b.status,
        b.paymentStatus,
        createdAtDate,
      ];
    });

    // Merge into CSV string
    const csvContent =
      [headers, ...rows]
        .map((row) => row.map((val) => `"${val}"`).join(","))
        .join("\n");

    // 4. Return as downloadable attachment
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=solis_psychology_report.csv",
        "Pragma": "no-cache",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Report Export GET Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
