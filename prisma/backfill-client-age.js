/**
 * Backfill Client.age from the legacy Client.dob column.
 *
 * The site no longer collects date of birth (forms now capture age
 * directly), so `dob` was made nullable and `age` added alongside it rather
 * than dropping the column outright — existing client rows keep their
 * historical dob until this script has had a chance to derive their age
 * from it. Safe to run against a live database with real bookings.
 *
 * Idempotent: only touches rows where age is still null and dob is set, so
 * running it more than once (or after new dob-less clients have signed up)
 * is harmless.
 *
 *   node prisma/backfill-client-age.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function ageFromDob(dobString) {
  const dob = new Date(`${dobString}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const hadBirthdayThisYear =
    today.getUTCMonth() > dob.getUTCMonth() ||
    (today.getUTCMonth() === dob.getUTCMonth() &&
      today.getUTCDate() >= dob.getUTCDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

async function main() {
  const candidates = await prisma.client.findMany({
    where: { age: null, dob: { not: null } },
    select: { id: true, dob: true },
  });

  let updated = 0;
  let skipped = 0;
  for (const client of candidates) {
    const age = ageFromDob(client.dob);
    if (age == null || age < 0 || age > 130) {
      console.warn(`Skipping client ${client.id}: unparseable dob "${client.dob}"`);
      skipped++;
      continue;
    }
    await prisma.client.update({ where: { id: client.id }, data: { age } });
    updated++;
  }

  console.log(
    `Backfilled age for ${updated} client(s); skipped ${skipped}; ${candidates.length} candidate(s) total.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to backfill client ages:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
