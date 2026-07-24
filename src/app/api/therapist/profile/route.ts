import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { comparePasswords, hashPassword } from "@/lib/auth";
import {
  badRequest,
  forbidden,
  handleApi,
  requireTherapist,
} from "@/server/http";
import { recordAudit } from "@/server/audit";

// A consultant may edit their own bio/photo and change their password.
// Fee and commission are financial terms set by admin only (see
// /api/admin/consultants/[id]).

const patchSchema = z.object({
  bio: z.string().min(1).max(5000).optional(),
  photo: z.string().url().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(10).max(100).optional(),
});

export const PATCH = handleApi(async (request: Request) => {
  const { session, therapistId } = await requireTherapist(request);
  const body = patchSchema.parse(await request.json());

  if (body.newPassword && !body.currentPassword) {
    throw badRequest("Current password is required to set a new password");
  }

  await prisma.$transaction(async (tx) => {
    const profileData: Record<string, unknown> = {};
    if (body.bio !== undefined) profileData.bio = body.bio;
    if (body.photo !== undefined) profileData.photo = body.photo;
    if (Object.keys(profileData).length > 0) {
      await tx.therapist.update({
        where: { id: therapistId },
        data: profileData,
      });
    }

    if (body.newPassword && body.currentPassword) {
      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw forbidden();
      const valid = await comparePasswords(
        body.currentPassword,
        user.passwordHash,
      );
      if (!valid) throw badRequest("Current password is incorrect");
      await tx.user.update({
        where: { id: session.userId },
        data: { passwordHash: await hashPassword(body.newPassword) },
      });
    }

    await recordAudit(
      {
        session,
        action: "consultant.update_own_profile",
        entityType: "Therapist",
        entityId: therapistId,
        detail: {
          changed: Object.keys(body).filter(
            (k) => k !== "currentPassword" && k !== "newPassword",
          ),
        },
      },
      tx,
    );
  });

  const updated = await prisma.therapist.findUnique({
    where: { id: therapistId },
  });
  return NextResponse.json({ consultant: updated });
});
