import React from "react";
import { prisma } from "@/lib/db";
import BookingWizard from "@/components/BookingWizard";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }) {
  const sParams = await searchParams;
  const initialService = sParams.service || "";

  // Only services that at least one approved, active consultant offers are
  // bookable — otherwise the consultant step would dead-end.
  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      therapists: { some: { status: "APPROVED", isActive: true } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      priceMinor: true,
      durationMinutes: true,
      description: true,
    },
  });

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-6 md:px-12 py-28">
      <BookingWizard services={services} initialService={initialService} />
    </main>
  );
}
