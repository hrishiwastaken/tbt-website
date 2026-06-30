import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className="w-full max-w-7xl mx-auto flex-grow px-margin-mobile md:px-margin-desktop py-12">
        {/* About Header */}
        <section className="py-12 text-center max-w-3xl mx-auto">
          <span className="font-label text-label text-rosewood-cta uppercase tracking-widest block mb-4">Our Practice</span>
          <h1 className="font-hero text-hero-mobile md:text-hero text-on-surface mb-6">About Our Clinic</h1>
          <p className="font-body text-body text-taupe-body leading-relaxed">
            A secure haven for recovery, built on clinical excellence, absolute privacy, and structured psychological progression.
          </p>
        </section>

        {/* Narrative & Philosophy Grid */}
        <section className="py-12 border-t border-surface-variant/30">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
            <div className="md:col-span-7 pr-0 md:pr-12">
              <h2 className="font-hero text-h1 text-on-surface mb-6">Our Philosophy</h2>
              <p className="font-body text-body text-taupe-body mb-6 leading-relaxed">
                Madhumati Clinic was founded on the fundamental principle that true mental recovery requires spaciousness and patient-centered control. We provide highly focused clinical environments that avoid the intimidating sterility of standard mental hospitals.
              </p>
              <p className="font-body text-body text-taupe-body mb-6 leading-relaxed">
                Our approach integrates classical cognitive-behavioral therapies with modern somatic psychology. Rather than just treating symptoms, we focus on identifying root psychological blocks, helping our clients restore their central nervous system equilibrium and achieve a sustainable level of self-awareness.
              </p>
              <p className="font-body text-body text-taupe-body leading-relaxed">
                Every practitioner at Madhumati Clinic operates with strict professional integrity, absolute clinical rigor, and a deep respect for individual autonomy.
              </p>
            </div>
            
            <div className="md:col-span-5 h-96 md:h-[450px] relative rounded-2xl overflow-hidden grayscale-filter">
              <img
                className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-sm"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9CrvSZcB5K_M90vuUuY0yIRpjRfTlD5htveoBkGT1tiPRqWCYQyMZkHxuHae4HvB2RSJYj543XHnA3Pfyq4yQLTLG3XAKMxDB8Sd_QSpnkQkUqT8rg2ToMe2lgwbFqsO41hMGydLIEvgsQl66reOSnuwLOXNj-tHCczkZdKcJf2J8nSvcWcCCFgR0qVkwjy-qBW3zySGXf3jslATREXcn4feCl_vVzhIXXuD89QPUU08xxRrMhvsdOTCMP2n_KjCXIxS5iGUO2_A"
                alt="Therapy consulting room interior"
              />
            </div>
          </div>
        </section>

        {/* Core Values / Foundation */}
        <section className="py-section-padding bg-surface-container-low rounded-3xl p-8 md:p-16 my-12">
          <div className="text-center mb-16">
            <h2 className="font-hero text-h1 text-on-surface mb-4">Our Core Values</h2>
            <p className="font-body text-body text-taupe-body">The therapeutic pillars that guide our clinical work.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Value 1 */}
            <div className="flex flex-col">
              <span className="font-hero text-hero text-[#D4A373] mb-4 opacity-50 block">01</span>
              <h3 className="font-h3 text-h3 text-on-surface mb-4">Absolute Privacy</h3>
              <p className="font-body text-body text-taupe-body leading-relaxed">
                Discretion is our absolute standard. Your booking logs, records, and therapy notes are encrypted and fully protected with strict client-therapist privilege.
              </p>
            </div>
            {/* Value 2 */}
            <div className="flex flex-col">
              <span className="font-hero text-hero text-[#D4A373] mb-4 opacity-50 block">02</span>
              <h3 class="font-h3 text-h3 text-on-surface mb-4">Empathetic Focus</h3>
              <p className="font-body text-body text-taupe-body leading-relaxed">
                We approach every client with deep humanist validation. Your personal lived experiences form the foundation of our custom, collaborative recovery plans.
              </p>
            </div>
            {/* Value 3 */}
            <div className="flex flex-col">
              <span className="font-hero text-hero text-[#D4A373] mb-4 opacity-50 block">03</span>
              <h3 class="font-h3 text-h3 text-on-surface mb-4">Sustainable Growth</h3>
              <p className="font-body text-body text-taupe-body leading-relaxed">
                Our objective is deep, lasting recovery. We equip clients with concrete, evidence-based coping skills that foster long-term emotional intelligence.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
