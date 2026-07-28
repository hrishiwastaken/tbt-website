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
  await prisma.service.update({
    where: { slug: "somatic-experiencing" },
    data: { availability: ["Online", "Offline"] },
  });
  console.log("Service details updated: couples/career durations -> 50, somatic-experiencing -> Online + Offline.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
