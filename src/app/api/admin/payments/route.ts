import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { handleApi, paginated, parsePagination, requireStaff } from "@/server/http";
import { financialSummary } from "@/server/services/ledgerService";

// Transactions view: payment records with their booking context, plus the
// lifetime financial summary strip.

export const GET = handleApi(async (request: Request) => {
  await requireStaff(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  const where: Prisma.PaymentRecordWhereInput = {};
  const status = searchParams.get("status");
  if (status) where.status = status;
  const kind = searchParams.get("kind");
  if (kind && ["CHARGE", "REFUND"].includes(kind)) where.kind = kind;
  const q = searchParams.get("q")?.trim();
  if (q) {
    where.OR = [
      { providerPaymentId: { contains: q, mode: "insensitive" } },
      { providerRef: { contains: q, mode: "insensitive" } },
      { booking: { invoiceNumber: { contains: q, mode: "insensitive" } } },
      { booking: { client: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [payments, total, summary] = await Promise.all([
    prisma.paymentRecord.findMany({
      where,
      include: {
        booking: {
          include: {
            client: { select: { name: true, email: true } },
            service: { select: { name: true } },
            therapist: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.paymentRecord.count({ where }),
    financialSummary(),
  ]);

  return NextResponse.json({ ...paginated(payments, total, pagination), summary });
});
