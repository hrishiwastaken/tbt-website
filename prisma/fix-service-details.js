/**
 * One-off, non-destructive correction for the three service-catalogue fixes
 * below. Unlike seed.js (which wipes and rebuilds the whole database), this
 * only updates specific fields on specific existing rows by slug — safe to
 * run once against a live database that already has real bookings/clients.
 *
 * Usage: node prisma/fix-service-details.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.service.update({
    where: { slug: "couples-counseling" },
    data: { durationMinutes: 50 },
  });
  await prisma.service.update({
    where: { slug: "career-academic-counselling" },
    data: { durationMinutes: 50 },
  });
  // Deactivated rather than deleted: Booking.serviceId is a required,
  // non-cascading FK, so hard-deleting a service with any booking history
  // against it would fail (or orphan data if it didn't). isActive: false
  // is what the public services pages already filter on, so this removes
  // it from the site without touching past bookings.
  await prisma.service.updateMany({
    where: { slug: "somatic-experiencing" },
    data: { isActive: false },
  });
  console.log("Service details updated: couples/career durations -> 50, somatic-experiencing deactivated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
