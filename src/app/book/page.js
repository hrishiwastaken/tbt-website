import React from "react";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingWizard from "@/components/BookingWizard";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }) {
  const sParams = await searchParams;
  const initialTherapist = sParams.therapist || "";
  const initialService = sParams.service || "";

  // Fetch active therapists and services
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
    <>
      <Navbar />
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <BookingWizard
          therapists={therapists}
          services={services}
          initialTherapist={initialTherapist}
          initialService={initialService}
        />
      </main>
      <Footer />
    </>
  );
}
