import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import {
  handleApi,
  badRequest,
  parseBody,
  requireAdmin,
  requireStaff,
} from "@/server/http";
import { consultantBalances } from "@/server/services/ledgerService";
import { getDefaultCommissionBps } from "@/server/services/commissionService";
import { isValidCommissionBps } from "@/server/domain/commission";
import { rupeesToMinor } from "@/server/money";
import { recordAudit } from "@/server/audit";

// Consultant roster with live financial balances derived from the ledger.

export const GET = handleApi(async (request: Request) => {
  await requireStaff(request);

  const [therapists, balances, defaultBps, bookingCounts] = await Promise.all([
    prisma.therapist.findMany({
      include: {
        user: { select: { email: true } },
        services: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    consultantBalances(),
    getDefaultCommissionBps(),
    prisma.booking.groupBy({ by: ["therapistId"], _count: { _all: true } }),
  ]);

  const balanceMap = new Map(balances.map((b) => [b.therapistId, b]));
  const countMap = new Map(
    bookingCounts.map((c) => [c.therapistId, c._count._all]),
  );

  return NextResponse.json({
    defaultCommissionBps: defaultBps,
    consultants: therapists.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      photo: t.photo,
      email: t.user?.email ?? null,
      status: t.status,
      isActive: t.isActive,
      feeMinor: t.feeMinor,
      commissionBps: t.commissionBps,
      effectiveCommissionBps: t.commissionBps ?? defaultBps,
      services: t.services,
      totalBookings: countMap.get(t.id) ?? 0,
      earnedMinor: balanceMap.get(t.id)?.earnedMinor ?? 0,
      paidMinor: balanceMap.get(t.id)?.paidMinor ?? 0,
      payableMinor: balanceMap.get(t.id)?.payableMinor ?? 0,
      reservedMinor: balanceMap.get(t.id)?.reservedMinor ?? 0,
      createdAt: t.createdAt,
    })),
  });
});

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only"),
  bio: z.string().min(1).max(5000),
  photo: z.string().url().optional(),
  feeRupees: z.number().positive(),
  commissionBps: z.number().int().nullable().optional(),
  email: z.string().email().optional(),
  password: z.string().min(10).max(100).optional(),
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).default("PENDING"),
  serviceIds: z.array(z.string().min(1)).optional(),
});

export const POST = handleApi(async (request: Request) => {
  const session = await requireAdmin(request);
  const body = parseBody(createSchema, await request.json());

  if (body.commissionBps != null && !isValidCommissionBps(body.commissionBps)) {
    throw badRequest("Commission must be between 0 and 10000 bps");
  }
  if (body.email && !body.password) {
    throw badRequest(
      "A password is required when creating a login for the consultant",
    );
  }

  const therapist = await prisma.$transaction(async (tx) => {
    let userId: string | null = null;
    if (body.email && body.password) {
      const user = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash: await hashPassword(body.password),
          role: "THERAPIST",
        },
      });
      userId = user.id;
    }
    const created = await tx.therapist.create({
      data: {
        userId,
        name: body.name,
        slug: body.slug,
        bio: body.bio,
        photo: body.photo ?? null,
        feeMinor: rupeesToMinor(body.feeRupees),
        commissionBps: body.commissionBps ?? null,
        status: body.status,
        isActive: body.status === "APPROVED",
        ...(body.serviceIds && body.serviceIds.length > 0
          ? { services: { connect: body.serviceIds.map((sid) => ({ id: sid })) } }
          : {}),
      },
    });
    if (body.commissionBps != null) {
      await tx.commissionSetting.create({
        data: {
          scope: "THERAPIST",
          therapistId: created.id,
          commissionBps: body.commissionBps,
          createdById: session.userId,
        },
      });
    }
    await recordAudit(
      {
        session,
        action: "consultant.create",
        entityType: "Therapist",
        entityId: created.id,
        detail: { name: body.name, status: body.status },
      },
      tx,
    );
    return created;
  });

  return NextResponse.json({ consultant: therapist }, { status: 201 });
});
