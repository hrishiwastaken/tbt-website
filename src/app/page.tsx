"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { 
  Brain, 
  Heart, 
  Users, 
  ShieldAlert, 
  Compass, 
  Sparkles, 
  PhoneCall, 
  ArrowRight
} from "lucide-react";

// Fade in viewport animation helper
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function Home() {
  const whatsappNumber = "917558493155";
  const message = "Hello! I'd like to book an appointment at Solis Psychology. Could you please let me know your availability?";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  const focusAreas = [
    {
      icon: <Brain className="w-6 h-6 text-forest" />,
      title: "Anxiety & Stress",
      description: "Persistent worry, panic, and burnout are treatable. We help you build tools that last."
    },
    {
      icon: <Heart className="w-6 h-6 text-forest" />,
      title: "Depression & Mood",
      description: "Whether it's emptiness or constant sadness, you don't have to carry it alone."
    },
    {
      icon: <Users className="w-6 h-6 text-forest" />,
      title: "Relationship Therapy",
      description: "For couples and individuals navigating connection, conflict, and intimacy."
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-forest" />,
      title: "Trauma & PTSD",
      description: "Gentle, trauma-informed care to help you process and move forward safely."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-forest" />,
      title: "Self-Esteem & Identity",
      description: "Explore who you are and build a relationship with yourself that's grounded and compassionate."
    },
    {
      icon: <Compass className="w-6 h-6 text-forest" />,
      title: "Life Transitions",
      description: "Grief, career change, parenthood, loss — we help you navigate what comes next."
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Reach Out",
      description: "Send us a WhatsApp message or fill out the contact form. We'll respond within 24 hours."
    },
    {
      num: "02",
      title: "Free Consultation",
      description: "A short, no-pressure call to understand your needs and match you with the right therapist."
    },
    {
      num: "03",
      title: "Begin Your Journey",
      description: "Book your first session at a time that works for you, in person or online."
    }
  ];

  const testimonials = [
    {
      quote: "For the first time in my life, I felt truly heard and understood. The environment was safe, and the guidance helped me find my footing again.",
      author: "Sarah",
      city: "New Delhi"
    },
    {
      quote: "Managing my severe anxiety felt impossible. Working together, I gained practical tools that completely changed how I handle daily stress.",
      author: "Rahul",
      city: "Gurugram"
    },
    {
      quote: "As a couple, we had hit a wall in our communication. The relationship sessions gave us a structured space to reconnect and understand each other's needs.",
      author: "Priya & Amit",
      city: "Noida"
    }
  ];

  return (
    <div className="overflow-hidden bg-ivory font-dmsans">
      
      {/* SECTION 1: HERO (EDITORIAL ARCH & CURVES) */}
      <section className="relative min-h-[90vh] flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 pt-[120px] pb-28 bg-warm-sand overflow-hidden">
        {/* Organic Curved Background Accent behind the entire section */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full bg-warm-tan/30 -z-10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-muted-sage/20 -z-10 blur-[60px] pointer-events-none" />

        {/* Hand-drawn soft circle accent */}
        <div className="absolute top-[20%] left-[45%] opacity-[0.15] text-teal-sage pointer-events-none hidden lg:block">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M30,50 C20,20 80,10 85,45 C90,80 30,90 25,60 C20,30 70,25 75,50" strokeLinecap="round" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto w-full px-6 md:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 relative z-10">
          {/* Left Content Column */}
          <div className="w-full lg:w-[50%] flex flex-col justify-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-xl text-center lg:text-left mx-auto lg:mx-0"
            >
              {/* Eyebrow */}
              <motion.span 
                variants={fadeInUp}
                className="inline-block text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4"
              >
                Professional Psychology Practice
              </motion.span>
              
              {/* H1 Headline */}
              <motion.h1 
                variants={fadeInUp}
                className="font-cormorant text-5xl md:text-6xl lg:text-[72px] font-semibold text-forest-slate leading-[1.08] tracking-[-0.01em] mb-6 text-balance relative"
              >
                You Deserve to Feel Like Yourself Again
              </motion.h1>

              {/* Subhead */}
              <motion.p 
                variants={fadeInUp}
                className="text-base md:text-lg text-forest-slate/85 leading-relaxed mb-8 text-pretty font-dmsans"
              >
                Compassionate, evidence-based therapy for individuals, couples, and families. A warm, human-centered sanctuary to begin your journey.
              </motion.p>

              {/* CTAs */}
              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4 mb-6"
              >
                <Link 
                  href="/book"
                  className="bg-teal-sage hover:bg-forest-slate text-warm-sand text-center font-medium px-8 py-3.5 rounded-full shadow-md hover:shadow-warm-soft transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer"
                >
                  Book a Consultation
                </Link>
                <Link 
                  href="/services"
                  className="border border-teal-sage/30 text-teal-sage hover:bg-teal-sage hover:text-warm-sand text-center font-medium px-8 py-3.5 rounded-full transition-all duration-300 btn-shimmer"
                >
                  Our Services
                </Link>
              </motion.div>

              {/* Reassurance */}
              <motion.p 
                variants={fadeInUp}
                className="text-xs text-muted-sage flex items-center justify-center lg:justify-start gap-1.5"
              >
                <span>🔒</span> All sessions are strictly confidential
              </motion.p>
            </motion.div>
          </div>

          {/* Right Imagery Column */}
          <div className="w-full lg:w-[45%] flex justify-center relative">
            {/* Background semicircular/arched background shape */}
            <div className="absolute top-[8%] left-[2%] right-[2%] bottom-[-5%] bg-warm-tan/40 rounded-t-full -z-10 blur-md pointer-events-none" />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-muted-sage/20 -z-10 blur-xl pointer-events-none" />
            
            {/* Decorative organic hand-drawn arrow pointing to the consultation button */}
            <div className="absolute -left-12 bottom-12 opacity-[0.18] text-teal-sage pointer-events-none hidden xl:block">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M80,20 C50,40 30,50 35,80" strokeLinecap="round" />
                <path d="M25,75 L35,80 L40,70" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Arch-topped frame container */}
            <div className="w-full max-w-md aspect-[3/4] rounded-t-full overflow-hidden shadow-warm-soft bg-warm-tan relative z-10 border border-muted-sage/25">
              <Image
                src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
                alt="Warm softly lit therapy room interior with armchair and potted plant"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* Section Transition Curve (flows Hero into Section 2) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
          <svg className="relative block w-full h-[60px] md:h-[80px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,120 1200,0 L1200,120 L0,120 Z" fill="var(--color-muted-sage)" className="opacity-20" />
            <path d="M0,15 Q600,120 1200,15 L1200,120 L0,120 Z" fill="var(--color-warm-sand)" className="opacity-10" />
          </svg>
        </div>
      </section>

      {/* SECTION 2: TRUST BAR */}
      <section className="bg-muted-sage/25 py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-sage/40 group-hover:bg-teal-sage transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest-slate">500+</div>
              <div className="text-xs md:text-sm text-forest-slate font-medium mt-2 tracking-wide uppercase">Clients Supported</div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-sage/40 group-hover:bg-teal-sage transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest-slate">10+</div>
              <div className="text-xs md:text-sm text-forest-slate font-medium mt-2 tracking-wide uppercase">Years of Practice</div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-sage/40 group-hover:bg-teal-sage transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest-slate">4</div>
              <div className="text-xs md:text-sm text-forest-slate font-medium mt-2 tracking-wide uppercase">Specialisations</div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-sage/40 group-hover:bg-teal-sage transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest-slate">100%</div>
              <div className="text-xs md:text-sm text-forest-slate font-medium mt-2 tracking-wide uppercase">Confidential Space</div>
            </div>

          </div>
        </div>

        {/* Section Transition Curve (flows Trust Bar into Focus Areas) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
          <svg className="relative block w-full h-[40px] md:h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,120 1200,0 L1200,120 L0,120 Z" fill="var(--color-warm-sand)" />
          </svg>
        </div>
      </section>

      {/* SECTION 3: WHAT WE HELP WITH */}
      <section className="py-24 bg-warm-sand relative">
        {/* Soft Organic SVGs in background */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-muted-sage/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-warm-tan/40 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-3 block">
              Our Focus Areas
            </span>
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-forest-slate leading-tight mb-4 text-balance">
              You Are Not Alone in What You&apos;re Feeling
            </h2>
            <p className="text-forest-slate/85 text-base md:text-lg text-pretty">
              We offer support across a wide range of mental health concerns, using approaches proven to make a lasting difference.
            </p>
          </div>

          {/* Cards Grid */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {focusAreas.map((area) => (
              <motion.div
                key={area.title}
                variants={fadeInUp}
                whileHover={{ y: -8, scale: 1.015, boxShadow: "0 16px 40px rgba(85, 102, 93, 0.12)" }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="glass-card p-8 rounded-2xl border border-muted-sage/20 hover:border-teal-sage/35 transition-all duration-300 shadow-warm-soft group"
              >
                <div className="w-12 h-12 rounded-full bg-teal-sage/10 flex items-center justify-center mb-6 group-hover:bg-teal-sage/20 transition-colors">
                  {area.icon}
                </div>
                <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-3">
                  {area.title}
                </h3>
                <p className="text-sm text-forest-slate/80 leading-relaxed text-pretty">
                  {area.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Section Transition Curve (flows Focus Areas into Pull-Statement) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg className="relative block w-full h-[50px] md:h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,120 Q600,0 1200,120 Z" fill="var(--color-warm-sand)" />
          </svg>
        </div>
      </section>

      {/* SECTION: EDITORIAL PULL-STATEMENT */}
      <section className="py-24 bg-warm-sand text-center relative overflow-hidden">
        {/* Soft decorative leaf branch graphic in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-teal-sage pointer-events-none">
          <svg width="400" height="400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5z" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4 block">
            Our Philosophy
          </span>
          <p className="font-cormorant text-3xl md:text-5xl lg:text-6xl italic font-semibold text-forest-slate leading-tight mb-4">
            &ldquo;Therapy is not about fixing what is broken, but discovering the resilience that was there all along.&rdquo;
          </p>
          <div className="w-16 h-[2px] bg-teal-sage/35 mx-auto mt-8" />
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section className="py-24 bg-muted-sage/20 relative">
        {/* Curved Divider at the top flow */}
        <div className="absolute top-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg className="relative block w-full h-[40px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,80 1200,0 L1200,120 L0,120 Z" fill="var(--color-warm-sand)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-3 block">
              The Process
            </span>
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-forest-slate mb-4">
              Starting is Simpler Than You Think
            </h2>
            <p className="text-forest-slate/85 text-base font-dmsans">
              Three steps to your first session.
            </p>
          </div>

          {/* Steps Row */}
          <div className="relative">
            {/* Desktop Connecting Line */}
            <div className="hidden lg:block absolute top-[60px] left-[15%] right-[15%] h-[1px] bg-teal-sage/20 z-0" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              {steps.map((step) => (
                <div 
                  key={step.num} 
                  className="glass-card p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 text-center flex flex-col items-center relative group overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-teal-sage/20 group-hover:bg-teal-sage transition-colors duration-300" />
                  
                  {/* Large Ghost Number */}
                  <div className="font-cormorant text-[90px] font-semibold text-teal-sage/10 select-none leading-none mb-2">
                    {step.num}
                  </div>
                  <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-forest-slate/75 leading-relaxed max-w-sm text-pretty font-dmsans">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section Transition Curve (flows How It Works into Section 5) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg className="relative block w-full h-[50px] md:h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,100 1200,0 L1200,120 L0,120 Z" fill="var(--color-warm-sand)" />
          </svg>
        </div>
      </section>

      {/* SECTION 5: MEET THE THERAPIST */}
      <section className="py-24 bg-warm-sand relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Portrait in Arch Frame */}
            <div className="lg:col-span-5 relative p-4 w-full max-w-sm mx-auto">
              <div className="absolute -inset-1 border border-teal-sage/20 rounded-t-full -z-10 translate-x-4 translate-y-4" />
              <div className="relative aspect-[4/5] rounded-t-full overflow-hidden shadow-warm-soft bg-warm-tan border border-muted-sage/35">
                <Image
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                  alt="Dr. Madhumati Dhumak - Warm smiling therapist looking professional in a cozy setting"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Right Column: Bio Content */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-3 block">
                Your Therapist
              </span>
              <h2 className="font-cormorant text-4xl md:text-[54px] font-semibold text-forest-slate mb-3 leading-tight">
                Dr. Madhumati Dhumak
              </h2>
              <span className="inline-block font-dmsans text-[11px] font-semibold tracking-wider text-teal-sage bg-muted-sage/15 border border-teal-sage/10 px-4 py-2 rounded-full mb-6 max-w-max">
                M.Phil Clinical Psychology · RCI Licensed
              </span>
              
              <div className="space-y-4 font-dmsans text-base text-forest-slate/90 leading-relaxed mb-6 text-pretty">
                <p>
                  I believe that therapy is a collaborative partnership. My approach is centered on creating a warm, non-judgmental atmosphere where you can safely explore your vulnerabilities, challenge deep-seated patterns, and build genuine self-compassion.
                </p>
                <p>
                  At Solis, therapy is entirely self-paced. We prioritize your emotional safety, personal boundaries, and absolute privacy. Our space is designed to be a sanctuary where you can catch your breath and begin your healing journey without any pressure or judgment.
                </p>
              </div>

              {/* Safe Space Assurance Badge */}
              <div className="bg-muted-sage/10 border border-muted-sage/20 p-5 rounded-2xl space-y-2 mb-6 max-w-lg shadow-sm">
                <h4 className="font-cormorant text-lg font-semibold text-teal-sage flex items-center gap-2">
                  <span>🍃</span> Sanctuary &amp; Confidentiality Guarantee
                </h4>
                <p className="text-xs text-forest-slate/80 leading-relaxed font-dmsans">
                  Every session is conducted with absolute privacy under strict clinical ethics. Your session speed, topics of discussion, and emotional boundaries are completely controlled by you.
                </p>
              </div>

              <Link 
                href="/about" 
                className="font-dmsans text-sm font-bold text-teal-sage hover:text-forest-slate hover:underline underline-offset-4 inline-flex items-center gap-1.5 transition-colors"
              >
                Meet the Full Team <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>

        {/* Section Transition Curve (flows Meet The Therapist into Testimonials) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg className="relative block w-full h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C300,90 900,90 1200,0 L1200,120 L0,120 Z" fill="var(--color-teal-sage)" />
          </svg>
        </div>
      </section>

      {/* SECTION 6: TESTIMONIALS (EDITORIAL PULL-QUOTES) */}
      <section className="py-28 bg-teal-sage text-warm-sand relative overflow-hidden">
        {/* Soft leaf graphic overlay in background */}
        <div className="absolute top-10 right-10 opacity-[0.04] text-warm-sand pointer-events-none">
          <svg width="250" height="250" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5zM2 2C2 2 9 3.5 11 9c1.5 4-1.5 5.5-1.5 5.5S4 13 4 8c0-3.5-2-6-2-6z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-20">
            <span className="text-[11px] font-bold tracking-[0.25em] text-warm-sand/80 uppercase mb-3 block">
              Testimonials
            </span>
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-warm-sand mb-4">
              What Our Clients Say
            </h2>
            <p className="text-warm-sand/85 text-base font-dmsans">
              Real experiences from individuals who took that first step.
            </p>
          </div>

          {/* Testimonial Magazine Pull-Quotes */}
          <div className="max-w-4xl mx-auto space-y-20">
            {testimonials.map((t) => (
              <div 
                key={t.author} 
                className="text-center border-b border-warm-sand/15 pb-16 last:border-0 last:pb-0"
              >
                {/* Stars Rating row */}
                <div className="flex justify-center gap-1 text-warm-sand/80 text-xs mb-6 tracking-widest">
                  {"★".repeat(t.rating || 5)}
                </div>
                <p className="font-cormorant italic text-2xl md:text-3xl lg:text-4xl text-warm-sand leading-relaxed max-w-3xl mx-auto mb-6 text-balance">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="text-[11px] font-bold tracking-[0.22em] text-warm-sand/70 uppercase font-dmsans">
                  {t.author} &mdash; {t.city}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Transition Curve (flows Testimonials into Appointment CTA) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
          <svg className="relative block w-full h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,80 1200,0 L1200,120 L0,120 Z" fill="var(--color-warm-sand)" />
          </svg>
        </div>
      </section>

      {/* SECTION 7: APPOINTMENT CTA BANNER */}
      <section className="py-24 bg-sand/40 text-center relative overflow-hidden">
        {/* Fine border dividing line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-terracotta/30" />
        
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-cormorant text-4xl md:text-5xl font-semibold text-charcoal mb-4">
            Ready to Take the First Step?
          </h2>
          <p className="font-dmsans text-sage text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed text-pretty">
            You don&apos;t need to have it all figured out before reaching out. We&apos;ll meet you where you are.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* WhatsApp CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-medium px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <PhoneCall className="w-5 h-5" />
              Book via WhatsApp
            </a>
            
            {/* Contact CTA */}
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
