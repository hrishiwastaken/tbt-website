import { Resend } from "resend";
import { prisma } from "@/lib/db";

const ADMIN_EMAIL = "admin@thebraintea.co.in";
const TIME_ZONE = "Asia/Kolkata";

type NotificationType =
  | "BOOKING_DETAILS_CLIENT"
  | "BOOKING_DETAILS_CONSULTANT"
  | "PAYMENT_APPROVED_CLIENT"
  | "PAYMENT_APPROVED_CONSULTANT"
  | "PAYMENT_DETAILS_ADMIN"
  | "REMINDER_CLIENT"
  | "REMINDER_CONSULTANT";

type BookingEmail = Awaited<ReturnType<typeof getBooking>>;

function configured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      process.env.GOOGLE_MEET_LINK,
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

function formatAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatDateTime(dateTime: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(dateTime);
}

function appointmentStatus(booking: NonNullable<BookingEmail>): "Approved" | "Pending" {
  return booking.paymentStatus === "PAID" ? "Approved" : "Pending";
}

async function getBooking(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: true,
      service: true,
      therapist: { include: { user: { select: { email: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

function appointmentHtml(booking: NonNullable<BookingEmail>, intro: string): string {
  const meetLink = process.env.GOOGLE_MEET_LINK!;
  const status = appointmentStatus(booking);
  return `<p>${escapeHtml(intro)}</p>
    <h2>Appointment details</h2>
    <p><strong>Status:</strong> ${status}</p>
    <p><strong>Consultant:</strong> ${escapeHtml(booking.therapist.name)}<br />
    <strong>Service:</strong> ${escapeHtml(booking.service.name)}<br />
    <strong>When:</strong> ${formatDateTime(booking.dateTime)} (${TIME_ZONE})<br />
    <strong>Duration:</strong> ${booking.durationMinutes} minutes</p>
    <p>If you decide to meet online, join using this Google Meet link at the appointment time:<br />
    <a href="${escapeHtml(meetLink)}">${escapeHtml(meetLink)}</a></p>
    <p>The Brain Tea</p>`;
}

async function sendOnce(
  bookingId: string,
  type: NotificationType,
  recipient: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!configured()) {
    console.warn("email-notifications: RESEND_API_KEY, RESEND_FROM_EMAIL, or GOOGLE_MEET_LINK is not configured; skipping email");
    return false;
  }
  try {
    await prisma.emailNotification.create({ data: { bookingId, type, recipient } });
  } catch (error: unknown) {
    // P2002 means this exact notification has already been sent or claimed.
    if ((error as { code?: string }).code === "P2002") return false;
    throw error;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: recipient,
      subject,
      html,
    });
    if (response.error) throw new Error(response.error.message);
    if (response.data?.id) {
      await prisma.emailNotification.update({
        where: { bookingId_type: { bookingId, type } },
        data: { resendEmailId: response.data.id },
      });
    }
    return true;
  } catch (error) {
    // Remove the claim so the next webhook/cron retry can deliver the email.
    await prisma.emailNotification.delete({ where: { bookingId_type: { bookingId, type } } }).catch(() => undefined);
    console.error(`email-notifications: failed to send ${type} for booking ${bookingId}`, error);
    return false;
  }
}

async function sendAppointmentPair(
  booking: NonNullable<BookingEmail>,
  types: readonly [NotificationType, NotificationType],
  subject: string,
  intro: string,
) {
  const html = appointmentHtml(booking, intro);
  const recipients: Array<[NotificationType, string]> = [[types[0], booking.client.email]];
  if (booking.therapist.user?.email) recipients.push([types[1], booking.therapist.user.email]);
  await Promise.all(recipients.map(([type, email]) => sendOnce(booking.id, type, email, subject, html)));
}

export async function notifyBookingCreated(bookingId: string) {
  const booking = await getBooking(bookingId);
  if (!booking) return;
  await sendAppointmentPair(
    booking,
    ["BOOKING_DETAILS_CLIENT", "BOOKING_DETAILS_CONSULTANT"],
    `Booking ${appointmentStatus(booking).toLowerCase()}: ${booking.service.name}`,
    "Your consultation has been booked. We will update you when payment is recorded.",
  );
}

export async function notifyPaymentApproved(bookingId: string) {
  const booking = await getBooking(bookingId);
  if (!booking || booking.paymentStatus !== "PAID") return;
  await sendAppointmentPair(
    booking,
    ["PAYMENT_APPROVED_CLIENT", "PAYMENT_APPROVED_CONSULTANT"],
    `Appointment approved: ${booking.service.name}`,
    "Payment has been received and this appointment is approved.",
  );
  const payment = booking.payments[0];
  const paymentDetails = `<h2>Payment received</h2>
    <p><strong>Client:</strong> ${escapeHtml(booking.client.name)} (${escapeHtml(booking.client.email)})<br />
    <strong>Consultant:</strong> ${escapeHtml(booking.therapist.name)}<br />
    <strong>Service:</strong> ${escapeHtml(booking.service.name)}<br />
    <strong>Appointment:</strong> ${formatDateTime(booking.dateTime)} (${TIME_ZONE})<br />
    <strong>Amount:</strong> ${formatAmount(booking.amountMinor - booking.discountMinor, booking.currency)}<br />
    <strong>Invoice:</strong> ${escapeHtml(booking.invoiceNumber ?? "Pending")}</p>
    <p><strong>Provider:</strong> ${escapeHtml(payment?.provider ?? "Not recorded")}<br />
    <strong>Reference:</strong> ${escapeHtml(payment?.providerRef ?? payment?.providerPaymentId ?? "Not recorded")}</p>`;
  await sendOnce(booking.id, "PAYMENT_DETAILS_ADMIN", ADMIN_EMAIL, `Payment received: ${booking.client.name}`, paymentDetails);
}

export async function sendUpcomingReminders() {
  const now = new Date();
  const inTwentyEightHours = new Date(now.getTime() + 28 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      dateTime: { gt: now, lte: inTwentyEightHours },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: { id: true },
  });
  for (const { id } of bookings) {
    const booking = await getBooking(id);
    if (!booking) continue;
    await sendAppointmentPair(
      booking,
      ["REMINDER_CLIENT", "REMINDER_CONSULTANT"],
      `Reminder: ${booking.service.name} appointment`,
      "This is a reminder that your consultation is coming up within the next 28 hours.",
    );
  }
  return { candidates: bookings.length };
}
