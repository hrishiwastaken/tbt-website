/**
 * Seed script: builds a realistic ~200-day operating history — six
 * consultants at different career stages, ~96 clients, a dense stream of
 * bookings (a rising daily baseline, floored so no operating day is empty),
 * a two-era commission-rate history, unavailability blocks, and multi-cycle
 * payout settlements — so every admin/therapist chart and KPI has plentiful,
 * presentable, ledger-accurate data to aggregate.
 *
 * All money is integer paise. Ledger postings here mirror
 * src/server/domain/postings.ts (kept in plain JS because seeding runs under
 * node without a TS loader — the TS module stays the source of truth and is
 * covered by tests).
 *
 * Performance: rows are generated in memory (with client-side UUIDs so
 * relations can be wired without round-tripping) and written with batched
 * `createMany` calls. This collapses what used to be thousands of sequential
 * inserts into a few dozen statements, so the seed completes in seconds even
 * against a networked/pooled Postgres instead of appearing to hang.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

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
const weightedPick = (rows) => {
  // rows: [{ item, weight }]
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let x = rand() * total;
  for (const row of rows) {
    x -= row.weight;
    if (x <= 0) return row.item;
  }
  return rows[rows.length - 1].item;
};
const addDays = (d, days) => {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
};

// Insert a batch of rows in chunks small enough to stay under Postgres's
// bind-parameter ceiling, regardless of how wide the row is.
async function insertMany(delegate, rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await delegate.createMany({ data: rows.slice(i, i + CHUNK) });
  }
}

function splitPayment({ grossMinor, discountMinor = 0, taxMinor = 0, commissionBps }) {
  const netMinor = grossMinor - discountMinor - taxMinor;
  const commissionMinor = Math.round((netMinor * commissionBps) / 10000);
  return { netMinor, commissionMinor, platformMinor: netMinor - commissionMinor };
}

// Invoice numbers must be unique (the column is unique in the schema). The
// short uuid slice keeps them readable; on the rare slice collision we suffix
// a counter so a whole batch insert can never fail on a duplicate.
const usedInvoices = new Set();
function invoiceNumberFor(bookingId, year) {
  const base = `INV-${year}-${bookingId.slice(0, 6).toUpperCase()}`;
  let candidate = base;
  let n = 1;
  while (usedInvoices.has(candidate)) candidate = `${base}-${n++}`;
  usedInvoices.add(candidate);
  return candidate;
}

// ── Commission rate history: two eras, oldest first ─────────────────────
// Bookings snapshot whichever rate was in effect at their creation time
// (unless the consultant carries a personal override).
const COMMISSION_ERAS = [
  { effectiveFrom: addDays(new Date(), -400), commissionBps: 3000 },
  { effectiveFrom: addDays(new Date(), -90), commissionBps: 3200 },
];
function defaultBpsAt(date) {
  let bps = COMMISSION_ERAS[0].commissionBps;
  for (const era of COMMISSION_ERAS) {
    if (era.effectiveFrom <= date) bps = era.commissionBps;
  }
  return bps;
}

const HISTORY_DAYS = 200; // how far back the operating history begins
const FUTURE_DAYS = 21; // how far ahead upcoming bookings extend

async function main() {
  console.log("Seeding database...");
  const now = new Date();
  const nowMs = now.getTime();

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
  console.log("  cleared existing rows");

  // Audit rows are collected here and written once at the end — every
  // simulated admin action journals the same shape the live workflow
  // endpoints write (mirroring src/server/audit.ts).
  const auditRows = [];

  // ── Commission default history (append-only) ──────────────────────────
  await prisma.commissionSetting.createMany({
    data: COMMISSION_ERAS.map((era) => ({
      scope: "DEFAULT",
      commissionBps: era.commissionBps,
      effectiveFrom: era.effectiveFrom,
    })),
  });

  // ── Services (prices in paise) ────────────────────────────────────────
  const serviceRows = [
    ["Individual Therapy", "A focused, one-on-one session designed to explore personal narratives, address psychological blocks, and cultivate self-awareness.", 50, 150000, "individual-therapy"],
    ["Couples Counseling", "Structured mediation to enhance relational dynamics, dismantle communication barriers, and restore intimacy.", 60, 220000, "couples-counseling"],
    ["Somatic Experiencing", "A body-centric therapy focusing on trauma resolution, releasing trapped nervous system stress, and restoring equilibrium.", 50, 180000, "somatic-experiencing"],
    ["Mental Health Assessment", "Comprehensive diagnostic evaluations using standardized psychometric tools to guide customized treatment plans.", 75, 250000, "mental-health-assessment"],
    ["Career & Academic Counselling", "Structured guidance for career transitions, academic stress, and decision-making clarity.", 45, 140000, "career-academic-counselling"],
  ];
  const services = serviceRows.map(([name, description, durationMinutes, priceMinor, slug]) => ({
    id: randomUUID(),
    name,
    description,
    durationMinutes,
    priceMinor,
    slug,
  }));
  await prisma.service.createMany({ data: services });

  // ── Users & consultants ───────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@madhumaticlinic.com",
      passwordHash: await bcrypt.hash("AdminPass123!", 10),
      role: "ADMIN",
    },
  });

  function adminAudit(action, entityType, entityId, detail, createdAt) {
    auditRows.push({
      actorUserId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: "ADMIN",
      action,
      entityType,
      entityId: entityId ?? null,
      detail: detail ? JSON.stringify(detail) : null,
      createdAt,
    });
  }

  for (const era of COMMISSION_ERAS) {
    adminAudit(
      "commission.set_default",
      "CommissionSetting",
      null,
      { commissionBps: era.commissionBps },
      era.effectiveFrom
    );
  }

  const PHOTO = (seed) => `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=80`;

  // Each spec carries a `weight` (relative booking volume) and an
  // `activeFrom`/`activeTo` window bounding when they take bookings, so the
  // roster reads as a real practice: a senior anchor, an established
  // specialist, a mid-career consultant, a newer part-timer, someone
  // suspended partway through, and a pending applicant not yet bookable.
  const consultantSpecs = [
    {
      email: "madhumati@madhumaticlinic.com",
      password: "DrMadhumati123!",
      name: "Dr. Madhumati Dhumak",
      slug: "dr-madhumati-dhumak",
      bio: "Clinical psychologist with over 15 years of experience in mindfulness-based cognitive therapy and family counseling, guiding individuals through existential challenges, stress mitigation, and emotional stabilization.",
      feeMinor: 150000,
      commissionBps: null, // platform default
      status: "APPROVED",
      photo: PHOTO("1573496359142-b8d87734a5a2"),
      weight: 3,
      activeFromDay: -HISTORY_DAYS,
      activeToDay: FUTURE_DAYS,
      schedule: { days: [1, 2, 3, 4, 5], hours: [9, 10, 11, 13, 14, 15, 16] },
    },
    {
      email: "rohan@madhumaticlinic.com",
      password: "DrRohan123!",
      name: "Dr. Rohan Gupta",
      slug: "dr-rohan-gupta",
      bio: "Specialist in Somatic Experiencing and trauma recovery, providing clients with practical, scientifically-grounded tools to resolve physiological fight-or-flight blockages.",
      feeMinor: 130000,
      commissionBps: 3500, // negotiated override
      status: "APPROVED",
      photo: PHOTO("1559839734-2b71ea197ec2"),
      weight: 2.6,
      activeFromDay: -HISTORY_DAYS,
      activeToDay: FUTURE_DAYS,
      schedule: { days: [1, 2, 3, 4, 5, 6], hours: [9, 10, 11] },
    },
    {
      email: "kavita@madhumaticlinic.com",
      password: "DrKavita123!",
      name: "Dr. Kavita Rao",
      slug: "dr-kavita-rao",
      bio: "Couples and family therapist integrating Gottman-informed methods with culturally grounded relational counselling for Indian families.",
      feeMinor: 140000,
      commissionBps: 3200, // negotiated override
      status: "APPROVED",
      photo: PHOTO("1594824476967-48c8b964273f"),
      weight: 1.8,
      activeFromDay: -Math.round(HISTORY_DAYS * 0.7),
      activeToDay: FUTURE_DAYS,
      schedule: { days: [1, 2, 3, 4], hours: [10, 11, 13, 14, 15] },
    },
    {
      email: "vikram@madhumaticlinic.com",
      password: "DrVikram123!",
      name: "Dr. Vikram Nair",
      slug: "dr-vikram-nair",
      bio: "Early-career counselling psychologist focused on career transitions, academic stress, and young-adult identity work. Recently joined the practice part-time.",
      feeMinor: 110000,
      commissionBps: null, // platform default
      status: "APPROVED",
      photo: PHOTO("1607990281513-2c110a25bd8c"),
      weight: 1,
      activeFromDay: -Math.round(HISTORY_DAYS * 0.35),
      activeToDay: FUTURE_DAYS,
      schedule: { days: [2, 3, 4, 5], hours: [14, 15, 16] },
    },
    {
      email: "meera@madhumaticlinic.com",
      password: "DrMeera123!",
      name: "Dr. Meera Iyengar",
      slug: "dr-meera-iyengar",
      bio: "Formerly practiced trauma-informed group therapy at the clinic. Account retained for historical records; currently suspended from new bookings.",
      feeMinor: 135000,
      commissionBps: null,
      status: "SUSPENDED",
      photo: PHOTO("1622253692010-333f2da6031d"),
      weight: 1.4,
      activeFromDay: -HISTORY_DAYS,
      activeToDay: -50, // stopped taking sessions 50 days ago
      schedule: { days: [1, 2, 3, 4, 5], hours: [9, 10, 11, 13, 14] },
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
      photo: PHOTO("1580489944761-15a19d654956"),
      weight: 0, // not yet bookable
      activeFromDay: 0,
      activeToDay: 0,
      schedule: { days: [], hours: [] },
    },
  ];

  const therapists = [];
  const userRows = [];
  const therapistRows = [];
  const therapistCommissionRows = [];
  for (const spec of consultantSpecs) {
    let userId = null;
    if (spec.email) {
      userId = randomUUID();
      userRows.push({
        id: userId,
        email: spec.email,
        passwordHash: await bcrypt.hash(spec.password, 10),
        role: "THERAPIST",
      });
    }
    const therapistId = randomUUID();
    therapistRows.push({
      id: therapistId,
      userId,
      name: spec.name,
      slug: spec.slug,
      bio: spec.bio,
      feeMinor: spec.feeMinor,
      commissionBps: spec.commissionBps,
      status: spec.status,
      isActive: spec.status === "APPROVED",
      photo: spec.photo,
    });
    if (spec.commissionBps != null) {
      therapistCommissionRows.push({
        scope: "THERAPIST",
        therapistId,
        commissionBps: spec.commissionBps,
        effectiveFrom: COMMISSION_ERAS[0].effectiveFrom,
        createdById: adminUser.id,
      });
    }
    therapists.push({ id: therapistId, userId, ...spec });
  }
  await insertMany(prisma.user, userRows);
  await insertMany(prisma.therapist, therapistRows);
  await insertMany(prisma.commissionSetting, therapistCommissionRows);

  // Bookable roster: those with a real schedule (excludes the pending applicant).
  const bookableTherapists = therapists.filter((t) => t.weight > 0);
  const totalWeight = bookableTherapists.reduce((s, t) => s + t.weight, 0);

  // ── Weekly availability per consultant's own schedule ─────────────────
  const availabilityRows = [];
  for (const therapist of therapists) {
    for (const day of therapist.schedule.days) {
      for (const hour of therapist.schedule.hours) {
        availabilityRows.push({
          therapistId: therapist.id,
          dayOfWeek: day,
          startTime: `${String(hour).padStart(2, "0")}:00`,
          endTime: `${String(hour + 1).padStart(2, "0")}:00`,
        });
      }
    }
  }
  await insertMany(prisma.therapistAvailability, availabilityRows);

  // ── Unavailability blocks (leave) for a couple of consultants ─────────
  const rohan = therapists.find((t) => t.slug === "dr-rohan-gupta");
  const kavita = therapists.find((t) => t.slug === "dr-kavita-rao");
  await prisma.slotBlock.createMany({
    data: [
      { therapistId: rohan.id, startAt: addDays(now, -25), endAt: addDays(now, -20), reason: "Annual leave" },
      { therapistId: kavita.id, startAt: addDays(now, 5), endAt: addDays(now, 7), reason: "Conference travel" },
    ],
  });

  // ── Clients registered over the operating history ────────────────────
  const firstNames = [
    "Amit", "Neha", "Rahul", "Sneha", "Vikram", "Priya", "Arjun", "Kavya", "Rohit", "Ishita",
    "Sanjay", "Divya", "Karan", "Meera", "Aditya", "Pooja", "Nikhil", "Ritu", "Ananya", "Varun",
    "Simran", "Aarav", "Tanvi", "Yash", "Riya", "Dev", "Anjali", "Siddharth", "Kritika", "Manish",
    "Shreya", "Gaurav", "Nisha", "Ravi", "Payal", "Harsh", "Swati", "Abhishek", "Deepika", "Rajesh",
    "Komal", "Suresh", "Anita", "Vinay", "Preeti", "Ajay", "Sunita", "Mohit", "Kiran", "Lakshmi",
  ];
  const lastNames = [
    "Patel", "Joshi", "Verma", "Kulkarni", "Malhotra", "Nair", "Reddy", "Sharma", "Desai", "Bose",
    "Menon", "Pillai", "Kapoor", "Krishnan", "Rao", "Hegde", "Bansal", "Agarwal", "Iyer", "Chauhan",
  ];
  // Build a wider roster of uniquely-named clients (deterministic via the
  // seeded PRNG) so the client-growth chart, Clients register, and the pool
  // that bookings draw from all read as a real, sizeable practice.
  const CLIENT_COUNT = 96;
  const clientNames = [];
  const usedNames = new Set();
  while (clientNames.length < CLIENT_COUNT) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    clientNames.push(name);
  }

  const clients = [];
  const usedEmails = new Set();
  for (const name of clientNames) {
    const createdAt = addDays(now, -Math.floor(rand() * (HISTORY_DAYS + 10)));
    createdAt.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
    // A registration stamped "today" must not land later than the current
    // clock — no row in the database may carry a future timestamp.
    if (createdAt > now) createdAt.setTime(nowMs - Math.floor(rand() * 4 * 3600000));
    let email = name.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com";
    if (usedEmails.has(email)) email = email.replace("@", `.${clients.length}@`);
    usedEmails.add(email);
    clients.push({
      id: randomUUID(),
      name,
      email,
      phone: `+9198${String(10000000 + Math.floor(rand() * 89999999))}`,
      dob: `19${70 + Math.floor(rand() * 30)}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 27)).padStart(2, "0")}`,
      emergencyContact: `Family contact (+9199${String(10000000 + Math.floor(rand() * 89999999))})`,
      gdprConsent: true,
      createdAt,
    });
  }
  await insertMany(prisma.client, clients);
  console.log(`  consultants + ${clients.length} clients ready`);

  // ── Bookings across the full operating history ────────────────────────
  // Everything is built in memory first, then bulk-inserted. Ledger postings
  // mirror src/server/domain/postings.ts exactly.
  const year = now.getFullYear();
  const usedSlots = new Set(); // therapistId|iso
  const counters = { total: 0, completed: 0, refunded: 0, cancelled: 0, noShow: 0, upcoming: 0 };

  const bookingRows = [];
  const statusHistoryRows = [];
  const slotRows = [];
  const paymentRows = [];
  const ledgerRows = [];

  function recordChargeSuccess(booking, therapistId, when) {
    const invoiceNumber = invoiceNumberFor(booking.id, year);
    const paymentId = randomUUID();
    paymentRows.push({
      id: paymentId,
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
    });
    const split = splitPayment({
      grossMinor: booking.amountMinor,
      discountMinor: booking.discountMinor,
      commissionBps: booking.commissionBps,
    });
    const base = { bookingId: booking.id, paymentRecordId: paymentId, createdAt: when };
    ledgerRows.push(
      { ...base, entryType: "GROSS_REVENUE", amountMinor: booking.amountMinor, description: `Gross booking amount collected (${invoiceNumber})` },
      ...(booking.discountMinor > 0
        ? [{ ...base, entryType: "DISCOUNT", amountMinor: -booking.discountMinor, description: `Discount applied (${invoiceNumber})` }]
        : []),
      { ...base, entryType: "COMMISSION_ACCRUED", amountMinor: split.commissionMinor, therapistId, description: `Consultant commission accrued at ${booking.commissionBps / 100}% (${invoiceNumber})` },
      { ...base, entryType: "PLATFORM_REVENUE", amountMinor: split.platformMinor, description: `Platform share recognised (${invoiceNumber})` }
    );
    return { split, invoiceNumber };
  }

  function recordRefund(bookingId, therapistId, split, when, reason) {
    const refundMinor = split.netMinor;
    const refundId = randomUUID();
    paymentRows.push({
      id: refundId,
      bookingId,
      provider: "manual",
      kind: "REFUND",
      amountMinor: refundMinor,
      status: "SUCCEEDED",
      providerPaymentId: `manual_rf_${bookingId.slice(0, 12)}`,
      idempotencyKey: `refund:${bookingId}:${refundMinor}`,
      createdAt: when,
      updatedAt: when,
    });
    const base = { bookingId, paymentRecordId: refundId, createdAt: when };
    ledgerRows.push(
      { ...base, entryType: "REFUND", amountMinor: -refundMinor, description: `Refund issued — ${reason}` },
      { ...base, entryType: "COMMISSION_REVERSED", amountMinor: -split.commissionMinor, therapistId, description: `Consultant commission reversed on refund` },
      { ...base, entryType: "PLATFORM_REVENUE_REVERSED", amountMinor: -split.platformMinor, description: `Platform share reversed on refund` }
    );
    adminAudit("payment.refund_executed", "Booking", bookingId, { refundMinor, reason }, when);
  }

  for (let dayOffset = -HISTORY_DAYS; dayOffset <= FUTURE_DAYS; dayOffset++) {
    const day = addDays(now, dayOffset);
    day.setHours(0, 0, 0, 0);
    const dayOfWeek = day.getDay();

    // Which consultants are actually operating on this calendar day.
    const eligible = bookableTherapists.filter(
      (t) => dayOffset >= t.activeFromDay && dayOffset <= t.activeToDay && t.schedule.days.includes(dayOfWeek)
    );
    if (eligible.length === 0) continue;

    // Daily volume: a baseline that rises over time and scales with how much
    // of the roster is open, plus mild day-to-day variance and a floor so no
    // operating day lands empty. Future days taper down (appointments fill up
    // as the date nears), keeping the upcoming book realistic. The result is a
    // dense, steadily-growing history so every ledger-backed chart and KPI
    // reads as a busy practice rather than a sparse scatter.
    const growth = (dayOffset + HISTORY_DAYS) / (HISTORY_DAYS + FUTURE_DAYS);
    const capacityFactor = eligible.reduce((s, t) => s + t.weight, 0) / totalWeight;
    const futureTaper = dayOffset > 0 ? Math.max(0.35, 1 - dayOffset / (FUTURE_DAYS * 1.5)) : 1;
    const baseline = (2.5 + growth * 4) * (0.5 + 0.5 * capacityFactor) * futureTaper;
    const bookingsToday = Math.max(2, Math.round(baseline * (0.75 + rand() * 0.5)));

    for (let i = 0; i < bookingsToday; i++) {
      const therapist = weightedPick(eligible.map((t) => ({ item: t, weight: t.weight })));
      const hour = pick(therapist.schedule.hours);
      const startAt = new Date(day);
      startAt.setHours(hour, 0, 0, 0);
      const slotKey = `${therapist.id}|${startAt.toISOString()}`;
      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);

      // Skip if this slot falls inside one of the seeded unavailability blocks.
      const blocked =
        (therapist.slug === "dr-rohan-gupta" && startAt >= addDays(now, -25) && startAt < addDays(now, -20)) ||
        (therapist.slug === "dr-kavita-rao" && startAt >= addDays(now, 5) && startAt < addDays(now, 7));
      if (blocked) continue;

      const service = pick(services);
      const eligibleClients = clients.filter((c) => c.createdAt <= startAt);
      if (eligibleClients.length === 0) continue;
      const client = pick(eligibleClients);
      const commissionBps = therapist.commissionBps ?? defaultBpsAt(startAt);
      const discountMinor = rand() < 0.12 ? 10000 : 0; // occasional ₹100 goodwill discount

      const createdAt = new Date(startAt);
      createdAt.setDate(createdAt.getDate() - (1 + Math.floor(rand() * 6)));
      createdAt.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);
      // Upcoming sessions are booked in the recent past — a booking (and the
      // payment stamped at booking time) must never be dated in the future.
      // Spread over the trailing ten days so the created-per-day chart stays
      // smooth instead of spiking at the seed date.
      if (createdAt > now) {
        createdAt.setTime(nowMs - (1 + Math.floor(rand() * 240)) * 3600000);
      }
      if (createdAt < client.createdAt) createdAt.setTime(client.createdAt.getTime() + 3600000);
      if (createdAt >= startAt || createdAt > now) continue; // guard against pathological clamping

      const isPast = startAt.getTime() < nowMs;
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
      const charged = paidUpfront || (status === "COMPLETED" && rand() < 0.9);

      const bookingId = randomUUID();
      let finalStatus = status;
      let paymentStatus = "UNPAID";
      let invoiceNumber = null;

      let split = null;
      if (charged) {
        const paidAt = paidUpfront ? createdAt : new Date(startAt.getTime() + 3600000);
        const result = recordChargeSuccess(
          { id: bookingId, amountMinor: service.priceMinor, discountMinor, commissionBps },
          therapist.id,
          paidAt
        );
        split = result.split;
        paymentStatus = "PAID";
        invoiceNumber = result.invoiceNumber;
      }

      // Initial status-history row (fromStatus null → booked).
      statusHistoryRows.push({
        bookingId,
        fromStatus: null,
        toStatus: paidUpfront ? "CONFIRMED" : status === "REFUNDED" ? "CONFIRMED" : status,
        actorType: "CLIENT",
        reason: paidUpfront ? "Booked and paid online" : "Booked with pay-at-clinic",
        createdAt,
      });

      // Slot hold rows for statuses that keep the calendar occupied.
      if (["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"].includes(status)) {
        slotRows.push({ therapistId: therapist.id, startAt, bookingId });
      }

      if (status === "REFUNDED" && split) {
        // Never earlier than the charge it reverses.
        const refundAt = new Date(Math.max(startAt.getTime() - 24 * 3600000, createdAt.getTime() + 2 * 3600000));
        statusHistoryRows.push(
          { bookingId, fromStatus: "CONFIRMED", toStatus: "REFUND_PENDING", actorType: "CLIENT", reason: "Client cancelled paid session", createdAt: refundAt },
          { bookingId, fromStatus: "REFUND_PENDING", toStatus: "REFUNDED", actorType: "ADMIN", actorId: adminUser.id, reason: "Refund executed", createdAt: refundAt }
        );
        recordRefund(bookingId, therapist.id, split, refundAt, "client cancellation");
        finalStatus = "REFUNDED";
        paymentStatus = "REFUNDED";
        counters.refunded++;
      } else if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(status)) {
        const transitionedAt = new Date(startAt.getTime() + (status === "CANCELLED" ? -20 * 3600000 : 2 * 3600000));
        statusHistoryRows.push({
          bookingId,
          fromStatus: "CONFIRMED",
          toStatus: status,
          actorType: status === "CANCELLED" ? "CLIENT" : "THERAPIST",
          reason: status === "CANCELLED" ? "Cancelled ahead of the 12h window" : null,
          createdAt: transitionedAt,
        });
        if (status === "CANCELLED") counters.cancelled++;
        if (status === "NO_SHOW") counters.noShow++;
        if (status === "COMPLETED") counters.completed++;
      }

      bookingRows.push({
        id: bookingId,
        therapistId: therapist.id,
        serviceId: service.id,
        clientId: client.id,
        dateTime: startAt,
        durationMinutes: service.durationMinutes,
        amountMinor: service.priceMinor,
        discountMinor,
        commissionBps,
        status: finalStatus,
        paymentStatus,
        invoiceNumber,
        createdAt,
        updatedAt: createdAt,
      });

      if (!isPast) counters.upcoming++;
      counters.total++;
    }
  }

  // Bulk insert in FK-safe order: bookings, then their payments, then the
  // child rows that reference both.
  await insertMany(prisma.booking, bookingRows);
  await insertMany(prisma.paymentRecord, paymentRows);
  await insertMany(prisma.bookingSlot, slotRows);
  await insertMany(prisma.bookingStatusHistory, statusHistoryRows);
  await insertMany(prisma.ledgerEntry, ledgerRows);
  console.log(`  ${bookingRows.length} bookings + ${ledgerRows.length} ledger entries written`);

  // ── Payouts: multi-cycle settlement per consultant ────────────────────
  // Walks ~30-day cutoffs from each consultant's first earning up to
  // (today - 30 days), settling whatever had accrued by each cutoff, then
  // leaves half of the remaining unsettled balance as a queued PENDING
  // payout — so the payout register shows a real multi-month history
  // instead of a single lump sum. Derived from the in-memory ledger rows.
  const commissionByTherapist = new Map();
  for (const e of ledgerRows) {
    if ((e.entryType === "COMMISSION_ACCRUED" || e.entryType === "COMMISSION_REVERSED") && e.therapistId) {
      if (!commissionByTherapist.has(e.therapistId)) commissionByTherapist.set(e.therapistId, []);
      commissionByTherapist.get(e.therapistId).push({ createdAt: e.createdAt, amountMinor: e.amountMinor });
    }
  }

  const payoutRows = [];
  const payoutLedgerRows = [];
  for (const therapist of therapists) {
    const entries = (commissionByTherapist.get(therapist.id) || [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (entries.length === 0) continue;

    const cutoffs = [];
    let cursor = addDays(entries[0].createdAt, 30);
    const lastCutoff = addDays(now, -30);
    while (cursor < lastCutoff) {
      cutoffs.push(new Date(cursor));
      cursor = addDays(cursor, 30);
    }

    let paidSoFar = 0;
    for (const cutoff of cutoffs) {
      const earnedByCutoff = entries
        .filter((e) => e.createdAt <= cutoff)
        .reduce((sum, e) => sum + e.amountMinor, 0);
      const toPay = earnedByCutoff - paidSoFar;
      if (toPay <= 0) continue;

      const payoutId = randomUUID();
      const reference = `NEFT${String(100000 + Math.floor(rand() * 899999))}`;
      payoutRows.push({
        id: payoutId,
        therapistId: therapist.id,
        amountMinor: toPay,
        status: "PAID",
        method: "BANK_TRANSFER",
        reference,
        initiatedById: adminUser.id,
        paidAt: cutoff,
        createdAt: addDays(cutoff, -2),
        updatedAt: cutoff,
      });
      payoutLedgerRows.push({
        entryType: "PAYOUT_PAID",
        amountMinor: -toPay,
        therapistId: therapist.id,
        payoutId,
        description: `Payout settled (ref ${reference})`,
        createdAt: cutoff,
      });
      adminAudit("payout.create", "Payout", payoutId, { therapistId: therapist.id, amountMinor: toPay }, addDays(cutoff, -2));
      adminAudit("payout.paid", "Payout", payoutId, { from: "PENDING", to: "PAID", reference }, cutoff);
      paidSoFar += toPay;
    }

    const earnedTotal = entries.reduce((sum, e) => sum + e.amountMinor, 0);
    const payable = earnedTotal - paidSoFar;
    if (payable > 0) {
      const pendingAmount = Math.round(payable * 0.5);
      if (pendingAmount > 0) {
        const pendingId = randomUUID();
        payoutRows.push({
          id: pendingId,
          therapistId: therapist.id,
          amountMinor: pendingAmount,
          status: "PENDING",
          method: "BANK_TRANSFER",
          note: "Fortnightly settlement run",
          initiatedById: adminUser.id,
          createdAt: now,
          updatedAt: now,
        });
        adminAudit("payout.create", "Payout", pendingId, { therapistId: therapist.id, amountMinor: pendingAmount }, now);
      }
    }
  }
  await insertMany(prisma.payout, payoutRows);
  await insertMany(prisma.ledgerEntry, payoutLedgerRows);

  // Journal the roster action behind Dr. Meera's suspension 50 days ago.
  const meera = therapists.find((t) => t.slug === "dr-meera-iyengar");
  if (meera) {
    adminAudit("consultant.update", "Therapist", meera.id, { changed: ["status", "isActive"] }, addDays(now, -50));
  }

  await insertMany(prisma.auditLog, auditRows);
  console.log(`  ${payoutRows.length} payouts + ${auditRows.length} audit entries written`);

  // ── Testimonials ──────────────────────────────────────────────────────
  await prisma.testimonial.createMany({
    data: [
      { clientName: "Aarav Sharma", quote: "The environment is calm and feels like a sanctuary. Dr. Madhumati helped me reconcile long-standing emotional challenges through mindful, evidence-based steps.", status: "APPROVED", rating: 5 },
      { clientName: "Priyanka Roy", quote: "Dr. Rohan's somatic practices changed how I handle work-related stress. The physical deceleration exercises have had a lasting impact on my day-to-day life.", status: "APPROVED", rating: 5 },
      { clientName: "Vikram Malhotra", quote: "Incredibly professional and highly secure. The booking system was clean, and my session notes are locked down. Absolute privacy.", status: "APPROVED", rating: 5 },
      { clientName: "Rhea Kapadia", quote: "Dr. Kavita helped my partner and I rebuild trust with structured, compassionate guidance. We finally feel heard.", status: "APPROVED", rating: 5 },
      { clientName: "Nikhil Bansal", quote: "Dr. Vikram made career anxiety feel manageable again. Practical, grounded, and never judgmental.", status: "APPROVED", rating: 4 },
    ],
  });

  console.log(`Consultants: ${therapists.length} (${bookableTherapists.length} bookable)`);
  console.log(`Clients: ${clients.length}`);
  console.log(`Bookings created: ${counters.total}`);
  const totals = await prisma.booking.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("Bookings by status:", Object.fromEntries(totals.map((t) => [t.status, t._count._all])));
  const ledgerTotal = await prisma.ledgerEntry.count();
  console.log(`Ledger entries: ${ledgerTotal}`);
  const payoutTotals = await prisma.payout.groupBy({ by: ["status"], _count: { _all: true } });
  console.log("Payouts by status:", Object.fromEntries(payoutTotals.map((p) => [p.status, p._count._all])));
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
