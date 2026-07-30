import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUSES,
  canTransition,
  type BookingStatus,
} from "../bookingStatus";
import {
  RECEPTION_RESCHEDULABLE,
  RECEPTION_TRANSITIONS,
  receptionCanReschedule,
  receptionCanTransition,
} from "../receptionScope";

describe("reception scope", () => {
  it("is a strict subset of the booking state machine", () => {
    for (const from of BOOKING_STATUSES) {
      for (const to of RECEPTION_TRANSITIONS[from]) {
        expect(
          canTransition(from, to),
          `reception allows ${from} → ${to} but the domain machine does not`,
        ).toBe(true);
      }
    }
  });

  it("covers every booking status, so an unlisted status can never fall open", () => {
    for (const status of BOOKING_STATUSES) {
      expect(RECEPTION_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("lets the desk run the day-to-day appointment lifecycle", () => {
    expect(receptionCanTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(receptionCanTransition("AWAITING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(receptionCanTransition("CONFIRMED", "COMPLETED")).toBe(true);
    expect(receptionCanTransition("CONFIRMED", "NO_SHOW")).toBe(true);
    expect(receptionCanTransition("CONFIRMED", "CANCELLED")).toBe(true);
  });

  it("lets the desk raise a refund request but never settle one", () => {
    expect(receptionCanTransition("CONFIRMED", "REFUND_PENDING")).toBe(true);
    expect(receptionCanTransition("COMPLETED", "REFUND_PENDING")).toBe(true);
    // Executing the refund (money leaving) and rejecting it (reinstating a
    // paid booking) are both admin decisions.
    expect(receptionCanTransition("REFUND_PENDING", "REFUNDED")).toBe(false);
    expect(receptionCanTransition("REFUND_PENDING", "CONFIRMED")).toBe(false);
  });

  it("rejects unknown and terminal statuses", () => {
    expect(receptionCanTransition("NOT_A_STATUS", "CONFIRMED")).toBe(false);
    expect(receptionCanTransition("CONFIRMED", "NOT_A_STATUS")).toBe(false);
    expect(receptionCanTransition("REFUNDED", "CONFIRMED")).toBe(false);
  });

  it("only reschedules bookings that still hold a live slot", () => {
    for (const status of RECEPTION_RESCHEDULABLE) {
      expect(receptionCanReschedule(status)).toBe(true);
    }
    const closed: BookingStatus[] = [
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
      "REFUND_PENDING",
      "REFUNDED",
    ];
    for (const status of closed) {
      expect(receptionCanReschedule(status)).toBe(false);
    }
  });
});
