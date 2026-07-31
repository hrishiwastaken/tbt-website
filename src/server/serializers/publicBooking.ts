// Whitelist serializer for booking data returned to UNAUTHENTICATED callers
// (the public booking flow). Prisma's default `include` returns whole rows,
// which leaks internal fields — commissionBps (the platform's margin), the
// encrypted `notes` blob, the consultant's linked auth-account id, and raw
// foreign keys. Public responses must carry only what the booking client
// legitimately needs to see, so every field here is opt-in, never opt-out.

interface BookingLike {
  id: string;
  dateTime: Date | string;
  durationMinutes: number;
  counselingType: string | null;
  amountMinor: number;
  discountMinor: number;
  taxMinor: number;
  currency: string;
  status: string;
  paymentStatus: string;
  expiresAt: Date | string | null;
  invoiceNumber: string | null;
  createdAt: Date | string;
  client?: { name: string; email: string; phone: string } | null;
  therapist?: { name: string; slug: string; photo: string | null } | null;
  service?: { name: string; slug?: string; durationMinutes?: number } | null;
}

export interface PublicBookingView {
  id: string;
  dateTime: Date | string;
  durationMinutes: number;
  counselingType: string | null;
  amountMinor: number;
  discountMinor: number;
  taxMinor: number;
  currency: string;
  status: string;
  paymentStatus: string;
  expiresAt: Date | string | null;
  invoiceNumber: string | null;
  createdAt: Date | string;
  therapist: { name: string; slug: string; photo: string | null } | null;
  service: { name: string; slug: string | null } | null;
}

/**
 * Remove the encrypted clinical-notes blob from booking rows before they go
 * into an authenticated LIST response. Notes are read (and decrypted) only
 * through single-booking detail routes; a list never needs the ciphertext,
 * so we drop it rather than shipping it to the browser. Done in application
 * code because query-level `omit` is a preview feature on this Prisma
 * version.
 */
export function stripNotes<T extends { notes?: unknown }>(
  rows: T[],
): Array<Omit<T, "notes">> {
  return rows.map((row) => {
    const rest = { ...row } as Record<string, unknown>;
    delete rest.notes;
    return rest as Omit<T, "notes">;
  });
}

/**
 * Reduce a booking (with its relations) to the fields a public client may
 * see. Deliberately omits commissionBps, notes, cancellationReason and all
 * internal foreign keys / linked-account ids.
 */
export function publicBookingView(booking: BookingLike): PublicBookingView {
  return {
    id: booking.id,
    dateTime: booking.dateTime,
    durationMinutes: booking.durationMinutes,
    counselingType: booking.counselingType,
    amountMinor: booking.amountMinor,
    discountMinor: booking.discountMinor,
    taxMinor: booking.taxMinor,
    currency: booking.currency,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    expiresAt: booking.expiresAt ?? null,
    invoiceNumber: booking.invoiceNumber,
    createdAt: booking.createdAt,
    therapist: booking.therapist
      ? {
          name: booking.therapist.name,
          slug: booking.therapist.slug,
          photo: booking.therapist.photo ?? null,
        }
      : null,
    service: booking.service
      ? { name: booking.service.name, slug: booking.service.slug ?? null }
      : null,
  };
}
