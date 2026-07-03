"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Laptop, CheckCircle2 } from "lucide-react";

export default function Services() {
  const services = [
    {
      title: "Individual Therapy",
      duration: "50 Minutes",
      format: "In-Person or Online",
      description: "One-on-one sessions tailored specifically to you. We collaborate to help you process emotional pain, unpack destructive thoughts, and build actionable skills to navigate life's challenges.",
      image: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Couples & Relationship Therapy",
      duration: "60 Minutes",
      format: "In-Person Only",
      description: "A neutral, structured environment to address relational conflict, build communication bridges, and restore emotional and physical intimacy. Open to couples at any stage of their relationship.",
      image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Family Therapy",
      duration: "75 Minutes",
      format: "In-Person Only",
      description: "Focused on understanding relational dynamics, structural blockages, and communication patterns within a family system. Designed to improve boundary-setting and collective conflict resolution.",
      image: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Child & Adolescent Therapy",
      duration: "45 Minutes",
      format: "In-Person Only",
      description: "Supporting younger individuals navigating developmental changes, emotional dysregulation, peer conflict, or trauma. We combine talk therapy with creative, play-integrated therapeutic tools.",
      image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Trauma-Focused Therapy",
      duration: "60 Minutes",
      format: "In-Person Only",
      description: "Gentle, trauma-informed clinical care incorporating EMDR principles, somatic awareness, and cognitive processing. We support you as you process past trauma and move forward at your own pace.",
      image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Online Therapy",
      duration: "50 Minutes",
      format: "Video Consultation",
      description: "Providing high-quality clinical support from the safety and convenience of your home. Conducted via encrypted, HIPAA-compliant video platforms to maintain absolute privacy and comfort.",
      image: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=800&q=80",
    }
  ];

  const pricingPlans = [
    {
      type: "Standard Consultation",
      price: "₹3,000",
      period: "per 50-minute session",
      description: "Perfect for ongoing individual therapy and general support.",
      features: [
        "In-person or Online sessions",
        "Direct contact with therapist",
        "HIPAA-secure portal access",
        "CBT and Somatic materials"
      ]
    },
    {
      type: "Couples & Family Sessions",
      price: "₹4,500",
      period: "per 60 to 75-minute session",
      description: "Best for collaborative relationship structures and family systems.",
      features: [
        "Systemic relational work",
        "Multi-member participation",
        "Custom conflict-resolution blueprints",
        "Dedicated follow-up summaries"
      ]
    }
  ];

  return (
    <div className="bg-warm-sand min-h-screen font-dmsans">
      
      {/* HERO SECTION */}
      <section className="bg-warm-tan/30 pt-32 pb-20 border-b border-muted-sage/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4 block">
            Clinical Care Options
          </span>
          <h1 className="font-cormorant text-5xl md:text-6xl lg:text-7xl font-semibold text-forest-slate leading-tight mb-6">
            Our Services
          </h1>
          <p className="text-forest-slate/85 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Evidence-based therapy tailored to your needs. We provide structured support pathways for various clinical mental health requirements.
          </p>
        </div>
      </section>

      {/* SERVICES LISTING */}
      <section className="py-12">
        {services.map((service, index) => {
          const isEven = index % 2 === 0;
          return (
            <div 
              key={service.title} 
              className={`py-16 md:py-24 border-b border-muted-sage/20 ${isEven ? "bg-warm-sand" : "bg-warm-sand/45"}`}
            >
              <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                  
                  {/* Image Column: Arch-topped doorway container */}
                  <div className={`lg:col-span-5 relative aspect-[4/5] w-full max-w-sm mx-auto rounded-t-full overflow-hidden shadow-warm-soft border border-muted-sage/25 bg-warm-tan ${
                    isEven ? "lg:order-1" : "lg:order-2"
                  }`}>
                    <Image
                      src={service.image}
                      alt={`${service.title} - Session image`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 35vw"
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>

                  {/* Text Details Column */}
                  <div className={`lg:col-span-7 space-y-6 ${
                    isEven ? "lg:order-2" : "lg:order-1"
                  }`}>
                    <h2 className="font-cormorant text-3xl md:text-4xl lg:text-5xl font-semibold text-forest-slate">
                      {service.title}
                    </h2>
                    
                    {/* Meta info tags */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold font-dmsans text-teal-sage">
                      <span className="flex items-center gap-1.5 bg-muted-sage/20 px-4 py-2 rounded-full border border-teal-sage/10">
                        <Clock className="w-3.5 h-3.5" />
                        {service.duration}
                      </span>
                      <span className="flex items-center gap-1.5 bg-muted-sage/20 px-4 py-2 rounded-full border border-teal-sage/10">
                        <Laptop className="w-3.5 h-3.5" />
                        {service.format}
                      </span>
                    </div>

                    <p className="text-forest-slate/90 text-base md:text-lg leading-relaxed font-dmsans">
                      {service.description}
                    </p>

                    <div className="pt-2">
                      <Link
                        href={`/contact?service=${encodeURIComponent(service.title)}`}
                        className="inline-flex items-center gap-2 bg-teal-sage hover:bg-forest-slate text-warm-sand text-sm font-semibold px-8 py-3.5 rounded-full hover:shadow-lg transition-all btn-shimmer"
                      >
                        Book This Session
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      {/* PRICING SECTION */}
      <section className="py-24 bg-muted-sage/20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-3 block">
              Investment & Pricing
            </span>
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-forest-slate leading-tight mb-4">
              Transparent Fees for Quality Care
            </h2>
            <p className="text-forest-slate/85 text-base">
              Prioritizing your well-being with structured, transparent therapy investment paths.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {pricingPlans.map((plan) => {
              const isRecommended = plan.type.includes("Couples");
              return (
                <div 
                  key={plan.type}
                  className={`rounded-2xl p-8 md:p-12 shadow-warm-soft flex flex-col justify-between relative transition-all duration-300 ${
                    isRecommended 
                      ? "bg-warm-sand border-2 border-teal-sage hover:border-forest-slate" 
                      : "glass-card hover:border-teal-sage/35"
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute top-0 right-8 -translate-y-1/2 bg-teal-sage text-warm-sand text-[10px] font-bold tracking-wider uppercase px-3.5 py-1 rounded-full shadow-sm">
                      Most Requested
                    </span>
                  )}
                  <div>
                    <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-2">
                      {plan.type}
                    </h3>
                    <p className="text-sm text-forest-slate/80 mb-6 font-dmsans">
                      {plan.description}
                    </p>
                    
                    {/* Price */}
                    <div className="mb-8 flex items-baseline gap-1">
                      <span className="text-4xl md:text-5xl font-cormorant font-semibold text-forest-slate">
                        {plan.price}
                      </span>
                      <span className="text-xs text-forest-slate/80 font-dmsans">
                        / {plan.period}
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-3 text-sm text-forest-slate/80 font-dmsans">
                          <CheckCircle2 className="w-4 h-4 text-teal-sage shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/contact"
                    className={`w-full text-center text-sm font-semibold py-3.5 rounded-full transition-all block btn-shimmer ${
                      isRecommended
                        ? "bg-teal-sage hover:bg-forest-slate text-warm-sand shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        : "bg-forest-slate hover:bg-teal-sage text-warm-sand hover:-translate-y-0.5"
                    }`}
                  >
                    Book consultation
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Sliding scale text */}
          <div className="text-center max-w-lg mx-auto">
            <p className="text-xs md:text-sm text-forest-slate/75 leading-relaxed italic font-dmsans">
              * Sliding scale slots are reserved for students, low-income individuals, and those facing sudden economic hardships. Please speak with us during your initial consultation.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}
