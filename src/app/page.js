import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="w-full max-w-7xl mx-auto flex-grow">
        {/* Hero Section */}
        <section className="relative py-section-padding px-margin-mobile md:px-margin-desktop overflow-hidden flex flex-col items-center text-center">
          {/* Decorative Breathwork Motif */}
          <div className="absolute inset-0 -z-10 breathe-animation opacity-20 pointer-events-none flex justify-center items-center">
            <svg fill="none" height="800" viewBox="0 0 800 800" width="800" xmlns="http://www.w3.org/2000/svg">
              <path d="M400 0C620.914 0 800 179.086 800 400C800 620.914 620.914 800 400 800C179.086 800 0 620.914 0 400C0 179.086 179.086 0 400 0Z" fill="#EBE5DC"></path>
            </svg>
          </div>
          <h1 className="font-hero text-hero-mobile md:text-hero text-on-surface mb-8 max-w-4xl">
            Quiet Luxury in Emotional Wellness.
          </h1>
          <p className="font-body text-body text-taupe-body max-w-2xl mx-auto">
            A sanctuary for discerning individuals seeking profound personal growth through evidence-based practice and humanist philosophy.
          </p>
        </section>

        {/* Brand Narrative (60/40 Split) */}
        <section className="py-section-padding px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
            <div className="md:col-span-7 pr-0 md:pr-12">
              <h2 className="font-hero text-h1 text-on-surface mb-6">The Journey to Center.</h2>
              <p className="font-body text-body text-taupe-body mb-6">
                Founded on the principle that true healing requires spaciousness, Madhumati Clinic strips away the clinical sterility often associated with mental health care. We believe in an environment that feels like a retreat—a safe harbor where intellect and emotion can finally reconcile.
              </p>
              <p className="font-body text-body text-taupe-body">
                Our approach is deeply rooted in editorial restraint and clinical precision. Every interaction, every space, and every session is designed to initiate a physiological deceleration, allowing our clients to breathe, reflect, and transform at their own pace.
              </p>
            </div>
            <div className="md:col-span-5 relative h-96 md:h-[450px] min-h-[400px] rounded-2xl overflow-hidden grayscale-filter">
              <img 
                className="absolute inset-0 w-full h-full object-cover rounded-2xl animate-[fadeIn_0.6s_ease-out]" 
                alt="A serene, minimalist interior of a therapy room featuring natural linen textures, soft natural light streaming through sheer curtains, and organic wooden furniture." 
                src="/hero.jpg" 
              />
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-section-padding px-margin-mobile md:px-margin-desktop bg-surface-container-low rounded-3xl mx-margin-mobile md:mx-margin-desktop my-12">
          <div className="text-center mb-16">
            <h2 className="font-hero text-h1 text-on-surface mb-4">Our Foundation</h2>
            <p className="font-body text-body text-taupe-body">The principles that guide our practice.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Value 1 */}
            <div className="flex flex-col">
              <span className="font-hero text-hero text-[#D4A373] mb-4 opacity-50 block">01</span>
              <h3 className="font-h3 text-h3 text-on-surface mb-4">Privacy</h3>
              <p className="font-body text-body text-taupe-body">
                Absolute discretion in an increasingly connected world. Your journey remains yours alone, guarded with the utmost professional integrity.
              </p>
            </div>
            {/* Value 2 */}
            <div className="flex flex-col">
              <span className="font-hero text-hero text-[#D4A373] mb-4 opacity-50 block">02</span>
              <h3 className="font-h3 text-h3 text-on-surface mb-4">Empathy</h3>
              <p className="font-body text-body text-taupe-body">
                A deeply humanist approach that honors your unique lived experience, fostering a therapeutic alliance built on authentic understanding.
              </p>
            </div>
            {/* Value 3 */}
            <div className="flex flex-col">
              <span className="font-hero text-hero text-[#D4A373] mb-4 opacity-50 block">03</span>
              <h3 className="font-h3 text-h3 text-on-surface mb-4">Growth</h3>
              <p className="font-body text-body text-taupe-body">
                Committing to sustainable, profound personal development. We facilitate the work that leads to lasting equilibrium and emotional intelligence.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
