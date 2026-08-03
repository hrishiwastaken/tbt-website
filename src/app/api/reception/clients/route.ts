import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { phoneSchema } from "@/server/validation";
import { prisma } from "@/lib/db";
import {
  clientIp,
  conflict,
  handleApi,
  paginated,
  parseBody,
  parsePagination,
  requireReception,
} from "@/server/http";
import { recordAudit } from "@/server/audit";

// Client registry for the front desk: search, register, and (via
// clients/[id]) correct contact details.
//
// Erasure is NOT here — a GDPR/IT-Act deletion destroys booking history and
// stays an admin action (/api/admin/clients).

export const GET = handleApi(async (request: Request) => {
  await requireReception(request);
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

  const sort = searchParams.get("sort") === "recent" ? "createdAt" : "name";
  const order = sort === "createdAt" ? "desc" : "asc";

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        age: true,
        emergencyContact: true,
        gdprConsent: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { [sort]: order },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.client.count({ where }),
  ]);

  return NextResponse.json(paginated(clients, total, pagination));
});

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: phoneSchema,
  age: z.coerce.number().int().min(1).max(120),
  emergencyContact: z.string().min(3).max(200),
  gdprConsent: z.boolean().default(true),
});

export const POST = handleApi(async (request: Request) => {
  const session = await requireReception(request);
  const body = parseBody(createSchema, await request.json());
  const email = body.email.toLowerCase();

  // Client.email is unique — surface a duplicate as a 409 the desk can act
  // on ("this person is already registered") rather than a 500.
  const existing = await prisma.client.findUnique({ where: { email } });
  if (existing) {
    throw conflict(
      `${existing.name} is already registered with this email address`,
      "CLIENT_EXISTS",
    );
  }

  const client = await prisma.$transaction(async (tx) => {
    const created = await tx.client.create({
      data: {
        name: body.name,
        email,
        phone: body.phone,
        age: body.age,
        emergencyContact: body.emergencyContact,
        gdprConsent: body.gdprConsent,
      },
    });
    await recordAudit(
      {
        session,
        action: "client.create",
        entityType: "Client",
        entityId: created.id,
        detail: { name: created.name, email: created.email },
        ip: clientIp(request),
      },
      tx,
    );
    return created;
  });

  return NextResponse.json({ client }, { status: 201 });
});
