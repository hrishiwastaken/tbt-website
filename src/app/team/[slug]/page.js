import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const revalidate = 60;

export default async function TherapistDetailPage({ params }) {
  const { slug } = await params;

  // Fetch therapist by slug
  const therapist = await prisma.therapist.findUnique({
    where: { slug },
    include: {
      availability: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!therapist || !therapist.isActive) {
    notFound();
  }

  // Helper to map numeric dayOfWeek to day name
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Group availability by day
  const groupedAvailability = therapist.availability.reduce((acc, curr) => {
    const day = dayNames[curr.dayOfWeek];
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(`${curr.startTime} - ${curr.endTime}`);
    return acc;
acc;
  }, {});

  return (
    <>
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex-grow">
        {/* Breadcrumbs */}
        <div className="mb-8 font-caption text-caption text-taupe-body">
          <Link href="/" className="hover:text-rosewood-cta transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/team" className="hover:text-rosewood-cta transition-colors">Team</Link>
          <span className="mx-2">/</span>
          <span className="text-on-surface font-semibold">{therapist.name}</span>
        </div>

        {/* Profile Split layout */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start pb-12 border-b border-surface-variant/30">
          {/* Left Column: Photo & Rates */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="h-[450px] relative rounded-2xl overflow-hidden grayscale-filter bg-surface-container">
              <img
                className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-sm"
                src={therapist.photo || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600"}
                alt={therapist.name}
              />
            </div>
            
            <div className="bg-surface-container-low p-6 rounded-2xl border border-surface-variant/20 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-label text-label text-taupe-body uppercase tracking-widest mb-1">Fee per session</span>
                <span className="font-body text-body font-bold text-on-surface">
                  ₹{(therapist.fees * 80).toLocaleString("en-IN")} / hour
                </span>
              </div>
              <Link
                href={`/book?therapist=${therapist.slug}`}
                className="bg-rosewood-cta text-on-primary rounded-full px-6 py-3 font-label text-label uppercase tracking-widest hover:opacity-90 transition-opacity text-center shadow-sm"
              >
                Schedule Session
              </Link>
            </div>
          </div>

          {/* Right Column: Bio & Weekly availability */}
          <div className="md:col-span-7 flex flex-col gap-8 md:pl-8">
            <div>
              <span className="font-label text-label text-rosewood-cta uppercase tracking-widest block mb-2">Psychologist Profile</span>
              <h1 className="font-hero text-hero-mobile md:text-h1 text-on-surface mb-2">{therapist.name}</h1>
              <span className="font-body text-body text-taupe-body font-semibold">Specialist in Relational and Somatic Recovery</span>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="font-h3 text-h3 text-on-surface border-b border-surface-variant/20 pb-2">Biography & Approach</h2>
              <p className="font-body text-body text-taupe-body leading-relaxed whitespace-pre-line">
                {therapist.bio}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="font-h3 text-h3 text-on-surface border-b border-surface-variant/20 pb-2">Weekly Availability</h2>
              {Object.keys(groupedAvailability).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(groupedAvailability).map(([day, slots]) => (
                    <div key={day} className="bg-alabaster-bg p-4 rounded-xl border border-surface-variant/30">
                      <span className="font-label text-label text-rosewood-cta font-semibold block mb-2">{day}</span>
                      <div className="flex flex-wrap gap-2">
                        {slots.map((slot, index) => (
                          <span key={index} className="bg-surface-container px-3 py-1 rounded text-caption text-taupe-body font-body font-semibold">
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-body text-taupe-body italic">
                  No availability slots listed. Please contact the administrator.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
