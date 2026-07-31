import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { POST as bookingsPost } from "@/app/api/bookings/route";
import { POST as cancelPost } from "@/app/api/bookings/cancel/route";
import { GET as adminBookingsGet } from "@/app/api/admin/bookings/route";
import { GET as therapistAppointmentsGet } from "@/app/api/therapist/appointments/route";

// End-to-end data-minimisation checks against the real route handlers: the
// public booking flow must never echo internal financial/clinical fields,
// and authenticated list endpoints must not ship the encrypted notes blob.
// Requires DATABASE_URL (skipped otherwise).

const hasDb = !!process.env.DATABASE_URL;
const suite = hasDb ? describe : describe.skip;

const STAMP = Date.now();
const SLUG = `sec-consultant-${STAMP}`;
const SERVICE_SLUG = `sec-service-${STAMP}`;
const FEE_MINOR = 150000;

let therapistId: string;
let adminCookie: string;
let therapistCookie: string;

// A weekday slot far in the future (well past the seed's booked range and the
// 48h cancellation cutoff), aligned to the availability template below.
function futureSlot(hour = 10): { date: string; time: string; dt: Date } {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(hour).padStart(2, "0")}:00`;
  return { date, time, dt: d };
}

function req(
  url: string,
  { body, cookie }: { body?: unknown; cookie?: string } = {},
): Request {
  return new Request(`http://localhost${url}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      // Distinct IP per call keeps the public rate limiter out of the way.
      "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250) + 1}`,
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function json(res: Response) {
  return (await res.json()) as Record<string, unknown>;
}

suite("public API data minimisation", () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        email: `sec.admin.${STAMP}@test.local`,
        passwordHash: "x",
        role: "ADMIN",
      },
    });
    adminCookie = `auth_token=${signToken({ userId: admin.id, email: admin.email, role: "ADMIN" })}`;

    const consultantUser = await prisma.user.create({
      data: {
        email: `sec.consultant.${STAMP}@test.local`,
        passwordHash: "x",
        role: "THERAPIST",
      },
    });
    therapistCookie = `auth_token=${signToken({ userId: consultantUser.id, email: consultantUser.email, role: "THERAPIST" })}`;

    const therapist = await prisma.therapist.create({
      data: {
        userId: consultantUser.id,
        name: "Security Test Consultant",
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
        [10, 11, 12, 13, 14].map((h) => ({
          therapistId: therapist.id,
          dayOfWeek: day,
          startTime: `${String(h).padStart(2, "0")}:00`,
          endTime: `${String(h + 1).padStart(2, "0")}:00`,
        })),
      ),
    });
    await prisma.service.create({
      data: {
        name: "Security Test Session",
        description: "test",
        durationMinutes: 50,
        priceMinor: FEE_MINOR,
        slug: SERVICE_SLUG,
        therapists: { connect: { id: therapist.id } },
      },
    });
  });

  afterAll(async () => {
    await prisma.ledgerEntry.deleteMany({ where: { therapistId } });
    await prisma.booking.deleteMany({ where: { therapistId } });
    await prisma.therapist.delete({ where: { id: therapistId } });
    await prisma.service.deleteMany({ where: { slug: SERVICE_SLUG } });
    await prisma.client.deleteMany({
      where: { email: { contains: `${STAMP}` } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: `${STAMP}` } },
    });
    await prisma.$disconnect();
  });

  async function book(hour: number) {
    const slot = futureSlot(hour);
    const res = await bookingsPost(
      req("/api/bookings", {
        body: {
          therapistSlug: SLUG,
          serviceSlug: SERVICE_SLUG,
          date: slot.date,
          time: slot.time,
          name: `Sec Client ${hour}`,
          email: `sec.client.${STAMP}.${hour}@test.local`,
          phone: "+919812345678",
          dob: "1990-01-01",
          emergencyContact: "EC (+919812345679)",
          gdprConsent: true,
          paymentOption: "PAY_LATER",
        },
      }),
    );
    return { status: res.status, body: await json(res) };
  }

  it("POST /api/bookings never returns commissionBps, notes, or the consultant's account id", async () => {
    const { status, body } = await book(10);
    expect(status).toBe(200);

    const booking = body.booking as Record<string, unknown>;
    expect(booking).toBeTruthy();
    expect(booking).not.toHaveProperty("commissionBps");
    expect(booking).not.toHaveProperty("notes");
    expect(booking).not.toHaveProperty("therapistId");
    expect(booking).not.toHaveProperty("clientId");

    const therapist = booking.therapist as Record<string, unknown>;
    expect(therapist).not.toHaveProperty("userId");
    expect(therapist).not.toHaveProperty("commissionBps");
    expect(therapist).not.toHaveProperty("feeMinor");

    // Nothing internal anywhere in the payload.
    const blob = JSON.stringify(body);
    expect(blob).not.toContain("commissionBps");
    expect(blob).not.toContain("userId");

    // But the fields the client needs are present.
    expect(typeof booking.id).toBe("string");
    expect(booking.status).toBe("CONFIRMED");
  });

  it("POST /api/bookings/cancel returns state only, not the internal row", async () => {
    const created = await book(11);
    const bookingId = (created.body.booking as { id: string }).id;

    const res = await cancelPost(
      req("/api/bookings/cancel", { body: { bookingId } }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    const booking = body.booking as Record<string, unknown>;
    expect(Object.keys(booking).sort()).toEqual([
      "id",
      "paymentStatus",
      "status",
    ]);
    expect(booking.status).toBe("CANCELLED");
  });

  it("admin & therapist booking lists omit the encrypted notes blob", async () => {
    // Attach a note so a leak would be observable.
    const anyBooking = await prisma.booking.findFirst({ where: { therapistId } });
    if (anyBooking) {
      await prisma.booking.update({
        where: { id: anyBooking.id },
        data: { notes: "ciphertext-should-never-appear-in-a-list" },
      });
    }

    const adminRes = await adminBookingsGet(
      req(`/api/admin/bookings?therapistId=${therapistId}`, {
        cookie: adminCookie,
      }),
    );
    const adminList = await json(adminRes);
    expect(adminRes.status, JSON.stringify(adminList)).toBe(200);
    for (const row of adminList.items as Record<string, unknown>[]) {
      expect(row).not.toHaveProperty("notes");
    }
    expect(JSON.stringify(adminList)).not.toContain("ciphertext-should-never");

    const therapistList = await json(
      await therapistAppointmentsGet(
        req("/api/therapist/appointments", { cookie: therapistCookie }),
      ),
    );
    for (const row of therapistList.items as Record<string, unknown>[]) {
      expect(row).not.toHaveProperty("notes");
    }
    expect(JSON.stringify(therapistList)).not.toContain("ciphertext-should-never");
  });
});
