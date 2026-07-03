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
      {/* SECTION 1: HERO (STILLPOINT LAYOUT REPLICATION) */}
      <section className="relative min-h-[90vh] pt-[120px] pb-32 bg-warm-white overflow-hidden">
        
        {/* Faint Concentric Outline Circles (StillPoint style) */}
        <div className="absolute top-[10%] left-[32%] w-[420px] h-[420px] rounded-full border border-forest-slate/10 -z-10 pointer-events-none hidden lg:block" />
        <div className="absolute top-[18%] left-[28%] w-[420px] h-[420px] rounded-full border border-forest-slate/5 -z-10 pointer-events-none hidden lg:block" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          
          {/* Left Column (5 Cols): Arched shape containing the therapist portrait */}
          <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-start lg:-ml-24 xl:-ml-36">
            
            <div 
              className="relative w-full max-w-[390px] aspect-[4/5] overflow-hidden bg-forest-slate shadow-2xl border-t border-r border-muted-sage/20 flex items-end"
              style={{ borderRadius: "0 280px 0 0" }}
            >
              <Image
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
                alt="Dr. Madhumati Dhumak - Clinical Psychologist"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 35vw"
                className="object-cover object-top filter brightness-[0.93] contrast-[1.02]"
              />
            </div>
            
          </div>

          {/* Right Column (7 Cols): Overlapping Rounded white Card with the content (rounded left side pill-like shape) */}
          <div className="lg:col-span-7 flex flex-col justify-center lg:-ml-20 relative z-10">
            <div className="bg-warm-white p-8 md:p-16 lg:py-20 lg:px-24 rounded-l-[140px] rounded-r-[40px] border border-muted-sage/20 shadow-warm-soft max-w-2xl">
              <span className="inline-block text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4 font-dmsans">
                Professional Psychology Practice
              </span>
              <h1 className="font-cormorant text-4xl md:text-5xl lg:text-[56px] font-semibold text-forest-slate leading-[1.1] mb-6">
                You Deserve to Feel Like Yourself Again
              </h1>
              <p className="text-sm md:text-base text-forest-slate/90 leading-relaxed mb-8 font-dmsans text-pretty">
                Compassionate, evidence-based therapy for individuals, couples, and families. A warm, clinical sanctuary to begin your healing journey.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link 
                  href="/book"
                  className="bg-teal-sage hover:bg-forest-slate text-warm-sand text-center font-semibold px-8 py-3.5 rounded-full shadow-md hover:shadow-warm-soft transition-all duration-300 btn-shimmer text-sm"
                >
                  Book a Consultation
                </Link>
                <Link 
                  href="/services"
                  className="border border-teal-sage/30 text-teal-sage hover:bg-teal-sage hover:text-warm-sand text-center font-semibold px-8 py-3.5 rounded-full transition-all duration-300 btn-shimmer text-sm"
                >
                  Our Services
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* Section Transition Curve (flows Hero into Focus Areas - Dipping Concave Curve) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
          <svg className="relative block w-full h-[80px] md:h-[120px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,160 1200,0 L1200,120 L0,120 Z" fill="var(--color-muted-sage)" />
          </svg>
        </div>
      </section>

      {/* SECTION 2: WHAT WE HELP WITH (STILLPOINT GREEN BLOCK) */}
      <section className="bg-muted-sage py-24 relative overflow-hidden">
        {/* Soft floating leaves in background */}
        <div className="absolute top-[10%] right-[5%] opacity-[0.05] text-warm-white pointer-events-none hidden md:block">
          <svg width="220" height="220" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          
          {/* Header Layout (StillPoint style) */}
          <div className="max-w-6xl mx-auto mb-20 relative px-4">
            {/* Left and Right Eyebrows (Desktop Only) */}
            <div className="hidden md:flex justify-between items-center w-full absolute top-1.5 left-0 right-0 pointer-events-none z-0">
              <span className="text-[10px] font-bold tracking-[0.25em] text-warm-sand/80 uppercase">Your Journey</span>
              <span className="text-[10px] font-bold tracking-[0.25em] text-warm-sand/80 uppercase">Starts Here</span>
            </div>
            
            {/* Mobile Eyebrow fallback */}
            <div className="flex md:hidden items-center justify-center gap-4 mb-4">
              <span className="text-[10px] font-bold tracking-[0.25em] text-warm-sand/80 uppercase">Your Journey</span>
              <div className="w-1 h-1 rounded-full bg-warm-sand/40" />
              <span className="text-[10px] font-bold tracking-[0.25em] text-warm-sand/80 uppercase">Starts Here</span>
            </div>

            {/* Centered Heading */}
            <div className="text-center max-w-xl mx-auto relative z-10">
              <h2 className="font-cormorant text-3xl md:text-5xl font-semibold text-warm-sand tracking-[0.02em] uppercase leading-tight mb-6">
                Building a Better Future Together
              </h2>
              <p className="text-warm-sand/85 text-xs md:text-sm leading-relaxed font-dmsans max-w-md mx-auto text-pretty">
                We provide structured support pathways for various clinical mental health requirements, using approaches proven to make a lasting difference.
              </p>
            </div>
          </div>

          {/* Three Arch-topped Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            {/* Card 1: Individual Therapy */}
            <div className="bg-warm-white p-6 rounded-[32px] border border-warm-sand/15 shadow-warm-soft flex flex-col justify-between items-center text-center hover:shadow-lg transition-shadow duration-300">
              <div>
                <div className="relative aspect-[3/4] w-full rounded-t-full overflow-hidden mb-6 border border-muted-sage/10 bg-warm-tan">
                  <Image
                    src="https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=800&q=80"
                    alt="Individual therapy session"
                    fill
                    sizes="(max-width: 768px) 100vw, 30vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-2">Individual Therapy</h3>
                <p className="text-xs md:text-sm text-forest-slate/80 leading-relaxed mb-6 px-2 font-dmsans">
                  One-on-one sessions tailored specifically to you. Process emotional pain, challenge deep-seated patterns, and build genuine coping skills.
                </p>
              </div>
              <Link 
                href="/book" 
                className="font-dmsans text-[10px] font-bold tracking-[0.2em] text-teal-sage hover:text-forest-slate uppercase underline underline-offset-4 mb-2"
              >
                Book Now
              </Link>
            </div>

            {/* Card 2: Couples counseling */}
            <div className="bg-warm-white p-6 rounded-[32px] border border-warm-sand/15 shadow-warm-soft flex flex-col justify-between items-center text-center hover:shadow-lg transition-shadow duration-300">
              <div>
                <div className="relative aspect-[3/4] w-full rounded-t-full overflow-hidden mb-6 border border-muted-sage/10 bg-warm-tan">
                  <Image
                    src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80"
                    alt="Couples therapy session"
                    fill
                    sizes="(max-width: 768px) 100vw, 30vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-2">Couples Counseling</h3>
                <p className="text-xs md:text-sm text-forest-slate/80 leading-relaxed mb-6 px-2 font-dmsans">
                  A structured, neutral space to resolve conflict, dismantle communication barriers, and restore intimacy. Open to couples at any stage.
                </p>
              </div>
              <Link 
                href="/book" 
                className="font-dmsans text-[10px] font-bold tracking-[0.2em] text-teal-sage hover:text-forest-slate uppercase underline underline-offset-4 mb-2"
              >
                Book Now
              </Link>
            </div>

            {/* Card 3: Family Systems */}
            <div className="bg-warm-white p-6 rounded-[32px] border border-warm-sand/15 shadow-warm-soft flex flex-col justify-between items-center text-center hover:shadow-lg transition-shadow duration-300">
              <div>
                <div className="relative aspect-[3/4] w-full rounded-t-full overflow-hidden mb-6 border border-muted-sage/10 bg-warm-tan">
                  <Image
                    src="https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?auto=format&fit=crop&w=800&q=80"
                    alt="Family session"
                    fill
                    sizes="(max-width: 768px) 100vw, 30vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="font-cormorant text-2xl font-semibold text-forest-slate mb-2">Family Therapy</h3>
                <p className="text-xs md:text-sm text-forest-slate/80 leading-relaxed mb-6 px-2 font-dmsans">
                  Improve communication dynamics, boundary-setting, and conflict resolution mechanisms within family and systemic structures.
                </p>
              </div>
              <Link 
                href="/book" 
                className="font-dmsans text-[10px] font-bold tracking-[0.2em] text-teal-sage hover:text-forest-slate uppercase underline underline-offset-4 mb-2"
              >
                Book Now
              </Link>
            </div>

          </div>

        </div>

        {/* Section Transition Curve (concave dip flowing back to warm white) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
          <svg className="relative block w-full h-[60px] md:h-[90px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,120 Q600,0 1200,120 L1200,120 L0,120 Z" fill="var(--color-warm-white)" />
          </svg>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS */}
      <section className="py-24 bg-warm-white relative">
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

        {/* Section Transition Curve (flows How It Works into Section 4 - Therapist Bio) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg className="relative block w-full h-[50px] md:h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,100 1200,0 L1200,120 L0,120 Z" fill="var(--color-warm-sand)" className="opacity-30" />
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
            <path d="M0,0 C300,90 900,90 1200,0 L1200,120 L0,120 Z" fill="var(--color-warm-white)" />
          </svg>
        </div>
      </section>

      {/* SECTION 5: TESTIMONIALS (EDITORIAL PULL-QUOTES ON WARM WHITE) */}
      <section className="py-28 bg-warm-white text-forest-slate relative overflow-hidden">
        {/* Soft leaf graphic overlay in background */}
        <div className="absolute top-10 right-10 opacity-[0.04] text-teal-sage pointer-events-none">
          <svg width="250" height="250" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5zM2 2C2 2 9 3.5 11 9c1.5 4-1.5 5.5-1.5 5.5S4 13 4 8c0-3.5-2-6-2-6z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 pt-12">
          {/* Testimonial Magazine Pull-Quotes */}
          <div className="max-w-4xl mx-auto space-y-20">
            {testimonials.map((t) => (
              <div 
                key={t.author} 
                className="text-center border-b border-muted-sage/20 pb-16 last:border-0 last:pb-0"
              >
                {/* Stars Rating row */}
                <div className="flex justify-center gap-1 text-teal-sage/85 text-xs mb-6 tracking-widest">
                  {"★".repeat(t.rating || 5)}
                </div>
                <p className="font-cormorant italic text-2xl md:text-3xl lg:text-4xl text-forest-slate leading-relaxed max-w-3xl mx-auto mb-6 text-balance">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="text-[11px] font-bold tracking-[0.22em] text-forest-slate/70 uppercase font-dmsans">
                  {t.author} &mdash; {t.city}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Transition Curve (flows Testimonials into Appointment CTA) */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
          <svg className="relative block w-full h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 Q600,80 1200,0 L1200,120 L0,120 Z" fill="var(--color-warm-sand)" className="opacity-40" />
          </svg>
        </div>
      </section>

      {/* SECTION 6: APPOINTMENT CTA BANNER */}
      <section className="py-24 bg-warm-sand/35 text-center relative overflow-hidden">
        {/* Fine border dividing line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-teal-sage/20" />
        
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-cormorant text-4xl md:text-5xl font-semibold text-forest-slate mb-4">
            Ready to Take the First Step?
          </h2>
          <p className="font-dmsans text-forest-slate/85 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed text-pretty">
            You don&apos;t need to have it all figured out before reaching out. We&apos;ll meet you where you are.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* WhatsApp CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 btn-shimmer"
            >
              <PhoneCall className="w-5 h-5" />
              Book via WhatsApp
            </a>
            
            {/* Contact CTA */}
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-teal-sage hover:bg-forest-slate text-warm-sand font-semibold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 btn-shimmer"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
