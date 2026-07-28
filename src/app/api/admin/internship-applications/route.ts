import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, requireAdmin, parsePagination, paginated } from "@/server/http";

// Internship applications submitted via the public /internship page.
// Resume bytes are intentionally excluded here — fetched separately via
// the [id]/resume route so the list stays light.

export const GET = handleApi(async (request: Request) => {
  await requireAdmin(request);

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams, 20);

  const [items, total] = await Promise.all([
    prisma.internshipApplication.findMany({
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        college: true,
        course: true,
        yearOrSemester: true,
        internshipType: true,
        preferredStart: true,
        statementOfPurpose: true,
        resumeFileName: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.internshipApplication.count(),
  ]);

  return NextResponse.json(paginated(items, total, pagination));
});
