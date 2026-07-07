/**
 * Seed script: builds a realistic 90-day operating history so the admin
 * dashboard, ledger and payout flows have real persisted data to aggregate.
 *
 * All money is integer paise. Ledger postings here mirror
 * src/server/domain/postings.ts (kept in plain JS because seeding runs under
 * node without a TS loader — the TS module stays the source of truth and is
 * covered by tests).
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Deterministic PRNG (mulberry32) so reseeding produces the same dataset.
let randState = 0x9e3779b9;
function rand() {
  randState |= 0;
  randState = (randState + 0x6d2b79f5) | 0;
  let t = Math.imul(randState ^ (randState >>> 15), 1 | randState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const DEFAULT_COMMISSION_BPS = 3000;

function splitPayment({ grossMinor, discountMinor = 0, taxMinor = 0, commissionBps }) {
  const netMinor = grossMinor - discountMinor - taxMinor;
  const commissionMinor = Math.round((netMinor * commissionBps) / 10000);
  return { netMinor, commissionMinor, platformMinor: netMinor - commissionMinor };
}

const invoiceNumberFor = (bookingId, year) => `INV-${year}-${bookingId.slice(0, 6).toUpperCase()}`;

async function main() {
  console.log("Seeding database...");

  // Wipe in dependency order
  await prisma.ledgerEntry.deleteMany({});
  await prisma.payout.deleteMany({});
  await prisma.webhookEvent.deleteMany({});
  await prisma.paymentRecord.deleteMany({});
  await prisma.bookingStatusHistory.deleteMany({});
  await prisma.bookingSlot.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.slotBlock.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.therapistAvailability.deleteMany({});
  await prisma.commissionSetting.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.therapist.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.testimonial.deleteMany({});

  // ── Commission default ────────────────────────────────────────────────
  const commissionEpoch = new Date();
  commissionEpoch.setDate(commissionEpoch.getDate() - 400);
  await prisma.commissionSetting.create({
    data: {
      scope: "DEFAULT",
      commissionBps: DEFAULT_COMMISSION_BPS,
      effectiveFrom: commissionEpoch,
    },
  });

  // ── Services (prices in paise) ────────────────────────────────────────
  const serviceRows = [
    ["Individual Therapy", "A focused, one-on-one session designed to explore personal narratives, address psychological blocks, and cultivate self-awareness.", 50, 150000, "individual-therapy"],
    ["Couples Counseling", "Structured mediation to enhance relational dynamics, dismantle communication barriers, and restore intimacy.", 60, 220000, "couples-counseling"],
    ["Somatic Experiencing", "A body-centric therapy focusing on trauma resolution, releasing trapped nervous system stress, and restoring equilibrium.", 50, 180000, "somatic-experiencing"],
    ["Mental Health Assessment", "Comprehensive diagnostic evaluations using standardized psychometric tools to guide customized treatment plans.", 75, 250000, "mental-health-assessment"],
  ];
  const services = [];
  for (const [name, description, durationMinutes, priceMinor, slug] of serviceRows) {
    services.push(
      await prisma.service.create({ data: { name, description, durationMinutes, priceMinor, slug } })
    );
  }

  // ── Users & consultants ───────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@madhumaticlinic.com",
      passwordHash: await bcrypt.hash("AdminPass123!", 10),
      role: "ADMIN",
    },
  });

  const consultantSpecs = [
    {
      email: "madhumati@madhumaticlinic.com",
      password: "DrMadhumati123!",
      name: "Dr. Madhumati Dhumak",
      slug: "dr-madhumati-dhumak",
      bio: "Clinical psychologist with over 15 years of experience in mindfulness-based cognitive therapy and family counseling, guiding individuals through existential challenges, stress mitigation, and emotional stabilization.",
      feeMinor: 150000,
      commissionBps: null, // platform default 30%
      status: "APPROVED",
    },
    {
      email: "rohan@madhumaticlinic.com",
      password: "DrRohan123!",
      name: "Dr. Rohan Gupta",
      slug: "dr-rohan-gupta",
      bio: "Specialist in Somatic Experiencing and trauma recovery, providing clients with practical, scientifically-grounded tools to resolve physiological fight-or-flight blockages.",
      feeMinor: 130000,
      commissionBps: 3500, // negotiated override 35%
      status: "APPROVED",
    },
    {
      email: null,
      password: null,
      name: "Dr. Ananya Iyer",
      slug: "dr-ananya-iyer",
      bio: "Child and adolescent psychologist focusing on developmental assessments, learning differences, and family systems work. Currently onboarding to the practice.",
      feeMinor: 120000,
      commissionBps: 3200,
      status: "PENDING",
    },
  ];

  const therapists = [];
  for (const spec of consultantSpecs) {
    let userId = null;
    if (spec.email) {
      const user = await prisma.user.create({
        data: {
          email: spec.email,
          passwordHash: await bcrypt.hash(spec.password, 10),
          role: "THERAPIST",
        },
      });
      userId = user.id;
    }
    const therapist = await prisma.therapist.create({
      data: {
        userId,
        name: spec.name,
        slug: spec.slug,
        bio: spec.bio,
        feeMinor: spec.feeMinor,
        commissionBps: spec.commissionBps,
        status: spec.status,
        isActive: spec.status === "APPROVED",
        photo:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
      },
    });
    if (spec.commissionBps != null) {
      await prisma.commissionSetting.create({
        data: {
          scope: "THERAPIST",
          therapistId: therapist.id,
          commissionBps: spec.commissionBps,
          effectiveFrom: commissionEpoch,
          createdById: adminUser.id,
        },
      });
    }
    therapists.push(therapist);
  }
  const activeTherapists = therapists.filter((t) => t.status === "APPROVED");

  // ── Weekly availability (Mon–Fri, hourly 09:00–17:00) ─────────────────
  const weekdays = [1, 2, 3, 4, 5];
  const hours = [9, 10, 11, 13, 14, 15, 16];
  for (const therapist of activeTherapists) {
    for (const day of weekdays) {
      for (const hour of hours) {
        await prisma.therapistAvailability.create({
          data: {
            therapistId: therapist.id,
            dayOfWeek: day,
            startTime: `${String(hour).padStart(2, "0")}:00`,
            endTime: `${String(hour + 1).padStart(2, "0")}:00`,
          },
        });
      }
    }
  }

  // ── Clients registered over the past ~120 days ────────────────────────
  const clientNames = [
    "Amit Patel", "Neha Joshi", "Rahul Verma", "Sneha Kulkarni", "Vikram Malhotra",
    "Priya Nair", "Arjun Reddy", "Kavya Sharma", "Rohit Desai", "Ishita Bose",
    "Sanjay Menon", "Divya Pillai", "Karan Kapoor", "Meera Krishnan", "Aditya Rao",
    "Pooja Hegde", "Nikhil Bansal", "Ritu Agarwal",
  ];
  const clients = [];
  for (let i = 0; i < clientNames.length; i++) {
    const name = clientNames[i];
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(rand() * 120));
    createdAt.setHours(10 + Math.floor(rand() * 8), 0, 0, 0);
    const email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com";
    clients.push(
      await prisma.client.create({
        data: {
          name,
          email,
          phone: `+9198${String(10000000 + Math.floor(rand() * 89999999))}`,
          dob: `19${70 + Math.floor(rand() * 30)}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
          emergencyContact: `Family contact (+9199${String(10000000 + Math.floor(rand() * 89999999))})`,
          gdprConsent: true,
          createdAt,
        },
      })
    );
  }

  // ── Bookings over past 90 days + next 14 days ─────────────────────────
  const year = new Date().getFullYear();
  const usedSlots = new Set(); // therapistId|iso
  let counters = { completed: 0, refunded: 0, cancelled: 0, noShow: 0, upcoming: 0, pending: 0 };

  async function recordChargeSuccess(booking, therapist, when) {
    const invoiceNumber = invoiceNumberFor(booking.id, year);
    const payment = await prisma.paymentRecord.create({
      data: {
        bookingId: booking.id,
        provider: "manual",
        kind: "CHARGE",
        amountMinor: booking.amountMinor - booking.discountMinor,
        status: "SUCCEEDED",
        providerOrderId: `manual_seed_${booking.id.slice(0, 12)}`,
        providerPaymentId: String(100000000000 + Math.floor(rand() * 899999999999)),
        providerRef: String(100000000000 + Math.floor(rand() * 899999999999)),
        idempotencyKey: `charge:${booking.id}`,
        createdAt: when,
        updatedAt: when,
      },
    });
    const split = splitPayment({
      grossMinor: booking.amountMinor,
      discountMinor: booking.discountMinor,
      commissionBps: booking.commissionBps,
    });
    const base = { bookingId: booking.id, paymentRecordId: payment.id, createdAt: when };
    await prisma.ledgerEntry.createMany({
      data: [
        { ...base, entryType: "GROSS_REVENUE", amountMinor: booking.amountMinor, description: `Gross booking amount collected (${invoiceNumber})` },
        ...(booking.discountMinor > 0
          ? [{ ...base, entryType: "DISCOUNT", amountMinor: -booking.discountMinor, description: `Discount applied (${invoiceNumber})` }]
          : []),
        { ...base, entryType: "COMMISSION_ACCRUED", amountMinor: split.commissionMinor, therapistId: therapist.id, description: `Consultant commission accrued at ${booking.commissionBps / 100}% (${invoiceNumber})` },
        { ...base, entryType: "PLATFORM_REVENUE", amountMinor: split.platformMinor, description: `Platform share recognised (${invoiceNumber})` },
      ],
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: "PAID", invoiceNumber },
    });
    return { payment, split, invoiceNumber };
  }

  async function recordRefund(booking, therapist, split, when, reason) {
    const refundMinor = split.netMinor;
    const refund = await prisma.paymentRecord.create({
      data: {
        bookingId: booking.id,
        provider: "manual",
        kind: "REFUND",
        amountMinor: refundMinor,
        status: "SUCCEEDED",
        providerPaymentId: `manual_rf_${booking.id.slice(0, 12)}`,
        idempotencyKey: `refund:${booking.id}:${refundMinor}`,
        createdAt: when,
        updatedAt: when,
      },
    });
    const base = { bookingId: booking.id, paymentRecordId: refund.id, createdAt: when };
    await prisma.ledgerEntry.createMany({
      data: [
        { ...base, entryType: "REFUND", amountMinor: -refundMinor, description: `Refund issued — ${reason}` },
        { ...base, entryType: "COMMISSION_REVERSED", amountMinor: -split.commissionMinor, therapistId: therapist.id, description: `Consultant commission reversed on refund` },
        { ...base, entryType: "PLATFORM_REVENUE_REVERSED", amountMinor: -split.platformMinor, description: `Platform share reversed on refund` },
      ],
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: "REFUNDED", status: "REFUNDED" },
    });
  }

  for (let dayOffset = -90; dayOffset <= 14; dayOffset++) {
    const day = new Date();
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);
    if (day.getDay() === 0 || day.getDay() === 6) continue; // clinic closed

    // Volume grows gently over time: 0–2 early, 1–4 recent
    const growth = (dayOffset + 90) / 104;
    const bookingsToday = Math.floor(rand() * (2.4 + growth * 3.6));

    for (let i = 0; i < bookingsToday; i++) {
      const therapist = pick(activeTherapists);
      const hour = pick(hours);
      const startAt = new Date(day);
      startAt.setHours(hour, 0, 0, 0);
      const slotKey = `${therapist.id}|${startAt.toISOString()}`;
      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);

      const service = pick(services);
      const client = pick(clients);
      const commissionBps = therapist.commissionBps ?? DEFAULT_COMMISSION_BPS;
      const discountMinor = rand() < 0.12 ? 10000 : 0; // occasional ₹100 goodwill discount

      const createdAt = new Date(startAt);
      createdAt.setDate(createdAt.getDate() - (1 + Math.floor(rand() * 6)));
      createdAt.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
      // Client accounts must predate their bookings
      if (createdAt < client.createdAt) createdAt.setTime(client.createdAt.getTime() + 3600000);

      const isPast = startAt.getTime() < Date.now();
      const roll = rand();
      let status;
      if (!isPast) {
        status = roll < 0.85 ? "CONFIRMED" : "PENDING";
      } else if (roll < 0.72) {
        status = "COMPLETED";
      } else if (roll < 0.82) {
        status = "CANCELLED";
      } else if (roll < 0.88) {
        status = "REFUNDED";
      } else if (roll < 0.94) {
        status = "NO_SHOW";
      } else {
        status = "COMPLETED";
      }

      const paidUpfront = rand() < 0.65 || status === "REFUNDED";

      const booking = await prisma.booking.create({
        data: {
          therapistId: therapist.id,
          serviceId: service.id,
          clientId: client.id,
          dateTime: startAt,
          durationMinutes: service.durationMinutes,
          amountMinor: service.priceMinor,
          discountMinor,
          commissionBps,
          status: status === "REFUNDED" ? "CONFIRMED" : status, // refunds transition below
          paymentStatus: "UNPAID",
          createdAt,
          updatedAt: createdAt,
        },
      });
      await prisma.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: null,
          toStatus: paidUpfront ? "CONFIRMED" : status === "REFUNDED" ? "CONFIRMED" : status,
          actorType: "CLIENT",
          reason: paidUpfront ? "Booked and paid online" : "Booked with pay-at-clinic",
          createdAt,
        },
      });

      // Slot hold rows for statuses that keep the calendar occupied
      if (["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"].includes(status)) {
        await prisma.bookingSlot.create({
          data: { therapistId: therapist.id, startAt, bookingId: booking.id },
        });
      }

      let split = null;
      if (paidUpfront || (status === "COMPLETED" && rand() < 0.9)) {
        const paidAt = paidUpfront ? createdAt : new Date(startAt.getTime() + 3600000);
        const result = await recordChargeSuccess(
          { ...booking, discountMinor, commissionBps },
          therapist,
          paidAt
        );
        split = result.split;
        counters.completed += status === "COMPLETED" ? 1 : 0;
      }

      if (status === "REFUNDED" && split) {
        const refundAt = new Date(startAt.getTime() - 24 * 3600000);
        await prisma.bookingStatusHistory.createMany({
          data: [
            { bookingId: booking.id, fromStatus: "CONFIRMED", toStatus: "REFUND_PENDING", actorType: "CLIENT", reason: "Client cancelled paid session", createdAt: refundAt },
            { bookingId: booking.id, fromStatus: "REFUND_PENDING", toStatus: "REFUNDED", actorType: "ADMIN", actorId: adminUser.id, reason: "Refund executed", createdAt: refundAt },
          ],
        });
        await recordRefund(booking, therapist, split, refundAt, "client cancellation");
        counters.refunded++;
      } else if (status !== booking.status || ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status)) {
        const transitionedAt = new Date(startAt.getTime() + (status === "CANCELLED" ? -20 * 3600000 : 2 * 3600000));
        await prisma.booking.update({ where: { id: booking.id }, data: { status } });
        await prisma.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: "CONFIRMED",
            toStatus: status,
            actorType: status === "CANCELLED" ? "CLIENT" : "THERAPIST",
            reason: status === "CANCELLED" ? "Cancelled ahead of the 12h window" : null,
            createdAt: transitionedAt,
          },
        });
        if (status === "CANCELLED") counters.cancelled++;
        if (status === "NO_SHOW") counters.noShow++;
      }
      if (!isPast) counters.upcoming++;
    }
  }

  // ── Payouts: settle a portion of each consultant's earned commission ──
  for (const therapist of activeTherapists) {
    const earned = await prisma.ledgerEntry.aggregate({
      _sum: { amountMinor: true },
      where: { therapistId: therapist.id, entryType: { in: ["COMMISSION_ACCRUED", "COMMISSION_REVERSED"] } },
    });
    const earnedMinor = earned._sum.amountMinor ?? 0;
    if (earnedMinor <= 0) continue;

    // A settled payout ~40 days ago for roughly the first month's earnings
    const paidAmount = Math.min(Math.round(earnedMinor * 0.45), earnedMinor);
    if (paidAmount > 0) {
      const paidAt = new Date();
      paidAt.setDate(paidAt.getDate() - 40);
      const payout = await prisma.payout.create({
        data: {
          therapistId: therapist.id,
          amountMinor: paidAmount,
          status: "PAID",
          method: "BANK_TRANSFER",
          reference: `NEFT${String(100000 + Math.floor(rand() * 899999))}`,
          initiatedById: adminUser.id,
          paidAt,
          createdAt: new Date(paidAt.getTime() - 2 * 86400000),
          updatedAt: paidAt,
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          entryType: "PAYOUT_PAID",
          amountMinor: -paidAmount,
          therapistId: therapist.id,
          payoutId: payout.id,
          description: `Payout settled (ref ${payout.reference})`,
          createdAt: paidAt,
        },
      });
    }

    // A pending payout awaiting settlement for ~25% of earnings
    const pendingAmount = Math.round(earnedMinor * 0.25);
    if (pendingAmount > 0) {
      await prisma.payout.create({
        data: {
          therapistId: therapist.id,
          amountMinor: pendingAmount,
          status: "PENDING",
          method: "BANK_TRANSFER",
          note: "Fortnightly settlement run",
          initiatedById: adminUser.id,
        },
      });
    }
  }

  // ── Testimonials ──────────────────────────────────────────────────────
  await prisma.testimonial.createMany({
    data: [
      { clientName: "Aarav Sharma", quote: "The environment is calm and feels like a sanctuary. Dr. Madhumati helped me reconcile long-standing emotional challenges through mindful, evidence-based steps.", status: "APPROVED", rating: 5 },
      { clientName: "Priyanka Roy", quote: "Dr. Rohan's somatic practices changed how I handle work-related stress. The physical deceleration exercises have had a lasting impact on my day-to-day life.", status: "APPROVED", rating: 5 },
      { clientName: "Vikram Malhotra", quote: "Incredibly professional and highly secure. The booking system was clean, and my session notes are locked down. Absolute privacy.", status: "APPROVED", rating: 5 },
    ],
  });

  const totals = await prisma.booking.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("Bookings by status:", Object.fromEntries(totals.map((t) => [t.status, t._count._all])));
  const ledgerTotal = await prisma.ledgerEntry.count();
  console.log(`Ledger entries: ${ledgerTotal}`);
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
