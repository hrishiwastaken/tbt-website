"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Laptop, CheckCircle2 } from "lucide-react";

// Organic leaf shapes (same paths as the homepage testimonial accents)
const SINGLE_LEAF = "M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5z";
const DOUBLE_LEAF =
  "M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5zM2 2C2 2 9 3.5 11 9c1.5 4-1.5 5.5-1.5 5.5S4 13 4 8c0-3.5-2-6-2-6z";

type LeafSpec = {
  double?: boolean;
  size: number;
  rotate: number;
  flip?: boolean;
  opacity: number;
  pos: React.CSSProperties; // top/left/right/bottom offsets
  drift?: "slow" | "reverse";
  color?: "teal" | "forest";
  mobileHidden?: boolean;
};

function Leaf({
  double,
  size,
  rotate,
  flip,
  opacity,
  pos,
  drift = "slow",
  color = "teal",
  mobileHidden,
}: LeafSpec) {
  return (
    <div
      aria-hidden="true"
      className={`absolute pointer-events-none ${mobileHidden ? "hidden md:block" : ""} ${
        drift === "slow" ? "animate-float-slow" : "animate-float-reverse"
      } ${color === "teal" ? "text-teal-sage" : "text-forest-slate"}`}
      style={{ ...pos, opacity: Math.min(opacity * 2.2, 0.16) }}
    >
      {/* Rotation lives on the svg so the float animation (which owns the
          wrapper's transform) doesn't cancel it out */}
      <svg
        width={size}
        height={size}
        fill="currentColor"
        viewBox="0 0 24 24"
        style={{
          transform: `rotate(${rotate}deg)${flip ? " scaleX(-1)" : ""}`,
        }}
      >
        <path d={double ? DOUBLE_LEAF : SINGLE_LEAF} />
      </svg>
    </div>
  );
}

// Messy hand-scattered layouts, cycled across the service rows so no two
// consecutive rows repeat. Positions are % of the row, so they adapt.
const ROW_SCATTERS: LeafSpec[][] = [
  [
    {
      double: true,
      size: 165,
      rotate: -18,
      opacity: 0.07,
      pos: { top: "9%", right: "5%" },
    },
    {
      size: 75,
      rotate: 65,
      opacity: 0.05,
      pos: { top: "26%", left: "40%" },
      drift: "reverse",
      color: "forest",
      mobileHidden: true,
    },
    {
      size: 125,
      rotate: 118,
      flip: true,
      opacity: 0.06,
      pos: { bottom: "-3%", left: "7%" },
      drift: "reverse",
    },
    {
      double: true,
      size: 58,
      rotate: 32,
      opacity: 0.05,
      pos: { top: "14%", left: "18%" },
      color: "forest",
    },
  ],
  [
    {
      double: true,
      size: 140,
      rotate: 24,
      flip: true,
      opacity: 0.065,
      pos: { top: "6%", left: "4%" },
    },
    {
      size: 95,
      rotate: -40,
      opacity: 0.055,
      pos: { bottom: "12%", right: "8%" },
      drift: "reverse",
      color: "forest",
    },
    {
      size: 60,
      rotate: 150,
      opacity: 0.05,
      pos: { top: "48%", right: "34%" },
      mobileHidden: true,
    },
    {
      double: true,
      size: 80,
      rotate: -8,
      opacity: 0.045,
      pos: { bottom: "-4%", left: "44%" },
      drift: "reverse",
      mobileHidden: true,
    },
  ],
  [
    {
      size: 150,
      rotate: -75,
      opacity: 0.06,
      pos: { top: "18%", right: "2%" },
      drift: "reverse",
    },
    {
      double: true,
      size: 70,
      rotate: 45,
      opacity: 0.055,
      pos: { top: "8%", left: "30%" },
      color: "forest",
      mobileHidden: true,
    },
    {
      double: true,
      size: 110,
      rotate: 12,
      flip: true,
      opacity: 0.065,
      pos: { bottom: "5%", left: "2%" },
    },
    {
      size: 55,
      rotate: -130,
      opacity: 0.05,
      pos: { bottom: "24%", right: "26%" },
      drift: "reverse",
      color: "forest",
      mobileHidden: true,
    },
  ],
];

