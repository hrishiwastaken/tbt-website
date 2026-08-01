/**
 * Create (or repair) the reception desk login, without touching any other
 * data.
 *
 * `prisma/seed.js` wipes and rebuilds the whole database, which is slow
 * against a remote Postgres and destroys existing bookings. This script is
 * the surgical alternative when all you need is the front-desk account —
 * e.g. after seeding from a checkout that predates the reception panel.
 *
 * Idempotent: upserts on email, so running it twice is harmless and it also
 * repairs a wrong password or role on an existing row.
 *
 *   node prisma/create-receptionist.js
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const EMAIL = process.env.RECEPTION_EMAIL || "reception@thebraintea.com";
const PASSWORD = process.env.RECEPTION_PASSWORD || "ReceptionPass123!";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, role: "RECEPTIONIST" },
    create: { email: EMAIL, passwordHash, role: "RECEPTIONIST" },
  });

  console.log(`Reception login ready → ${user.email} (role: ${user.role})`);
  console.log(`Sign in at /admin/login with the password you configured.`);
}

main()
  .catch((error) => {
    console.error("Failed to create the reception login:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
