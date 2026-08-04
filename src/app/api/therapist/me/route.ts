import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi, notFound, requireTherapist } from "@/server/http";
import { getDefaultCommissionBps } from "@/server/services/commissionService";

export const GET = handleApi(async (request: Request) => {
  const { session, therapistId } = await requireTherapist(request);

  const therapist = await prisma.therapist.findUnique({
    where: { id: therapistId },
    include: { user: { select: { email: true } } },
  });
  if (!therapist) throw notFound("Consultant profile not found");

  const defaultBps = await getDefaultCommissionBps();

  return NextResponse.json({
    user: session,
    consultant: {
      id: therapist.id,
      name: therapist.name,
      email: therapist.user?.email ?? session.email,
      slug: therapist.slug,
      photo: therapist.photo,
      bio: therapist.bio,
      feeMinor: therapist.feeMinor,
      status: therapist.status,
      commissionBps: therapist.commissionBps,
      effectiveCommissionBps: therapist.commissionBps ?? defaultBps,
    },
  });
});
