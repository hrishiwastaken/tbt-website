/**
 * One-off correction for the platform default commission rate.
 *
 * CommissionSetting is an append-only history (see schema.prisma) — the
 * DEFAULT row with the latest effectiveFrom <= now wins, and past bookings
 * already snapshotted whatever rate was in effect when they were created.
 * So fixing an incorrect live default means inserting a new current row,
 * not editing the old one.
 *
 * Usage: node prisma/fix-commission-default.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.commissionSetting.create({
    data: {
      scope: "DEFAULT",
      commissionBps: 3000, // 30%
      effectiveFrom: new Date(),
    },
  });
  console.log("Platform default commission rate set to 30%, effective now.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
