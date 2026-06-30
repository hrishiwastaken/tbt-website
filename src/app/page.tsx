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
      
      {/* SECTION 1: HERO (SPLIT LAYOUT) */}
      <section className="relative min-h-[95vh] flex flex-col md:flex-row items-stretch pt-[80px]">
        {/* Organic Floating Shapes */}
        <div className="absolute top-[15%] left-[5%] opacity-[0.12] text-forest animate-float-slow pointer-events-none hidden md:block">
          <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5z" fill="currentColor" fillOpacity="0.05" />
            <path d="M9 19c2-3 5-6 8-11" />
            <path d="M11 16c1.5-1 3-2 4-4" />
            <path d="M13 13.5c1.2-.8 2.4-1.6 3.2-3.2" />
            <path d="M10 17.5c1-.5 2-1 2.5-2" />
          </svg>
        </div>
        <div className="absolute bottom-[15%] right-[58%] opacity-[0.12] text-sage animate-float-reverse pointer-events-none hidden md:block">
          <svg width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2C2 2 9 3.5 11 9c1.5 4-1.5 5.5-1.5 5.5S4 13 4 8c0-3.5-2-6-2-6z" fill="currentColor" fillOpacity="0.05" />
            <path d="M2 2c2 3 5 7 7.5 12.5" />
            <path d="M4.5 5c1 1.5 2 3 3 5" />
            <path d="M6 8c.8 1.2 1.6 2.4 2.4 4" />
          </svg>
        </div>

        {/* Left Column (Overlay Layout on Desktop) */}
        <div className="w-full md:w-[47%] bg-ivory px-6 py-16 md:py-24 md:pl-16 md:pr-14 flex flex-col justify-center relative z-10 md:-mr-16 md:my-10 md:rounded-r-3xl border-y border-r border-mist/30 bg-ivory/90 backdrop-blur-md shadow-warm-soft">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-xl mx-auto md:mx-0"
          >
            {/* Eyebrow */}
            <motion.span 
              variants={fadeInUp}
              className="inline-block text-xs font-semibold tracking-[0.18em] text-terracotta uppercase mb-4"
            >
              Professional Psychology Practice
            </motion.span>
            
            {/* H1 Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="font-cormorant text-5xl md:text-6xl lg:text-[72px] font-semibold text-charcoal leading-[1.1] tracking-[-0.02em] mb-6 text-balance"
            >
              You Deserve to Feel Like Yourself Again
            </motion.h1>

            {/* Subhead */}
            <motion.p 
              variants={fadeInUp}
              className="text-base md:text-lg text-sage leading-relaxed mb-8 text-pretty"
            >
              Compassionate, evidence-based therapy for individuals, couples, and families. A safe space to begin.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6"
            >
              <Link 
                href="/book"
                className="bg-forest hover:bg-terracotta text-warm-white text-center font-medium px-8 py-3.5 rounded-full shadow-md hover:shadow-warm-soft transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer"
              >
                Book a Consultation
              </Link>
              <Link 
                href="/services"
                className="border border-forest/30 text-forest hover:bg-forest hover:text-warm-white text-center font-medium px-8 py-3.5 rounded-full transition-all duration-300 btn-shimmer"
              >
                Our Services
              </Link>
            </motion.div>

            {/* Reassurance */}
            <motion.p 
              variants={fadeInUp}
              className="text-xs text-sage flex items-center gap-1.5"
            >
              <span>🔒</span> All sessions are strictly confidential
            </motion.p>
          </motion.div>
        </div>

        {/* Right Column (55% Width) */}
        <div className="w-full md:w-[55%] relative min-h-[40vh] md:min-h-0 bg-sand">
          <Image
            src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
            alt="Warm softly lit therapy room interior with armchair and potted plant"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 55vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* SECTION 2: TRUST BAR */}
      <section className="bg-sand/35 py-12 border-y border-mist/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-terracotta/40 group-hover:bg-terracotta transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest">500+</div>
              <div className="text-xs md:text-sm text-charcoal font-medium mt-2 tracking-wide uppercase">Clients Supported</div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-terracotta/40 group-hover:bg-terracotta transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest">10+</div>
              <div className="text-xs md:text-sm text-charcoal font-medium mt-2 tracking-wide uppercase">Years of Practice</div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-terracotta/40 group-hover:bg-terracotta transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest">4</div>
              <div className="text-xs md:text-sm text-charcoal font-medium mt-2 tracking-wide uppercase">Specialisations</div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-terracotta/40 group-hover:bg-terracotta transition-colors duration-300" />
              <div className="font-cormorant text-5xl md:text-6xl font-semibold text-forest">100%</div>
              <div className="text-xs md:text-sm text-charcoal font-medium mt-2 tracking-wide uppercase">Confidential Space</div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: WHAT WE HELP WITH */}
      <section className="py-24 bg-ivory relative">
        {/* Soft Organic SVGs in background */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-mist/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-sand/40 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase mb-3 block">
              Our Focus Areas
            </span>
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-charcoal leading-tight mb-4 text-balance">
              You Are Not Alone in What You&apos;re Feeling
            </h2>
            <p className="text-sage text-base md:text-lg text-pretty">
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
                whileHover={{ y: -8, scale: 1.015, boxShadow: "0 16px 40px rgba(46, 74, 56, 0.12)" }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="glass-card p-8 rounded-2xl border border-mist/30 hover:border-forest/35 transition-all duration-300 shadow-warm-soft group"
              >
                <div className="w-12 h-12 rounded-full bg-mist/40 flex items-center justify-center mb-6 group-hover:bg-mist/75 transition-colors">
                  {area.icon}
                </div>
                <h3 className="font-cormorant text-2xl font-semibold text-charcoal mb-3">
                  {area.title}
                </h3>
                <p className="text-sm text-sage leading-relaxed text-pretty">
                  {area.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section className="py-24 bg-mist/20 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-charcoal mb-4">
              Starting is Simpler Than You Think
            </h2>
            <p className="text-sage text-base">
              Three steps to your first session.
            </p>
          </div>

          {/* Steps Row */}
          <div className="relative">
            {/* Desktop Connecting Line */}
            <div className="hidden lg:block absolute top-[60px] left-[15%] right-[15%] h-[1px] bg-sage/20 z-0" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              {steps.map((step) => (
                <div 
                  key={step.num} 
                  className="glass-card p-8 rounded-2xl shadow-sm hover:shadow-warm-soft transition-all duration-300 text-center flex flex-col items-center relative group overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-forest/20 group-hover:bg-forest transition-colors duration-300" />
                  
                  {/* Large Ghost Number */}
                  <div className="font-cormorant text-[90px] font-semibold text-forest/10 select-none leading-none mb-2">
                    {step.num}
                  </div>
                  <h3 className="font-cormorant text-2xl font-semibold text-charcoal mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-sage leading-relaxed max-w-sm text-pretty">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: MEET THE THERAPIST */}
      <section className="py-24 bg-ivory">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            
            {/* Left Column: Portrait */}
            <div className="relative p-4 w-full max-w-md mx-auto">
              <div className="absolute -inset-1 border border-terracotta/20 rounded-3xl -z-10 translate-x-4 translate-y-4" />
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-warm-soft bg-sand">
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
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold tracking-[0.18em] text-terracotta uppercase mb-3 block">
                Your Therapist
              </span>
              <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-charcoal mb-2 leading-tight">
                Dr. Madhumati Dhumak
              </h2>
              <span className="inline-block font-dmsans text-xs text-forest bg-mist/30 border border-forest/10 px-3 py-1.5 rounded-full mb-6 max-w-max">
                M.Phil Clinical Psychology · RCI Licensed
              </span>
              
              <div className="space-y-4 font-dmsans text-base text-sage leading-relaxed mb-6 text-pretty">
                <p>
                  I believe that therapy is a collaborative partnership. My approach is centered on creating a warm, non-judgmental atmosphere where you can safely explore your vulnerabilities, challenge deep-seated patterns, and build genuine self-compassion.
                </p>
                <p>
                  At Solis, therapy is entirely self-paced. We prioritize your emotional safety, personal boundaries, and absolute privacy. Our space is designed to be a sanctuary where you can catch your breath and begin your healing journey without any pressure or judgment.
                </p>
              </div>

              {/* Safe Space Assurance Badge */}
              <div className="bg-mist/20 border border-forest/10 p-5 rounded-2xl space-y-2 mb-6 max-w-lg shadow-sm">
                <h4 className="font-cormorant text-lg font-semibold text-forest flex items-center gap-2">
                  <span>🍃</span> Sanctuary &amp; Confidentiality Guarantee
                </h4>
                <p className="text-xs text-sage leading-relaxed">
                  Every session is conducted with absolute privacy under strict clinical ethics. Your session speed, topics of discussion, and emotional boundaries are completely controlled by you.
                </p>
              </div>

              <Link 
                href="/about" 
                className="font-dmsans text-sm font-semibold text-terracotta hover:text-forest hover:underline underline-offset-4 inline-flex items-center gap-1.5 transition-colors"
              >
                Meet the Full Team <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 6: TESTIMONIALS */}
      <section className="py-24 bg-forest text-warm-white relative">
        {/* Soft leaf graphic overlay in background */}
        <div className="absolute top-10 right-10 opacity-5 pointer-events-none">
          <svg width="200" height="200" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 8C8 10 9 19 9 19s8-.5 10-6.5c1.5-4.5-2-4.5-2-4.5zM2 2C2 2 9 3.5 11 9c1.5 4-1.5 5.5-1.5 5.5S4 13 4 8c0-3.5-2-6-2-6z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="font-cormorant text-4xl md:text-[48px] font-semibold text-warm-white mb-4">
              What Our Clients Say
            </h2>
            <p className="text-mist text-base font-dmsans">
              Real words from people who took that first step.
            </p>
          </div>

          {/* Testimonial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div 
                key={t.author} 
                className="bg-warm-white/10 border border-warm-white/20 rounded-2xl p-8 flex flex-col justify-between hover:bg-warm-white/15 hover:border-warm-white/35 transition-all duration-300 hover:-translate-y-1 shadow-warm-soft"
              >
                <div>
                  {/* Quote Icon */}
                  <div className="font-cormorant italic text-[80px] text-terracotta leading-none select-none mb-2">
                    &ldquo;
                  </div>
                  <p className="font-cormorant italic text-lg text-warm-white leading-relaxed mb-6">
                    {t.quote}
                  </p>
                </div>
                <div className="font-dmsans text-xs text-mist font-medium">
                  &mdash; {t.author}, {t.city}
                </div>
              </div>
            ))}
          </div>
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
