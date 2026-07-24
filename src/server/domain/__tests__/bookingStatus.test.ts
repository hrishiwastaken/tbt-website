import { describe, expect, it } from "vitest";
import {
  assertTransition,
  BOOKING_STATUSES,
  canTransition,
  InvalidTransitionError,
  isBookingStatus,
  SLOT_RELEASING_STATUSES,
} from "../bookingStatus";

describe("booking state machine", () => {
  it("allows the happy path: awaiting payment → confirmed → completed", () => {
    expect(canTransition("PENDING", "AWAITING_PAYMENT")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
  });

  it("routes refunds through REFUND_PENDING", () => {
    expect(canTransition("COMPLETED", "REFUND_PENDING")).toBe(true);
    expect(canTransition("REFUND_PENDING", "REFUNDED")).toBe(true);
    expect(canTransition("REFUND_PENDING", "CONFIRMED")).toBe(true); // rejection path
    expect(canTransition("COMPLETED", "REFUNDED")).toBe(false); // never skip the queue
  });

  it("treats REFUNDED as terminal", () => {
    for (const to of BOOKING_STATUSES) {
      expect(canTransition("REFUNDED", to)).toBe(false);
    }
  });

  it("rejects nonsense transitions", () => {
    expect(canTransition("COMPLETED", "CONFIRMED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(() => assertTransition("COMPLETED", "PENDING")).toThrow(
      InvalidTransitionError,
    );
    expect(() => assertTransition("GARBAGE", "CONFIRMED")).toThrow(
      InvalidTransitionError,
    );
  });

  it("releases slots only on terminal cancel/refund", () => {
    expect(SLOT_RELEASING_STATUSES).toEqual(["CANCELLED", "REFUNDED"]);
    expect(isBookingStatus("NO_SHOW")).toBe(true);
    expect(isBookingStatus("nope")).toBe(false);
  });
});
