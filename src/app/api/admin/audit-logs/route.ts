import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  handleApi,
  paginated,
  parsePagination,
  requireAdmin,
} from "@/server/http";

export const GET = handleApi(async (request: Request) => {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams, 30);

  const where: Prisma.AuditLogWhereInput = {};
  const entityType = searchParams.get("entityType");
  if (entityType) where.entityType = entityType;
  const entityId = searchParams.get("entityId");
  if (entityId) where.entityId = entityId;
  const action = searchParams.get("action");
  if (action) where.action = { contains: action };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return NextResponse.json(paginated(logs, total, pagination));
});
