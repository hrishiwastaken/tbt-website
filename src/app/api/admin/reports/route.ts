import { prisma } from "@/lib/db";
import { handleApi, requireStaff } from "@/server/http";
import { minorToRupees } from "@/server/money";

// CSV export of booking + financial records.

export const GET = handleApi(async (request: Request) => {
  await requireStaff(request);

  const bookings = await prisma.booking.findMany({
    include: { therapist: true, client: true, service: true },
    orderBy: { dateTime: "desc" },
  });

  const headers = [
    "Invoice Number",
    "Date & Time",
    "Client Name",
    "Client Email",
    "Client Phone",
    "Consultant",
    "Service",
    "Duration (Mins)",
    "Gross Amount (INR)",
    "Discount (INR)",
    "Tax (INR)",
    "Commission %",
    "Status",
    "Payment Status",
    "Created At",
  ];

  const escape = (value: string) => value.replace(/"/g, '""');
  const rows = bookings.map((b) => [
    b.invoiceNumber || `REC-${b.id.slice(0, 8).toUpperCase()}`,
    b.dateTime.toISOString().replace("T", " ").slice(0, 19),
    escape(b.client.name),
    escape(b.client.email),
    escape(b.client.phone),
    escape(b.therapist.name),
    escape(b.service.name),
    String(b.durationMinutes),
    minorToRupees(b.amountMinor).toFixed(2),
    minorToRupees(b.discountMinor).toFixed(2),
    minorToRupees(b.taxMinor).toFixed(2),
    (b.commissionBps / 100).toFixed(2),
    b.status,
    b.paymentStatus,
    b.createdAt.toISOString().replace("T", " ").slice(0, 19),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n");

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        "attachment; filename=brain_tea_bookings_report.csv",
      Pragma: "no-cache",
      "Cache-Control": "no-store",
    },
  });
});
