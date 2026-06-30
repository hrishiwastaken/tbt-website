import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <>
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex-grow">
        {/* Header */}
        <header className="py-12 text-center max-w-3xl mx-auto">
          <span className="font-label text-label text-rosewood-cta uppercase tracking-widest block mb-4">Support & Inquiries</span>
          <h1 className="font-hero text-hero-mobile md:text-hero text-on-surface mb-6">Contact Us</h1>
          <p className="font-body text-body text-taupe-body">
            Reach out to schedule a consultation, ask questions, or learn more about our psychiatric practices.
          </p>
        </header>

        {/* Contact Split Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pb-24">
          {/* Details & Location Map */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="bg-surface-container-low p-8 rounded-[20px] border border-surface-variant/20 flex flex-col gap-6">
              <h2 className="font-hero text-h3 text-on-surface border-b border-surface-variant/30 pb-2">Clinic Information</h2>
              
              <div className="flex flex-col gap-1 font-body text-body">
                <span className="font-label text-label text-rosewood-cta uppercase tracking-wider mb-1">Our Location</span>
                <span className="text-on-surface">102, Shanti Heights, Prabhat Road</span>
                <span className="text-taupe-body">Erandwane, Pune, Maharashtra 411004</span>
              </div>

              <div className="flex flex-col gap-1 font-body text-body">
                <span className="font-label text-label text-rosewood-cta uppercase tracking-wider mb-1">Direct Contact</span>
                <a href="tel:+91205550192" className="text-on-surface hover:text-rosewood-cta transition-colors">+91 20 555 0192</a>
                <a href="mailto:info@madhumaticlinic.com" className="text-taupe-body hover:text-rosewood-cta transition-colors">info@madhumaticlinic.com</a>
              </div>

              <div className="flex flex-col gap-1 font-body text-body">
                <span className="font-label text-label text-rosewood-cta uppercase tracking-wider mb-1">Consultation Hours</span>
                <span className="text-on-surface">Monday – Friday: 9:00 AM – 5:00 PM</span>
                <span className="text-taupe-body">Saturdays & Sundays: By Appointment Only</span>
              </div>
            </div>

            {/* Crisis Support Card */}
            <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 p-8 rounded-[20px] flex flex-col gap-4 text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[32px]">warning</span>
              <h3 className="font-h3 text-h3 font-bold">Immediate Assistance</h3>
              <p className="font-body text-caption leading-relaxed font-semibold">
                If you are experiencing an acute psychiatric emergency, self-harm crisis, or feel in immediate danger, please do not use this contact form. Call <strong>112</strong> immediately or go to the nearest emergency medical facility.
              </p>
            </div>
            
            {/* Map Placeholder */}
            <div className="h-64 rounded-[20px] bg-surface-container overflow-hidden border border-surface-variant flex items-center justify-center text-center p-6 grayscale-filter shadow-inner">
              <div>
                <span className="material-symbols-outlined text-[32px] text-taupe-body mb-2">map</span>
                <p className="font-label text-label text-taupe-body uppercase tracking-wider">Prabhat Road Location Map</p>
                <p className="font-body text-caption text-taupe-body/80 mt-1">(Interactive Map Embed Placeholder)</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
