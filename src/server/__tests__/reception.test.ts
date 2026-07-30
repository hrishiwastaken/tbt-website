import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import {
  GET as bookingsGet,
  POST as bookingsPost,
} from "@/app/api/reception/bookings/route";
import {
  GET as bookingGet,
  PATCH as bookingPatch,
} from "@/app/api/reception/bookings/[id]/route";
import { GET as dashboardGet } from "@/app/api/reception/dashboard/route";
import {
  GET as clientsGet,
  POST as clientsPost,
} from "@/app/api/reception/clients/route";
import {
  GET as clientGet,
  PATCH as clientPatch,
} from "@/app/api/reception/clients/[id]/route";
import { GET as paymentsGet } from "@/app/api/reception/payments/route";
import { GET as consultantsGet } from "@/app/api/reception/consultants/route";

// End-to-end tests of the reception desk through its real route handlers:
// RBAC, zod validation, the SQL each endpoint issues, and the ledger effects
// of desk-collected payments. Requires DATABASE_URL (skipped otherwise).

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

const STAMP = Date.now();
const SLUG = `reception-consultant-${STAMP}`;
const FEE_MINOR = 120000; // ₹1,200

let therapistId: string;
let receptionCookie: string;
let therapistCookie: string;

/** A weekday slot in the future, aligned to the availability template below. */
function futureSlot(daysAhead: number, hour = 11): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function req(
  url: string,
  {
    method = "GET",
    body,
    cookie = receptionCookie,
  }: { method?: string; body?: unknown; cookie?: string | null } = {},
): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function json(res: Response | { json(): Promise<unknown> }) {
  return (await res.json()) as Record<string, never>;
}

