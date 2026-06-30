import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const revalidate = 60;

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex-grow">
        {/* Subtle Ambient Background */}
        <div className="absolute inset-0 pointer-events-none opacity-15 flex justify-center items-center z-[-1]">
          <svg className="w-[800px] h-[800px] text-secondary-fixed breathe-animation" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.1,-2.4C97.4,13.2,92,29,82.8,42.5C73.6,56,60.6,67.2,46.1,75.1C31.6,83,15.8,87.6,-0.1,87.8C-16,88,-32.1,83.7,-46.2,75.2C-60.3,66.7,-72.5,54.1,-80.6,39.4C-88.7,24.7,-92.7,7.9,-89.9,-7.7C-87.1,-23.3,-77.5,-37.7,-65.4,-48.9C-53.3,-60.1,-38.7,-68.1,-24.1,-73.4C-9.5,-78.7,5.1,-81.3,19.9,-79.8C34.7,-78.3,49.7,-72.7,44.7,-76.4Z" fill="currentColor" transform="translate(100 100) scale(1.1)"></path>
          </svg>
        </div>

        {/* Header */}
        <header className="py-12 text-center max-w-3xl mx-auto">
          <span className="font-label text-label text-rosewood-cta uppercase tracking-widest block mb-4">Therapeutic Focus</span>
          <h1 className="font-hero text-hero-mobile md:text-hero text-on-surface mb-6">Our Services</h1>
          <p className="font-body text-body text-taupe-body">
            We provide structured, evidence-based practices designed to deliver stability, mental clarity, and deep personal insight in an environment of quiet luxury.
          </p>
        </header>

        {/* Services Staggered Grid */}
        <section className="pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-start">
            {services.map((service, index) => {
              // Apply staggering margin on desktop for even indexed items
              const isEven = index % 2 === 1;
              return (
                <article
                  key={service.id}
                  className={`bg-linen-surface/75 backdrop-blur-sm border border-surface-variant/40 rounded-xl p-8 md:p-12 flex flex-col justify-between gap-6 w-full shadow-sm hover:border-rosewood-cta/40 transition-colors ${
                    isEven ? "md:mt-16" : ""
                  }`}
                >
                  <div>
                    <span className="font-hero text-h1 text-tertiary block mb-2">0{index + 1}</span>
                    <h3 className="font-hero text-h2 text-on-surface mb-4">{service.name}</h3>
                    <p className="font-body text-body text-taupe-body leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-surface-variant/20">
                    <div className="flex flex-col">
                      <span className="font-label text-label text-taupe-body uppercase tracking-widest mb-1">Duration & Price</span>
                      <span className="font-body text-body font-semibold">
                        {service.durationMinutes} Mins / ₹{(service.price * 80).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <Link
                      href={`/book?service=${service.slug}`}
                      className="bg-rosewood-cta text-on-primary rounded-full px-5 py-2 font-label text-label uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                      Book Now
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
