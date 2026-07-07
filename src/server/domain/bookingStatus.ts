// Booking lifecycle state machine. This module is the single source of
// truth for which transitions are legal; services must go through
// assertTransition rather than writing status strings ad hoc.

export const BOOKING_STATUSES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "REFUND_PENDING",
  "REFUNDED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["AWAITING_PAYMENT", "CONFIRMED", "CANCELLED"],
  AWAITING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW", "REFUND_PENDING"],
  COMPLETED: ["REFUND_PENDING"],
  CANCELLED: ["REFUND_PENDING"],
  NO_SHOW: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED", "CONFIRMED"], // refund can be executed or rejected back
  REFUNDED: [],
};

/** Statuses that keep a hold on the therapist's calendar slot. */
export const SLOT_HOLDING_STATUSES: BookingStatus[] = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
];

/** Terminal statuses that release the calendar slot. */
export const SLOT_RELEASING_STATUSES: BookingStatus[] = ["CANCELLED", "REFUNDED"];

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string
  ) {
    super(`Illegal booking transition ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: string, to: string): void {
  if (!isBookingStatus(from) || !isBookingStatus(to) || !canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
