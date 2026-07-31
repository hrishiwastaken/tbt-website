import {
  canTransition,
  type BookingStatus,
} from "./bookingStatus";

// What the reception desk is allowed to do to a booking.
//
// This is a *narrowing* of the booking state machine in bookingStatus.ts,
// never an extension: every pair listed here is also legal there (enforced by
// a unit test), so the desk can only ever do less than an admin, and the
// domain machine still has the final say inside transitionBooking.
//
// Withheld from the desk, by design:
//   REFUND_PENDING → REFUNDED   executing a refund moves money off-platform
//   REFUND_PENDING → CONFIRMED  rejecting a refund is a financial decision
// The desk can still *raise* a refund request (→ REFUND_PENDING); an admin
// approves or rejects it.

export const RECEPTION_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  AWAITING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED", "REFUND_PENDING"],
  COMPLETED: ["REFUND_PENDING"],
  CANCELLED: ["REFUND_PENDING"],
  NO_SHOW: ["REFUND_PENDING"],
  REFUND_PENDING: [],
  REFUNDED: [],
};

/** Statuses a receptionist may reschedule a booking from. */
export const RECEPTION_RESCHEDULABLE: BookingStatus[] = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
];

export function receptionCanTransition(from: string, to: string): boolean {
  const allowed = RECEPTION_TRANSITIONS[from as BookingStatus];
  if (!allowed || !allowed.includes(to as BookingStatus)) return false;
  // Belt and braces: never permit something the domain machine forbids.
  return canTransition(from as BookingStatus, to as BookingStatus);
}

export function receptionCanReschedule(from: string): boolean {
  return RECEPTION_RESCHEDULABLE.includes(from as BookingStatus);
}