suite("reception desk", () => {
  beforeAll(async () => {
    const receptionist = await prisma.user.create({
      data: {
        email: `reception.${STAMP}@test.local`,
        passwordHash: "x",
        role: "RECEPTIONIST",
      },
    });
    receptionCookie = `auth_token=${signToken({
      userId: receptionist.id,
      email: receptionist.email,
      role: "RECEPTIONIST",
    })}`;

    const consultantUser = await prisma.user.create({
      data: {
        email: `consultant.${STAMP}@test.local`,
        passwordHash: "x",
        role: "THERAPIST",
      },
    });
    therapistCookie = `auth_token=${signToken({
      userId: consultantUser.id,
      email: consultantUser.email,
      role: "THERAPIST",
    })}`;

    const therapist = await prisma.therapist.create({
      data: {
        userId: consultantUser.id,
        name: "Reception Test Consultant",
        slug: SLUG,
        bio: "test",
        feeMinor: FEE_MINOR,
        status: "APPROVED",
        commissionBps: 3000,
      },
    });
    therapistId = therapist.id;
    await prisma.therapistAvailability.createMany({
      data: [1, 2, 3, 4, 5].flatMap((day) =>
        [9, 10, 11, 12, 13, 14, 15, 16].map((h) => ({
          therapistId: therapist.id,
          dayOfWeek: day,
          startTime: `${String(h).padStart(2, "0")}:00`,
          endTime: `${String(h + 1).padStart(2, "0")}:00`,
        })),
      ),
    });
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { therapistId } });
    await prisma.booking.deleteMany({ where: { therapistId } });
    await prisma.therapist.delete({ where: { id: therapistId } });
    await prisma.service.deleteMany({
      where: {
        slug: { in: ["individual-counselling", "couple-family-counselling"] },
        bookings: { none: {} },
      },
    });
    await prisma.client.deleteMany({
      where: { email: { contains: `${STAMP}` } },
    });
    await prisma.auditLog.deleteMany({
      where: { actorEmail: { contains: `${STAMP}` } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: `${STAMP}` } },
    });
    await prisma.$disconnect();
  });

  /** Schedule an appointment through the reception endpoint. */
  async function schedule(
    slot: Date,
    { paymentReceived = false, clientId }: {
      paymentReceived?: boolean;
      clientId?: string;
    } = {},
  ) {
    const res = await bookingsPost(
      req("/api/reception/bookings", {
        method: "POST",
        body: {
          therapistId,
          counselingType: "INDIVIDUAL",
          date: ymd(slot),
          time: hm(slot),
          feeRupees: FEE_MINOR / 100,
          paymentReceived,
          ...(paymentReceived ? { paymentRef: `UTR${STAMP}` } : {}),
          ...(clientId
            ? { clientId }
            : {
                newClient: {
                  name: `Desk Client ${slot.getTime()}`,
                  email: `desk.${STAMP}.${slot.getTime()}@test.local`,
                  phone: "+919812345678",
                  dob: "1992-05-04",
                  emergencyContact: "Next of kin (+919812345679)",
                },
              }),
        },
      }),
    );
    return { status: res.status, body: await json(res) };
  }

  // ── Access control ──────────────────────────────────────────────────────

  it("refuses anonymous and consultant sessions", async () => {
    const anon = await bookingsGet(
      req("/api/reception/bookings", { cookie: null }),
    );
    expect(anon.status).toBe(401);

    const consultant = await bookingsGet(
      req("/api/reception/bookings", { cookie: therapistCookie }),
    );
    expect(consultant.status).toBe(403);

    const anonDash = await dashboardGet(
      req("/api/reception/dashboard", { cookie: null }),
    );
    expect(anonDash.status).toBe(401);
  });

  // ── Scheduling + prepaid ledger ─────────────────────────────────────────

  it("schedules a prepaid appointment: confirmed, invoiced and fully ledgered", async () => {
    const slot = futureSlot(5, 9);
    const { status, body } = await schedule(slot, { paymentReceived: true });
    expect(status).toBe(201);

    const bookingId = (body as unknown as { booking: { id: string } }).booking
      .id;
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.paymentStatus).toBe("PAID");
    expect(booking.invoiceNumber).toBeTruthy();
    expect(booking.amountMinor).toBe(FEE_MINOR);
    // Commission is snapshotted from the consultant's override, not recomputed
    expect(booking.commissionBps).toBe(3000);

    // The desk is recorded as the actor, not "ADMIN".
    const history = await prisma.bookingStatusHistory.findFirst({
      where: { bookingId, toStatus: "CONFIRMED" },
      orderBy: { createdAt: "asc" },
    });
    expect(history?.actorType).toBe("RECEPTIONIST");

    // Full revenue split posted through the normal payment path.
    const entries = await prisma.ledgerEntry.findMany({ where: { bookingId } });
    const byType = new Map(entries.map((e) => [e.entryType, e.amountMinor]));
    expect(byType.get("GROSS_REVENUE")).toBe(FEE_MINOR);
    expect(byType.get("COMMISSION_ACCRUED")).toBe(
      Math.round((FEE_MINOR * 3000) / 10000),
    );
    expect(byType.get("PLATFORM_REVENUE")).toBe(
      FEE_MINOR - Math.round((FEE_MINOR * 3000) / 10000),
    );

    // The payment landed against the manual provider with the desk's ref.
    const charge = await prisma.paymentRecord.findFirstOrThrow({
      where: { bookingId, kind: "CHARGE" },
    });
    expect(charge.provider).toBe("manual");
    expect(charge.status).toBe("SUCCEEDED");
    expect(charge.providerRef).toBe(`UTR${STAMP}`);
  });

  it("refuses to double-book the consultant's slot", async () => {
    const slot = futureSlot(6, 10);
    expect((await schedule(slot)).status).toBe(201);
    const second = await schedule(slot);
    expect(second.status).toBe(409);
  });

  // ── Desk payment collection ─────────────────────────────────────────────

  it("records a desk payment exactly once and refuses a second collection", async () => {
    const slot = futureSlot(7, 12);
    const created = await schedule(slot);
    const bookingId = (created.body as unknown as { booking: { id: string } })
      .booking.id;

    const before = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(before.paymentStatus).toBe("UNPAID");

    const paid = await bookingPatch(
      req(`/api/reception/bookings/${bookingId}`, {
        method: "PATCH",
        body: { action: "record-payment", reference: "402311223344" },
      }),
      params(bookingId),
    );
    expect(paid.status).toBe(200);

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(after.paymentStatus).toBe("PAID");
    expect(after.invoiceNumber).toBeTruthy();

    const gross = await prisma.ledgerEntry.count({
      where: { bookingId, entryType: "GROSS_REVENUE" },
    });
    expect(gross).toBe(1);

    // Collecting again is a conflict, and posts nothing further.
    const again = await bookingPatch(
      req(`/api/reception/bookings/${bookingId}`, {
        method: "PATCH",
        body: { action: "record-payment" },
      }),
      params(bookingId),
    );
    expect(again.status).toBe(409);
    expect(
      await prisma.ledgerEntry.count({
        where: { bookingId, entryType: "GROSS_REVENUE" },
      }),
    ).toBe(1);

    // ...and it surfaces in the desk's payment record with its reference.
    const payments = await paymentsGet(
      req("/api/reception/payments?kind=CHARGE&q=402311223344"),
    );
    const payload = (await json(payments)) as unknown as {
      items: { providerRef: string | null; booking: { id: string } }[];
      summary: { collectedMinor: number; outstandingMinor: number };
    };
    expect(payments.status).toBe(200);
    expect(payload.items.some((p) => p.booking.id === bookingId)).toBe(true);
    expect(payload.summary.collectedMinor).toBeGreaterThan(0);
  });

  // ── Lifecycle + permission boundary ─────────────────────────────────────

  it("confirms, completes, and refuses transitions reserved for admins", async () => {
    const slot = futureSlot(8, 13);
    const created = await schedule(slot);
    const bookingId = (created.body as unknown as { booking: { id: string } })
      .booking.id;

    // CONFIRMED → REFUND_PENDING is allowed: the desk may *raise* a refund.
    const raise = await bookingPatch(
      req(`/api/reception/bookings/${bookingId}`, {
        method: "PATCH",
        body: {
          action: "transition",
          toStatus: "REFUND_PENDING",
          reason: "Client requested a refund",
        },
      }),
      params(bookingId),
    );
    expect(raise.status).toBe(200);

    // Settling or rejecting it is not.
    for (const toStatus of ["REFUNDED", "CONFIRMED"]) {
      const denied = await bookingPatch(
        req(`/api/reception/bookings/${bookingId}`, {
          method: "PATCH",
          body: { action: "transition", toStatus, reason: "nope" },
        }),
        params(bookingId),
      );
      expect(denied.status).toBe(403);
    }
    // The booking is untouched by the denied attempts.
    const still = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(still.status).toBe("REFUND_PENDING");

    // Rescheduling a refund-pending booking is refused too.
    const reschedule = await bookingPatch(
      req(`/api/reception/bookings/${bookingId}`, {
        method: "PATCH",
        body: { action: "reschedule", dateTime: futureSlot(9).toISOString() },
      }),
      params(bookingId),
    );
    expect(reschedule.status).toBe(403);
  });

  it("reschedules a live booking onto a free slot and blocks an occupied one", async () => {
    const slot = futureSlot(12, 9);
    const created = await schedule(slot);
    const bookingId = (created.body as unknown as { booking: { id: string } })
      .booking.id;

    const target = futureSlot(12, 14);
    const moved = await bookingPatch(
      req(`/api/reception/bookings/${bookingId}`, {
        method: "PATCH",
        body: { action: "reschedule", dateTime: target.toISOString() },
      }),
      params(bookingId),
    );
    expect(moved.status).toBe(200);
    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });
    expect(after.dateTime.getTime()).toBe(target.getTime());

    // A second booking cannot be moved onto the now-occupied slot.
    const other = await schedule(futureSlot(12, 15));
    const otherId = (other.body as unknown as { booking: { id: string } })
      .booking.id;
    const clash = await bookingPatch(
      req(`/api/reception/bookings/${otherId}`, {
        method: "PATCH",
        body: { action: "reschedule", dateTime: target.toISOString() },
      }),
      params(otherId),
    );
    expect(clash.status).toBe(409);
  });

  it("never exposes clinical notes through the desk", async () => {
    const slot = futureSlot(13, 16);
    const created = await schedule(slot);
    const bookingId = (created.body as unknown as { booking: { id: string } })
      .booking.id;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { notes: "encrypted-clinical-note" },
    });

    const res = await bookingGet(
      req(`/api/reception/bookings/${bookingId}`),
      params(bookingId),
    );
    const body = (await json(res)) as unknown as {
      booking: Record<string, unknown>;
    };
    expect(res.status).toBe(200);
    expect(body.booking).not.toHaveProperty("notes");
    expect(JSON.stringify(body)).not.toContain("encrypted-clinical-note");
  });

  // ── Queues and dashboard ────────────────────────────────────────────────

  it("filters the register by desk queue", async () => {
    const unpaid = await bookingsGet(
      req("/api/reception/bookings?queue=unpaid&pageSize=100"),
    );
    const unpaidBody = (await json(unpaid)) as unknown as {
      items: { paymentStatus: string; status: string }[];
      total: number;
    };
    expect(unpaid.status).toBe(200);
    expect(unpaidBody.total).toBeGreaterThan(0);
    for (const row of unpaidBody.items) {
      expect(row.paymentStatus).toBe("UNPAID");
      expect(["CONFIRMED", "COMPLETED", "NO_SHOW"]).toContain(row.status);
    }

    const upcoming = await bookingsGet(
      req("/api/reception/bookings?queue=upcoming&pageSize=100"),
    );
    const upcomingBody = (await json(upcoming)) as unknown as {
      items: { dateTime: string; status: string }[];
    };
    for (const row of upcomingBody.items) {
      expect(["CANCELLED", "REFUNDED"]).not.toContain(row.status);
      expect(new Date(row.dateTime).getTime()).toBeGreaterThanOrEqual(
        Date.now() - 1000,
      );
    }

    // Filters compose: queue + consultant + search all narrow the same query.
    const scoped = await bookingsGet(
      req(
        `/api/reception/bookings?queue=upcoming&therapistId=${therapistId}&q=Desk%20Client`,
      ),
    );
    const scopedBody = (await json(scoped)) as unknown as {
      items: { therapist: { id: string } }[];
    };
    expect(scoped.status).toBe(200);
    for (const row of scopedBody.items) {
      expect(row.therapist.id).toBe(therapistId);
    }
  });

  it("reports a coherent front-desk dashboard", async () => {
    const res = await dashboardGet(req("/api/reception/dashboard"));
    const body = (await json(res)) as unknown as {
      kpis: Record<string, number>;
      todaySchedule: unknown[];
      needsAttention: unknown[];
    };
    expect(res.status).toBe(200);
    expect(body.kpis.unpaidOutstanding).toBeGreaterThan(0);
    expect(body.kpis.outstandingMinor).toBeGreaterThanOrEqual(FEE_MINOR);
    expect(body.kpis.upcomingWeek).toBeGreaterThanOrEqual(0);
    expect(body.kpis.totalClients).toBeGreaterThan(0);
    expect(Array.isArray(body.todaySchedule)).toBe(true);
    expect(Array.isArray(body.needsAttention)).toBe(true);
    // No margin data leaks into the desk payload.
    expect(JSON.stringify(body)).not.toContain("commission");
    expect(JSON.stringify(body)).not.toContain("platformRevenue");
  });

  it("lists bookable consultants without financial internals", async () => {
    const res = await consultantsGet(req("/api/reception/consultants"));
    const body = (await json(res)) as unknown as {
      consultants: Record<string, unknown>[];
    };
    expect(res.status).toBe(200);
    const mine = body.consultants.find((c) => c.id === therapistId);
    expect(mine).toBeTruthy();
    expect(mine).not.toHaveProperty("commissionBps");
    expect(mine).not.toHaveProperty("earnedMinor");
  });

  // ── Client records ──────────────────────────────────────────────────────

  it("registers, searches and corrects client records", async () => {
    const email = `walkin.${STAMP}@test.local`;
    const created = await clientsPost(
      req("/api/reception/clients", {
        method: "POST",
        body: {
          name: "Walk In Client",
          email,
          phone: "+919800000001",
          dob: "1988-03-12",
          emergencyContact: "Sibling (+919800000002)",
        },
      }),
    );
    expect(created.status).toBe(201);
    const clientId = (
      (await json(created)) as unknown as { client: { id: string } }
    ).client.id;

    // Duplicate email is a 409, not a 500.
    const dupe = await clientsPost(
      req("/api/reception/clients", {
        method: "POST",
        body: {
          name: "Walk In Again",
          email: email.toUpperCase(),
          phone: "+919800000003",
          dob: "1988-03-12",
          emergencyContact: "Sibling (+919800000002)",
        },
      }),
    );
    expect(dupe.status).toBe(409);

    // Search finds them.
    const found = await clientsGet(
      req(`/api/reception/clients?q=${encodeURIComponent(email)}`),
    );
    const foundBody = (await json(found)) as unknown as {
      items: { id: string }[];
      total: number;
    };
    expect(foundBody.total).toBe(1);
    expect(foundBody.items[0].id).toBe(clientId);

    // Corrections stick and are audited.
    const patched = await clientPatch(
      req(`/api/reception/clients/${clientId}`, {
        method: "PATCH",
        body: { phone: "+919800000099", name: "Walk In Client Jr" },
      }),
      params(clientId),
    );
    expect(patched.status).toBe(200);
    const stored = await prisma.client.findUniqueOrThrow({
      where: { id: clientId },
    });
    expect(stored.phone).toBe("+919800000099");
    expect(stored.name).toBe("Walk In Client Jr");
    expect(
      await prisma.auditLog.count({
        where: { entityId: clientId, action: "client.update" },
      }),
    ).toBe(1);

    // Rejects an empty patch and an email already taken by someone else.
    const empty = await clientPatch(
      req(`/api/reception/clients/${clientId}`, {
        method: "PATCH",
        body: {},
      }),
      params(clientId),
    );
    expect(empty.status).toBe(400);

    const otherEmail = `walkin.other.${STAMP}@test.local`;
    await clientsPost(
      req("/api/reception/clients", {
        method: "POST",
        body: {
          name: "Other Client",
          email: otherEmail,
          phone: "+919800000004",
          dob: "1990-01-01",
          emergencyContact: "Parent (+919800000005)",
        },
      }),
    );
    const clash = await clientPatch(
      req(`/api/reception/clients/${clientId}`, {
        method: "PATCH",
        body: { email: otherEmail },
      }),
      params(clientId),
    );
    expect(clash.status).toBe(409);
  });

  it("shows a client's history and account balance", async () => {
    const slot = futureSlot(14, 10);
    const created = await schedule(slot);
    const bookingId = (created.body as unknown as { booking: { id: string } })
      .booking.id;
    const { clientId } = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      select: { clientId: true },
    });

    const res = await clientGet(
      req(`/api/reception/clients/${clientId}`),
      params(clientId),
    );
    const body = (await json(res)) as unknown as {
      client: { bookings: { id: string }[] };
      totals: {
        paidMinor: number;
        outstandingMinor: number;
        outstandingCount: number;
      };
    };
    expect(res.status).toBe(200);
    expect(body.client.bookings.some((b) => b.id === bookingId)).toBe(true);
    expect(body.totals.outstandingMinor).toBe(FEE_MINOR);
    expect(body.totals.outstandingCount).toBe(1);
    expect(body.totals.paidMinor).toBe(0);

    // Collect at the desk, and the balance moves.
    await bookingPatch(
      req(`/api/reception/bookings/${bookingId}`, {
        method: "PATCH",
        body: { action: "record-payment" },
      }),
      params(bookingId),
    );
    const after = (await json(
      await clientGet(
        req(`/api/reception/clients/${clientId}`),
        params(clientId),
      ),
    )) as unknown as {
      totals: { paidMinor: number; outstandingMinor: number };
    };
    expect(after.totals.paidMinor).toBe(FEE_MINOR);
    expect(after.totals.outstandingMinor).toBe(0);
  });

  it("rejects malformed scheduling payloads before touching the database", async () => {
    const bad = await bookingsPost(
      req("/api/reception/bookings", {
        method: "POST",
        body: {
          therapistId,
          counselingType: "INDIVIDUAL",
          date: "not-a-date",
          time: "11:00",
          feeRupees: 1200,
        },
      }),
    );
    expect(bad.status).toBe(400);

    const bothClients = await bookingsPost(
      req("/api/reception/bookings", {
        method: "POST",
        body: {
          therapistId,
          counselingType: "INDIVIDUAL",
          date: ymd(futureSlot(15)),
          time: "11:00",
          feeRupees: 1200,
          clientId: "some-id",
          newClient: {
            name: "Both At Once",
            email: `both.${STAMP}@test.local`,
            phone: "+919800000006",
            dob: "1990-01-01",
            emergencyContact: "EC (+919800000007)",
          },
        },
      }),
    );
    expect(bothClients.status).toBe(400);
  });
});
