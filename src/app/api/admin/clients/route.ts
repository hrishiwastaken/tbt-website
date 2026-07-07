import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  badRequest,
  clientIp,
  handleApi,
  paginated,
  parseBody,
  parsePagination,
  requireAdmin,
  requireStaff,
} from "@/server/http";
import { recordAudit } from "@/server/audit";

export const GET = handleApi(async (request: Request) => {
  await requireStaff(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams, 25);

  const where: Prisma.ClientWhereInput = {};
  const q = searchParams.get("q")?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: { _count: { select: { bookings: true } } },
      orderBy: { name: "asc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json(paginated(clients, total, pagination));
});

const deleteSchema = z.object({ clientId: z.string().min(1) });

// GDPR/IT-Act erasure: removes the client and their bookings. Financial
// ledger entries survive (bookingId set to null by the FK) so the books
// still balance after erasure.
export const DELETE = handleApi(async (request: Request) => {
  const session = await requireAdmin(request);
  const { clientId } = parseBody(deleteSchema, await request.json());

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw badRequest("Client not found");

  await prisma.$transaction(async (tx) => {
    await tx.booking.deleteMany({ where: { clientId } });
    await tx.client.delete({ where: { id: clientId } });
    await recordAudit(
      {
        session,
        action: "client.gdpr_erasure",
        entityType: "Client",
        entityId: clientId,
        ip: clientIp(request),
      },
      tx
    );
  });

  return NextResponse.json({
    message: "Client account and all associated booking records have been permanently erased for compliance.",
  });
});
