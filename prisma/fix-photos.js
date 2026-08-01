/**
 * Point the database's consultant and service images at the real clinic
 * photos in /public/team.
 *
 * The catalogue and the consultant roster are database-driven, so editing
 * seed.js only affects a *fresh* seed — an already-seeded database keeps
 * serving whatever image URL it was created with. This script updates those
 * rows in place.
 *
 * Non-destructive: it only writes the `photo` / `image` columns on rows that
 * already exist, and skips anything it can't find. Bookings, clients and the
 * ledger are untouched.
 *
 *   node prisma/fix-photos.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/** Consultant slug -> portrait in /public. */
const CONSULTANT_PHOTOS = {
  "dr-madhumati-dhumak": "/team/madhumati-dhumak.jpg",
};

/**
 * Service slug -> the room that service actually happens in, so the picture
 * carries meaning instead of being decoration:
 *   individual  -> the single-armchair corner
 *   couples     -> the sofa-and-armchair room that seats several people
 *   career      -> the study wall of psychology books
 */
const SERVICE_IMAGES = {
  "individual-therapy": "/team/office1.jpg",
  "individual-counselling": "/team/office1.jpg",
  "couples-counseling": "/team/office2.jpg",
  "couple-family-counselling": "/team/office2.jpg",
  "career-academic-counselling": "/team/office6.jpg",
};

async function main() {
  for (const [slug, photo] of Object.entries(CONSULTANT_PHOTOS)) {
    const result = await prisma.therapist.updateMany({
      where: { slug },
      data: { photo },
    });
    console.log(
      result.count
        ? `Consultant "${slug}" -> ${photo}`
        : `Consultant "${slug}" not found — skipped.`,
    );
  }

  for (const [slug, image] of Object.entries(SERVICE_IMAGES)) {
    const result = await prisma.service.updateMany({
      where: { slug },
      data: { image },
    });
    console.log(
      result.count
        ? `Service "${slug}" -> ${image}`
        : `Service "${slug}" not found — skipped.`,
    );
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
