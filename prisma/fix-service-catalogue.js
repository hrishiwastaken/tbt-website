/**
 * Bring a live database's service catalogue in line with what the clinic
 * actually offers:
 *
 *   - Individual Therapy
 *   - Couples & Family Therapy
 *   - Career & Academic Counselling
 *
 * ...and nothing else. Every session is a standard 45-50 minute slot, so all
 * surviving services are normalised to 50 minutes.
 *
 * Why this exists: the catalogue is database-driven, so editing seed.js does
 * not change a database that was already seeded — a stale row (e.g. "Somatic
 * Experiencing" or "Mental Health Assessment") keeps rendering on /services
 * until it is removed here. Unlike seed.js this is non-destructive: it only
 * touches Service rows, never bookings, clients or the ledger.
 *
 * Anything not on the keep-list is disconnected from every consultant and
 * then either deleted (if no booking ever referenced it) or deactivated (if
 * bookings exist, so that history is preserved). isActive:false is already
 * the filter used by the services list, the service detail page, the public
 * consultant picker and the admin service dropdown, so a deactivated row is
 * invisible everywhere a client or staff member could pick it.
 *
 * Usage: node prisma/fix-service-catalogue.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/** Standard session length for every service the clinic runs. */
const SESSION_MINUTES = 50;

/**
 * Slugs that may remain. The first three are the public catalogue; the last
 * two are the canonical rows that admin/reception scheduling upserts per
 * counselling type (see src/server/domain/counselingType.ts) and which
 * existing staff-booked appointments point at — deleting those would orphan
 * real bookings.
 */
const KEEP_SLUGS = [
  "individual-therapy",
  "couples-counseling",
  "career-academic-counselling",
  "individual-counselling",
  "couple-family-counselling",
];

async function main() {
  const services = await prisma.service.findMany({
    include: { _count: { select: { bookings: true } } },
    orderBy: { slug: "asc" },
  });

  const unwanted = services.filter((s) => !KEEP_SLUGS.includes(s.slug));
  const keep = services.filter((s) => KEEP_SLUGS.includes(s.slug));

  if (unwanted.length === 0) {
    console.log("No unwanted services found.");
  }

  for (const service of unwanted) {
    // Also drop it from every consultant's "services offered" list.
    await prisma.service.update({
      where: { id: service.id },
      data: { therapists: { set: [] } },
    });

    if (service._count.bookings === 0) {
      await prisma.service.delete({ where: { id: service.id } });
      console.log(`Removed "${service.name}" (${service.slug}) — deleted, no bookings referenced it.`);
    } else {
      await prisma.service.update({
        where: { id: service.id },
        data: { isActive: false },
      });
      console.log(
        `Removed "${service.name}" (${service.slug}) — deactivated and hidden ` +
          `everywhere; kept because ${service._count.bookings} booking(s) reference it.`,
      );
    }
  }

  // Normalise session length on everything that remains.
  const needsDuration = keep.filter(
    (s) => s.durationMinutes !== SESSION_MINUTES,
  );
  for (const service of needsDuration) {
    await prisma.service.update({
      where: { id: service.id },
      data: { durationMinutes: SESSION_MINUTES },
    });
    console.log(
      `"${service.name}": duration ${service.durationMinutes} -> ${SESSION_MINUTES} minutes.`,
    );
  }
  if (needsDuration.length === 0) {
    console.log(`All remaining services are already ${SESSION_MINUTES} minutes.`);
  }

  const finalRows = await prisma.service.findMany({
    where: { isActive: true },
    select: { name: true, slug: true, durationMinutes: true },
    orderBy: { name: "asc" },
  });
  console.log("\nActive catalogue now:");
  for (const s of finalRows) {
    console.log(`  - ${s.name} (${s.slug}) — ${s.durationMinutes} minutes`);
  }
}

main()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
