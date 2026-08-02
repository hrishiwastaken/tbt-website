import { prisma } from "@/lib/db";
import { enforceRateLimit, handleApi, requireAdmin } from "@/server/http";
import { minorToRupees } from "@/server/money";
import { toCsv } from "@/server/validation";

// CSV export of booking + financial records.

export const GET = handleApi(async (request: Request) => {
  await requireAdmin(request);
  // Authenticated, but unpaginated — it reads every booking with three
  // relations joined. Bounded so a stuck tab or a compromised admin session
  // cannot repeatedly trigger a full-table export.
  enforceRateLimit(request, "reports", 10, 60000);

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

  // Values go through csvCell, which quotes AND defuses spreadsheet formula
  // injection. Client name/email/phone originate from the public booking
  // form, so a value like `=cmd|'/c calc'!A1` would otherwise execute when
  // staff open this export in Excel or Sheets.
  const rows = bookings.map((b) => [
    b.invoiceNumber || `REC-${b.id.slice(0, 8).toUpperCase()}`,
    b.dateTime.toISOString().replace("T", " ").slice(0, 19),
    b.client.name,
    b.client.email,
    b.client.phone,
    b.therapist.name,
    b.service.name,
    b.durationMinutes,
    minorToRupees(b.amountMinor).toFixed(2),
    minorToRupees(b.discountMinor).toFixed(2),
    minorToRupees(b.taxMinor).toFixed(2),
    (b.commissionBps / 100).toFixed(2),
    b.status,
    b.paymentStatus,
    b.createdAt.toISOString().replace("T", " ").slice(0, 19),
  ]);

  const csvContent = toCsv([headers, ...rows]);

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
