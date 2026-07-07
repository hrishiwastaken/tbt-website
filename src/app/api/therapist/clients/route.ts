import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, paginated, parsePagination, requireTherapist } from "@/server/http";

// A consultant's client list is derived from their own bookings — there is
// no direct Therapist->Client relation, so we go through distinct clientIds
// rather than exposing the full clinic roster.

export const GET = handleApi(async (request: Request) => {
  const { therapistId } = await requireTherapist(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams, 25);
  const q = searchParams.get("q")?.trim();

  const clientIdRows = await prisma.booking.findMany({
    where: { therapistId },
    select: { clientId: true },
    distinct: ["clientId"],
  });
  const clientIds = clientIdRows.map((r) => r.clientId);

  const where = {
    id: { in: clientIds },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.client.count({ where }),
  ]);

  // Per-client session stats scoped to this consultant only.
  const stats = await prisma.booking.groupBy({
    by: ["clientId", "status"],
    _count: { _all: true },
    where: { therapistId, clientId: { in: clients.map((c) => c.id) } },
  });
  const lastSeen = await prisma.booking.groupBy({
    by: ["clientId"],
    _max: { dateTime: true },
    where: { therapistId, clientId: { in: clients.map((c) => c.id) } },
  });
  const lastSeenMap = new Map(lastSeen.map((r) => [r.clientId, r._max.dateTime]));
  const statsMap = new Map<string, { total: number; completed: number }>();
  for (const row of stats) {
    const entry = statsMap.get(row.clientId) ?? { total: 0, completed: 0 };
    entry.total += row._count._all;
    if (row.status === "COMPLETED") entry.completed += row._count._all;
    statsMap.set(row.clientId, entry);
  }

  return NextResponse.json(
    paginated(
      clients.map((c) => ({
        ...c,
        sessionCount: statsMap.get(c.id)?.total ?? 0,
        completedCount: statsMap.get(c.id)?.completed ?? 0,
        lastSessionAt: lastSeenMap.get(c.id) ?? null,
      })),
      total,
      pagination
    )
  );
});
