import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const revalidate = 60;

export default async function TeamPage() {
  const therapists = await prisma.therapist.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex-grow">
        {/* Header */}
        <header className="py-12 text-center max-w-3xl mx-auto">
          <span className="font-label text-label text-rosewood-cta uppercase tracking-widest block mb-4">Clinical Leadership</span>
          <h1 className="font-hero text-hero-mobile md:text-hero text-on-surface mb-6">Our Team</h1>
          <p className="font-body text-body text-taupe-body">
            Practitioners committed to combining deep clinical expertise with a personalized humanist approach.
          </p>
        </header>

        {/* Team Grid */}
        <section className="pb-24 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {therapists.map((therapist) => (
            <div
              key={therapist.id}
              className="bg-alabaster-bg rounded-2xl overflow-hidden border border-surface-variant/40 hover:border-rosewood-cta/50 transition-all flex flex-col shadow-sm"
            >
              {/* Photo */}
              <div className="h-72 relative bg-surface-container grayscale-filter">
                <img
                  className="w-full h-full object-cover"
                  src={therapist.photo || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600"}
                  alt={therapist.name}
                />
              </div>

              {/* Bio & Links */}
              <div className="p-8 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="font-hero text-h2 text-on-surface mb-2">{therapist.name}</h3>
                  <span className="font-label text-label text-rosewood-cta uppercase tracking-wider block mb-4">Licensed Therapist</span>
                  <p className="font-body text-body text-taupe-body leading-relaxed mb-6">
                    {therapist.bio}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-surface-variant/20">
                  <div className="flex flex-col">
                    <span className="font-label text-label text-taupe-body uppercase tracking-widest mb-1">Session Rate</span>
                    <span className="font-body text-body font-semibold">
                      ₹{(therapist.fees * 80).toLocaleString("en-IN")} / hr
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <Link
                      href={`/team/${therapist.slug}`}
                      className="border border-outline text-on-surface hover:bg-surface-container-low px-4 py-2 rounded-full font-label text-label uppercase tracking-widest transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href={`/book?therapist=${therapist.slug}`}
                      className="bg-rosewood-cta text-on-primary hover:opacity-90 px-4 py-2 rounded-full font-label text-label uppercase tracking-widest transition-opacity"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </>
  );
}
