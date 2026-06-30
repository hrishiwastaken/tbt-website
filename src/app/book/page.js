import React from "react";
import { prisma } from "@/lib/db";
import BookingWizard from "@/components/BookingWizard";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }) {
  const sParams = await searchParams;
  const initialService = sParams.service || "";

  // Fetch active therapists (which will be Dr. Madhumati Dhumak) and services
  const therapists = await prisma.therapist.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      fees: true,
      bio: true,
    },
  });

  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      durationMinutes: true,
      description: true,
    },
  });

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-6 md:px-12 py-28">
      <BookingWizard
        therapists={therapists}
        services={services}
        initialService={initialService}
      />
    </main>
  );
}
