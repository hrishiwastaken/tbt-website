import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { phoneSchema } from "@/server/validation";
import { prisma } from "@/lib/db";
import {
  badRequest,
  clientIp,
  conflict,
  handleApi,
  notFound,
  parseBody,
  requireReception,
} from "@/server/http";
import { recordAudit } from "@/server/audit";

// Single client record with their appointment history — the view the desk
// opens when someone walks in or calls. Clinical notes are never included.

export const GET = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireReception(request);
    const { id } = await ctx.params;

    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        age: true,
        emergencyContact: true,
        gdprConsent: true,
        createdAt: true,
        updatedAt: true,
        bookings: {
          select: {
            id: true,
            dateTime: true,
            durationMinutes: true,
            amountMinor: true,
            status: true,
            paymentStatus: true,
            invoiceNumber: true,
            counselingType: true,
            therapist: { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
          },
          orderBy: { dateTime: "desc" },
          take: 50,
        },
      },
    });
    if (!client) throw notFound("Client not found");

    // Ledger-independent, booking-level totals: what this client has been
    // billed, what has settled, and what is still outstanding.
    const [paid, outstanding] = await Promise.all([
      prisma.paymentRecord.aggregate({
        _sum: { amountMinor: true },
        where: {
          kind: "CHARGE",
          status: "SUCCEEDED",
          booking: { is: { clientId: id } },
        },
      }),
      prisma.booking.aggregate({
        _sum: { amountMinor: true },
        _count: { _all: true },
        where: {
          clientId: id,
          paymentStatus: "UNPAID",
          status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] },
        },
      }),
    ]);

    return NextResponse.json({
      client,
      totals: {
        paidMinor: paid._sum.amountMinor ?? 0,
        outstandingMinor: outstanding._sum.amountMinor ?? 0,
        outstandingCount: outstanding._count._all,
      },
    });
  },
);

const updateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    age: z.coerce.number().int().min(1).max(120).optional(),
    emergencyContact: z.string().min(3).max(200).optional(),
    gdprConsent: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

export const PATCH = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const session = await requireReception(request);
    const { id } = await ctx.params;
    const body = parseBody(updateSchema, await request.json());

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) throw notFound("Client not found");

    const data: Prisma.ClientUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email.toLowerCase();
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.age !== undefined) data.age = body.age;
    if (body.emergencyContact !== undefined) {
      data.emergencyContact = body.emergencyContact;
    }
    if (body.gdprConsent !== undefined) data.gdprConsent = body.gdprConsent;

    if (typeof data.email === "string" && data.email !== existing.email) {
      const clash = await prisma.client.findUnique({
        where: { email: data.email },
      });
      if (clash) {
        throw conflict(
          "Another client is already registered with that email address",
          "CLIENT_EXISTS",
        );
      }
    }

    try {
      const client = await prisma.$transaction(async (tx) => {
        const updated = await tx.client.update({ where: { id }, data });
        await recordAudit(
          {
            session,
            action: "client.update",
            entityType: "Client",
            entityId: id,
            detail: { fields: Object.keys(data) },
            ip: clientIp(request),
          },
          tx,
        );
        return updated;
      });
      return NextResponse.json({ client });
    } catch (err) {
      // Lost a race against a concurrent registration of the same email.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw conflict(
          "Another client is already registered with that email address",
          "CLIENT_EXISTS",
        );
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        throw badRequest("Client no longer exists");
      }
      throw err;
    }
  },
);
