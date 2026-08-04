// One-time, idempotent production maintenance script for the requested
// admin/consultant login addresses. It deliberately preserves password hashes.
// Run with: node prisma/update-login-emails.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
    if (!admin) throw new Error("No admin user found");
    await tx.user.update({ where: { id: admin.id }, data: { email: "admin@thebraintea.co.in" } });

    const madhumati = await tx.therapist.findUnique({
      where: { slug: "dr-madhumati-dhumak" },
      select: { userId: true },
    });
    if (!madhumati?.userId) throw new Error("Madhumati's linked login was not found");
    await tx.user.update({
      where: { id: madhumati.userId },
      data: { email: "madhumatidhumak@thebraintea.co.in" },
    });
  });
  console.log("Updated the admin and Madhumati login email addresses.");
}

main().finally(() => prisma.$disconnect());
