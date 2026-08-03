import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/auth";
import { PATCH as adminBookingPatch } from "@/app/api/admin/bookings/[id]/route";

// The admin console's "Mark fee collected" action. Every other route test in
// this suite needs a database, but the interesting part of this one does not:
// the handler parses the body and resolves the session before it touches
// Prisma, so schema wiring and RBAC are both observable without a DB.
//
// These two things are exactly what regressed before: the action did not
// exist on the admin route at all (an admin looking at an unpaid booking had
// no way to mark it paid), and recording a fee must stay staff-only.

const SECRET = "admin-desk-payment-test-secret";

function req(body: unknown, cookie?: string): Request {
  return new Request("http://localhost/api/admin/bookings/b1", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "b1" }) };

const cookieFor = (role: string) =>
  `auth_token=${signToken({ userId: `u-${role}`, email: `${role}@test.local`, role })}`;

describe("admin record-payment action", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a recognised action on the admin route", async () => {
    // 401 (not 400) proves the discriminated union accepts "record-payment":
    // an unknown action would fail zod parsing before the session check.
    const res = await adminBookingPatch(req({ action: "record-payment" }), params);
    expect(res.status).toBe(401);
  });

  it("accepts an optional payment reference", async () => {
    const res = await adminBookingPatch(
      req({ action: "record-payment", reference: "402311223344" }),
      params,
    );
    expect(res.status).toBe(401);
  });

  it("rejects a reference longer than the column allows", async () => {
    const res = await adminBookingPatch(
      req({ action: "record-payment", reference: "x".repeat(65) }),
      params,
    );
    expect(res.status).toBe(400);
  });

  it("still rejects a genuinely unknown action", async () => {
    const res = await adminBookingPatch(req({ action: "make-it-free" }), params);
    expect(res.status).toBe(400);
  });

  it("refuses anonymous callers", async () => {
    const res = await adminBookingPatch(req({ action: "record-payment" }), params);
    expect(res.status).toBe(401);
  });

  it("refuses non-admin roles on the admin route", async () => {
    // Reception has its own record-payment endpoint; the admin one is ADMIN
    // only, matching every other action on this route.
    for (const role of ["RECEPTIONIST", "THERAPIST"]) {
      const res = await adminBookingPatch(
        req({ action: "record-payment" }, cookieFor(role)),
        params,
      );
      expect(res.status, `${role} must not reach the admin handler`).toBe(403);
    }
  });
});
