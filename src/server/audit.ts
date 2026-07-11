import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Session } from "./http";

// Structured audit trail for admin/consultant actions. Pass `tx` to record
// atomically with the mutation it describes.

export interface AuditInput {
  session?: Session | null;
  action: string; // e.g. "booking.cancel"
  entityType: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  ip?: string;
}

export async function recordAudit(
  input: AuditInput,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorUserId: input.session?.userId ?? null,
      actorEmail: input.session?.email ?? null,
      actorRole: input.session?.role ?? "SYSTEM",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      detail: input.detail ? JSON.stringify(input.detail) : null,
      ip: input.ip ?? null,
    },
  });
}
