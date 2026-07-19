import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, handleApi, notFound } from "@/server/http";

// Public consultant directory for the booking flow. Given a service slug,
// returns the APPROVED, active consultants who offer that service, with the
// public-safe fields the wizard needs to render a chooser. No client data is
// exposed here — this is practitioner information only.

export const GET = handleApi(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const serviceSlug = searchParams.get("service");
  if (!serviceSlug) throw badRequest("A service slug is required");

  const service = await prisma.service.findUnique({
    where: { slug: serviceSlug },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!service || !service.isActive) throw notFound("Service not found");

  const consultants = await prisma.therapist.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      services: { some: { id: service.id } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      photo: true,
      bio: true,
      feeMinor: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    service: { name: service.name, slug: service.slug },
    consultants,
  });
});
