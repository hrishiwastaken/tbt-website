/**
 * Permanently remove a service from the public site, by name or slug
 * fragment (case-insensitive).
 *
 * The service catalogue is database-driven (see prisma/schema.prisma), so
 * removing a mention of a service from the source code does not delete an
 * already-seeded row — this script is the cleanup step for that.
 *
 * Behaviour:
 *   - Disconnects the service from every consultant who offers it (so it
 *     also stops appearing on a consultant's "services offered" list).
 *   - If no booking ever referenced it, deletes the row outright.
 *   - If bookings DO reference it (real history that must not be deleted),
 *     it is instead deactivated (isActive: false), which is enough to
 *     remove it from every public page and API — the services list, the
 *     service detail page, and the booking flow's consultant picker all
 *     already filter on isActive — while preserving that booking history.
 *
 *   node prisma/remove-service.js "somatic"
 *   node prisma/remove-service.js somatic-experiencing
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error('Usage: node prisma/remove-service.js "<name or slug fragment>"');
    process.exitCode = 1;
    return;
  }

  const matches = await prisma.service.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { _count: { select: { bookings: true } } },
  });

  if (matches.length === 0) {
    console.log(`No service matching "${query}" was found — nothing to do.`);
    return;
  }

  for (const service of matches) {
    console.log(`Found: "${service.name}" (slug: ${service.slug}, id: ${service.id})`);

    // Stop it appearing on any consultant's "services offered" list.
    await prisma.service.update({
      where: { id: service.id },
      data: { therapists: { set: [] } },
    });

    if (service._count.bookings === 0) {
      await prisma.service.delete({ where: { id: service.id } });
      console.log(`  -> deleted permanently (no booking history referenced it).`);
    } else {
      await prisma.service.update({
        where: { id: service.id },
        data: { isActive: false },
      });
      console.log(
        `  -> ${service._count.bookings} booking(s) reference this service, so the row ` +
          `was kept for that history but deactivated. It is now hidden from every ` +
          `public page (services list, service detail, booking flow) and from ` +
          `consultant profiles.`,
      );
    }
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
