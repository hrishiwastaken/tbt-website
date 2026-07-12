"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ShieldCheck, HeartHandshake, Award } from "lucide-react";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export default function About() {
  const team = [
    {
      name: "Dr. Madhumati Dhumak",
      role: "Founding Director & Clinical Psychologist",
      credentials: "M.Phil Clinical Psychology · RCI Licensed",
      specialisations: [
        "Anxiety & Stress",
        "Trauma & PTSD",
        "Life Transitions",
      ],
      bio: "With over 12 years of clinical experience, Dr. Dhumak founded The Brain Tea to create a sanctuary where scientific insight meets deep, non-judgmental human empathy. She specializes in guiding clients through trauma recovery and stress management at their own pace.",
      image:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const values = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-forest" />,
      title: "Confidentiality First",
      text: "We protect your stories with absolute discretion. Every conversation, record, and enquiry is guarded under strict clinical confidentiality guidelines, ensuring a completely safe space.",
    },
    {
      icon: <Award className="w-8 h-8 text-forest" />,
      title: "Evidence-Based Care",
      text: "Our methodologies are grounded in active research. We employ Cognitive Behavioral, Acceptance & Commitment, and Trauma-Informed modalities that are scientifically validated to support recovery.",
    },
    {
      icon: <HeartHandshake className="w-8 h-8 text-forest" />,
      title: "Human-Centred Practice",
      text: "We believe in people over diagnoses. We never reduce you to a checklist of symptoms. Our therapy is customized to respect your personal history, pace, values, and individual agency.",
    },
  ];

  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      {/* SECTION 1: PAGE HERO */}
      <section className="bg-warm-tan/30 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4 block">
              About the Practice
            </span>
            <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-forest-slate leading-tight mb-6">
              About The Brain Tea
            </h1>
            <p className="text-forest-slate/85 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-dmsans">
              We believe every person deserves a space where they feel seen,
              heard, and supported on their journey toward mental well-being.
            </p>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: OUR STORY */}
      <section className="py-24 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Story Text */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-forest-slate mb-4">
              Building a Safe Haven for Healing
            </h2>
            <div className="text-forest-slate/90 text-base md:text-lg space-y-6 leading-relaxed font-dmsans">
              <p>
                The Brain Tea was founded with a singular, vital goal: to create
                a therapeutic environment that combines clinical excellence with
                genuine, authentic warmth. We recognized that traditional
                clinical spaces often felt cold, intimidating, or sterile. We
                set out to change that, designing our practice to feel like
                entering a comfortable, peaceful room where you can catch your
                breath.
              </p>
              <p>
                Our team is composed of highly qualified, licensed clinical
                practitioners who share a common philosophy: therapy is not
                about &ldquo;fixing&rdquo; someone, but about exploring the
                complex layers of human experience together. We meet you exactly
                where you are—whether you are dealing with debilitating anxiety,
                navigating structural relationship conflicts, or seeking to
                understand yourself on a deeper level.
              </p>
              <p>
                Over the years, we have helped hundreds of clients build
                resilience, develop healthy coping mechanisms, and reclaim their
                peace of mind. We are deeply committed to providing
                evidence-based treatment paths tailored uniquely to your life
                context, ensuring you never feel like a number on a medical
                chart.
              </p>
            </div>
          </div>

          {/* Story Image in Arch frame */}
          <div className="lg:col-span-5 relative aspect-[4/5] rounded-t-full overflow-hidden shadow-warm-soft w-full max-w-md mx-auto border border-muted-sage/25 bg-warm-tan">
            <Image
              src="https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80"
              alt="Soft natural sunlight filtering through leaves near a quiet reading space"
              fill
              sizes="(max-width: 1024px) 100vw, 35vw"
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: OUR VALUES */}
      <section className="py-24 bg-muted-sage/20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-forest-slate leading-tight mb-4">
              The Principles That Guide Us
            </h2>
            <p className="text-forest-slate/85 text-base md:text-lg">
              Our core values form the foundation of our clinical practice,
              dictating how we treat every individual who reaches out.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div
                key={v.title}
                className="bg-warm-sand p-8 rounded-2xl shadow-warm-soft border border-muted-sage/20 flex flex-col items-start"
              >
                <div className="mb-6 p-3 bg-teal-sage/10 rounded-xl text-teal-sage">
                  {v.icon}
                </div>
                <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-4">
                  {v.title}
                </h3>
                <p className="text-sm text-forest-slate/80 leading-relaxed font-dmsans">
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: THE TEAM */}
      <section className="py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-3 block">
              Our Practitioners
            </span>
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-forest-slate mb-4">
              Meet Our Dedicated Team
            </h2>
            <p className="text-forest-slate/85 text-base md:text-lg">
              A collaborative, compassionate group of licensed professionals
              here to walk alongside you.
            </p>
          </div>

          {/* Team Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {team.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeInUp}
                className="glass-card rounded-2xl overflow-hidden shadow-warm-soft border border-muted-sage/20 flex flex-col h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group"
              >
                {/* Visual hover border highlighter */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-teal-sage transition-colors duration-300 z-10" />

                {/* Photo */}
                <div className="relative h-72 w-full bg-warm-tan">
                  <Image
                    src={t.image}
                    alt={`${t.name} - ${t.role}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 30vw"
                    className="object-cover object-top"
                  />
                </div>

                {/* Info Content */}
                <div className="p-8 flex flex-col justify-between flex-grow">
                  <div>
                    <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-1">
                      {t.name}
                    </h3>
                    <p className="font-dmsans text-xs text-teal-sage font-medium mb-3">
                      {t.role}
                    </p>
                    <p className="font-dmsans text-xs text-forest-slate bg-muted-sage/15 border border-teal-sage/10 px-2.5 py-1 rounded-full mb-4 inline-block">
                      {t.credentials}
                    </p>
                    <p className="text-sm text-forest-slate/85 leading-relaxed mb-6 font-dmsans">
                      {t.bio}
                    </p>
                  </div>

                  {/* Specialisation tags */}
                  <div>
                    <div className="border-t border-muted-sage/20 pt-4 flex flex-wrap gap-1.5">
                      {t.specialisations.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-medium text-forest-slate bg-warm-tan/40 border border-muted-sage/20 px-2 py-0.5 rounded-full font-dmsans"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SECTION 5: APPOINTMENT PROMPT */}
      <section className="bg-warm-tan/30 py-16 text-center border-t border-muted-sage/20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-cormorant text-3xl md:text-4xl font-semibold text-forest-slate mb-4">
            We are here to support your path forward.
          </h2>
          <p className="text-sm text-forest-slate/80 mb-8 font-dmsans">
            Speak with one of our coordinators to find the therapist best suited
            to your needs.
          </p>
          <Link
            href="/contact"
            className="inline-block font-dmsans text-sm font-semibold bg-teal-sage hover:bg-forest-slate text-warm-sand px-8 py-3.5 rounded-full transition-all hover:shadow-lg btn-shimmer"
          >
            Schedule a Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
