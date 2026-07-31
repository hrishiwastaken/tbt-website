import { describe, expect, it } from "vitest";
import { publicBookingView } from "../publicBooking";

// The public booking view is an allow-list: internal financial and clinical
// fields must never appear in a response to an unauthenticated caller, even
// if a future refactor starts passing a fuller row through it.

const fullRow = {
  id: "b1",
  therapistId: "t1",
  serviceId: "s1",
  clientId: "c1",
  dateTime: new Date("2030-01-01T10:00:00Z"),
  durationMinutes: 50,
  counselingType: "INDIVIDUAL",
  amountMinor: 150000,
  discountMinor: 0,
  taxMinor: 0,
  currency: "INR",
  commissionBps: 3000, // internal margin — must be dropped
  status: "CONFIRMED",
  paymentStatus: "UNPAID",
  expiresAt: null,
  cancellationReason: "internal ops note", // must be dropped
  notes: "aes:blob:ciphertext", // encrypted clinical notes — must be dropped
  invoiceNumber: "INV-2030-B1",
  createdAt: new Date("2029-12-01T00:00:00Z"),
  updatedAt: new Date("2029-12-02T00:00:00Z"),
  client: { name: "Jane", email: "jane@x.com", phone: "+910000000000" },
  therapist: {
    id: "t1",
    userId: "user-uuid-internal", // linked auth account — must be dropped
    name: "Dr X",
    slug: "dr-x",
    photo: null,
    commissionBps: 3200, // must be dropped
    feeMinor: 150000,
    isActive: true,
    bio: "…",
  },
  service: { id: "s1", name: "Individual Therapy", slug: "individual-therapy" },
};

describe("publicBookingView", () => {
  it("drops every internal / sensitive field", () => {
    const view = publicBookingView(fullRow) as unknown as Record<
      string,
      unknown
    >;
    for (const banned of [
      "commissionBps",
      "notes",
      "cancellationReason",
      "therapistId",
      "serviceId",
      "clientId",
      "updatedAt",
    ]) {
      expect(view, `leaked ${banned}`).not.toHaveProperty(banned);
    }
    // Serialize-and-scan catches anything nested too.
    const json = JSON.stringify(view);
    expect(json).not.toContain("ciphertext");
    expect(json).not.toContain("user-uuid-internal");
    expect(json).not.toContain("3000");
    expect(json).not.toContain("3200");
  });

  it("nested therapist/service carry only public fields", () => {
    const view = publicBookingView(fullRow);
    expect(view.therapist).toEqual({
      name: "Dr X",
      slug: "dr-x",
      photo: null,
    });
    expect(view.service).toEqual({
      name: "Individual Therapy",
      slug: "individual-therapy",
    });
  });

  it("preserves the fields the client legitimately needs", () => {
    const view = publicBookingView(fullRow);
    expect(view.id).toBe("b1");
    expect(view.status).toBe("CONFIRMED");
    expect(view.paymentStatus).toBe("UNPAID");
    expect(view.amountMinor).toBe(150000);
    expect(view.invoiceNumber).toBe("INV-2030-B1");
  });

  it("tolerates a row with no relations loaded", () => {
    const view = publicBookingView({ ...fullRow, therapist: null, service: null });
    expect(view.therapist).toBeNull();
    expect(view.service).toBeNull();
  });
});
