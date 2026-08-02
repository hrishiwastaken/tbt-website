import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi, notFound, parseBody, requireAdmin } from "@/server/http";
import { consultantBalance } from "@/server/services/ledgerService";
import {
  getDefaultCommissionBps,
  setTherapistCommission,
} from "@/server/services/commissionService";
import { rupeesToMinor } from "@/server/money";
import { recordAudit } from "@/server/audit";
import { httpUrl } from "@/server/validation";

// Consultant detail: profile, schedule, earnings breakdown (from the
// ledger), payout history and recent appointments.

export const GET = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAdmin(request);
    const { id } = await ctx.params;

    const therapist = await prisma.therapist.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        availability: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        services: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!therapist) throw notFound("Consultant not found");

    const [
      balance,
      defaultBps,
      payouts,
      recentBookings,
      earningsEntries,
      commissionHistory,
      allServices,
    ] = await Promise.all([
      consultantBalance(id),
      getDefaultCommissionBps(),
      prisma.payout.findMany({
        where: { therapistId: id },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.booking.findMany({
        where: { therapistId: id },
        include: {
          client: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { dateTime: "desc" },
        take: 25,
      }),
      prisma.ledgerEntry.findMany({
        where: {
          therapistId: id,
          entryType: {
            in: ["COMMISSION_ACCRUED", "COMMISSION_REVERSED", "PAYOUT_PAID"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.commissionSetting.findMany({
        where: { scope: "THERAPIST", therapistId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.service.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      consultant: {
        ...therapist,
        email: therapist.user?.email ?? null,
        user: undefined,
        effectiveCommissionBps: therapist.commissionBps ?? defaultBps,
      },
      balance,
      payouts,
      recentBookings,
      earningsEntries,
      commissionHistory,
      defaultCommissionBps: defaultBps,
      allServices,
    });
  },
);

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  bio: z.string().min(1).max(5000).optional(),
  photo: httpUrl.nullable().optional(),
  feeRupees: z.number().positive().optional(),
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
  // null clears the override back to the platform default
  commissionBps: z.number().int().min(0).max(10000).nullable().optional(),
  // Full replacement set of the services this consultant offers.
  serviceIds: z.array(z.string().min(1)).optional(),
  availability: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .optional(),
});

export const PATCH = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireAdmin(request);
    const { id } = await ctx.params;
    const body = parseBody(patchSchema, await request.json());

    const therapist = await prisma.therapist.findUnique({ where: { id } });
    if (!therapist) throw notFound("Consultant not found");

    // Commission changes run through the journalled commission service.
    if (body.commissionBps !== undefined) {
      await setTherapistCommission(id, body.commissionBps, session);
    }

    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.bio !== undefined) data.bio = body.bio;
      if (body.photo !== undefined) data.photo = body.photo;
      if (body.feeRupees !== undefined)
        data.feeMinor = rupeesToMinor(body.feeRupees);
      if (body.status !== undefined) {
        data.status = body.status;
        data.isActive = body.status === "APPROVED";
      }
      if (body.serviceIds !== undefined) {
        data.services = { set: body.serviceIds.map((sid) => ({ id: sid })) };
      }
      if (Object.keys(data).length > 0) {
        await tx.therapist.update({ where: { id }, data });
      }

      if (body.availability) {
        await tx.therapistAvailability.deleteMany({
          where: { therapistId: id },
        });
        if (body.availability.length > 0) {
          await tx.therapistAvailability.createMany({
            data: body.availability.map((slot) => ({
              therapistId: id,
              ...slot,
            })),
          });
        }
      }

      await recordAudit(
        {
          session,
          action: "consultant.update",
          entityType: "Therapist",
          entityId: id,
          detail: { changed: Object.keys(body) },
        },
        tx,
      );
    });

    const updated = await prisma.therapist.findUnique({
      where: { id },
      include: {
        availability: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      },
    });
    return NextResponse.json({ consultant: updated });
  },
);