export default function Services() {
  const services = [
    {
      title: "Individual Therapy",
      duration: "50 Minutes",
      format: "In-Person or Online",
      description:
        "One-on-one sessions tailored specifically to you. We collaborate to help you process emotional pain, unpack destructive thoughts, and build actionable skills to navigate life's challenges.",
      image:
        "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Couples & Family Therapy",
      duration: "60 – 75 Minutes",
      format: "In-Person Only",
      description:
        "A neutral, structured environment for couples and family systems alike. Address relational conflict, build communication bridges, improve boundary-setting, and restore emotional connection — whether between partners or across the whole family.",
      image:
        "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Child & Adolescent Therapy",
      duration: "45 Minutes",
      format: "In-Person Only",
      description:
        "Supporting younger individuals navigating developmental changes, emotional dysregulation, peer conflict, or trauma. We combine talk therapy with creative, play-integrated therapeutic tools.",
      image:
        "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Trauma-Focused Therapy",
      duration: "60 Minutes",
      format: "In-Person Only",
      description:
        "Gentle, trauma-informed clinical care incorporating EMDR principles, somatic awareness, and cognitive processing. We support you as you process past trauma and move forward at your own pace.",
      image:
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Online Therapy",
      duration: "50 Minutes",
      format: "Video Consultation",
      description:
        "Providing high-quality clinical support from the safety and convenience of your home. Conducted via encrypted, HIPAA-compliant video platforms to maintain absolute privacy and comfort.",
      image:
        "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const pricingPlans = [
    {
      type: "Standard Consultation",
      price: "₹3,000",
      period: "per 50-minute session",
      description:
        "Perfect for ongoing individual therapy and general support.",
      features: [
        "In-person or Online sessions",
        "Direct contact with therapist",
        "HIPAA-secure portal access",
        "CBT and Somatic materials",
      ],
    },
    {
      type: "Couples & Family Sessions",
      price: "₹4,500",
      period: "per 60 to 75-minute session",
      description:
        "Best for collaborative relationship structures and family systems.",
      features: [
        "Systemic relational work",
        "Multi-member participation",
        "Custom conflict-resolution blueprints",
        "Dedicated follow-up summaries",
      ],
    },
  ];

  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      {/* HERO SECTION */}
      <section className="bg-warm-tan/20 pt-32 pb-20 border-b border-muted-sage/15 relative overflow-hidden">
        {/* Scattered leaf overlays */}
        <Leaf
          double
          size={190}
          rotate={-12}
          opacity={0.06}
          pos={{ top: "12%", right: "7%" }}
        />
        <Leaf
          size={90}
          rotate={70}
          opacity={0.05}
          pos={{ top: "58%", right: "22%" }}
          drift="reverse"
          color="forest"
          mobileHidden
        />
        <Leaf
          size={145}
          rotate={40}
          flip
          opacity={0.05}
          pos={{ bottom: "-6%", left: "5%" }}
          drift="reverse"
          color="forest"
        />
        <Leaf
          double
          size={65}
          rotate={-55}
          opacity={0.05}
          pos={{ top: "22%", left: "14%" }}
          mobileHidden
        />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4 block">
            Clinical Care Options
          </span>
          <h1 className="font-cormorant text-5xl md:text-6xl lg:text-7xl font-semibold text-forest-slate leading-tight mb-6">
            Our Services
          </h1>
          <p className="text-forest-slate/85 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Evidence-based therapy tailored to your needs. We provide structured
            support pathways for various clinical mental health requirements.
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
              className={`py-16 md:py-24 border-b border-muted-sage/15 relative overflow-hidden ${isEven ? "bg-ivory" : "bg-warm-sand/20"}`}
            >
              {/* Messy scattered leaf accents — layout varies per row */}
              {ROW_SCATTERS[index % ROW_SCATTERS.length].map((leaf, i) => (
                <Leaf key={i} {...leaf} />
              ))}

              <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                  {/* Image Column: Arch-topped doorway container */}
                  <div
                    className={`lg:col-span-5 relative aspect-[4/5] w-full max-w-sm mx-auto rounded-t-full overflow-hidden shadow-warm-soft border border-muted-sage/25 bg-warm-tan ${
                      isEven ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <Image
                      src={service.image}
                      alt={`${service.title} - Session image`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 35vw"
                      className="object-cover transition-transform duration-700 hover:scale-105"
                    />
                  </div>

                  {/* Text Details Column */}
                  <div
                    className={`lg:col-span-7 space-y-6 ${
                      isEven ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
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
      </section>

      {/* PRICING SECTION */}
      <section className="py-24 bg-warm-sand/15 relative overflow-hidden">
        {/* Scattered leaf accents */}
        <Leaf
          double
          size={210}
          rotate={8}
          opacity={0.06}
          pos={{ bottom: "6%", right: "3%" }}
          drift="reverse"
          color="forest"
        />
        <Leaf
          size={85}
          rotate={-95}
          opacity={0.05}
          pos={{ top: "10%", left: "6%" }}
        />
        <Leaf
          double
          size={60}
          rotate={130}
          flip
          opacity={0.045}
          pos={{ top: "38%", right: "12%" }}
          mobileHidden
        />
        <Leaf
          size={115}
          rotate={20}
          opacity={0.05}
          pos={{ bottom: "-2%", left: "34%" }}
          drift="reverse"
          mobileHidden
        />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-3 block">
              Investment & Pricing
            </span>
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-forest-slate leading-tight mb-4">
              Transparent Fees for Quality Care
            </h2>
            <p className="text-forest-slate/85 text-base">
              Prioritizing your well-being with structured, transparent therapy
              investment paths.
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
                      ? "bg-warm-white border-2 border-teal-sage hover:border-forest-slate"
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
                        <li
                          key={feat}
                          className="flex items-center gap-3 text-sm text-forest-slate/80 font-dmsans"
                        >
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
              * Sliding scale slots are reserved for students, low-income
              individuals, and those facing sudden economic hardships. Please
              speak with us during your initial consultation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
