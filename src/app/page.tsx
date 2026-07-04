"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { PhoneCall, ArrowRight, ShieldCheck, Sparkles, Users } from "lucide-react";
import Container from "../components/ui/Container";
import Button from "../components/ui/Button";
import Surface from "../components/ui/Surface";
import Badge from "../components/ui/Badge";
import SectionHeading from "../components/ui/SectionHeading";
import { SERVICES } from "../lib/services-data";
import { TEAM } from "../lib/team-data";
import { WHATSAPP_URL, SITE_NAME } from "../lib/site";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  const steps = [
    {
      num: "01",
      title: "Reach Out",
      description: "Send us a WhatsApp message or fill out the contact form. We'll respond within 24 hours.",
    },
    {
      num: "02",
      title: "Free Consultation",
      description: "A short, no-pressure call to understand your needs and match you with the right support.",
    },
    {
      num: "03",
      title: "Begin Your Journey",
      description: "Book your first session at a time that works for you, in person or online.",
    },
  ];

  const testimonials = [
    {
      quote:
        "For the first time in my life, I felt truly heard and understood. The space was calm, and the guidance helped me find my footing again.",
      author: "Sarah",
      city: "New Delhi",
    },
    {
      quote:
        "Managing my anxiety felt impossible. Working together, I gained practical tools that changed how I handle daily stress.",
      author: "Rahul",
      city: "Gurugram",
    },
    {
      quote:
        "As a couple, we had hit a wall in our communication. The sessions gave us a structured space to reconnect.",
      author: "Priya & Amit",
      city: "Noida",
    },
  ];

  const founder = TEAM[0];

  return (
    <div className="overflow-hidden bg-ivory font-dmsans">
      {/* HERO -- Stage 1: Safety */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute top-24 -right-24 w-[420px] h-[420px] rounded-full bg-blush/40 blur-3xl -z-10" />
        <div className="absolute bottom-0 -left-24 w-[360px] h-[360px] rounded-full bg-gold/30 blur-3xl -z-10" />

        <Container className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="lg:col-span-5 relative order-2 lg:order-1"
          >
            <div className="relative aspect-[4/5] w-full max-w-sm mx-auto lg:mx-0">
              <div className="absolute -inset-3 rounded-panel bg-gold/25 rotate-3 -z-10" />
              <Surface variant="raised" radius="panel" className="relative w-full h-full overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
                  alt={`${founder.name}, ${founder.role} at ${SITE_NAME}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 80vw, 35vw"
                  className="object-cover"
                />
              </Surface>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7 order-1 lg:order-2"
          >
            <Badge tone="gold" className="mb-6">
              {SITE_NAME}
            </Badge>
            <h1 className="font-cormorant text-4xl md:text-5xl lg:text-6xl font-semibold text-ocean-deep leading-[1.1] mb-6 text-balance">
              A calm space to feel like yourself again
              <span className="block font-hand text-2xl md:text-3xl text-ocean font-normal mt-2">
                one conversation at a time
              </span>
            </h1>
            <p className="text-base md:text-lg text-ink-muted leading-relaxed mb-4 max-w-xl text-pretty">
              Hi, I&apos;m {founder.name.replace("Dr. ", "")}. {SITE_NAME} is a modern psychology
              practice built around compassionate, evidence-based care for individuals, couples,
              and families -- warm and approachable, never clinical or cold.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button href="/book" size="lg">
                Book Appointment
              </Button>
              <Button href="/services" variant="outline" size="lg">
                Explore Services
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ABOUT TEASER -- Stage 1/2: Safety + Curiosity */}
      <section className="py-20 md:py-28">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
          >
            <SectionHeading
              eyebrow="Our Story"
              title="Modern psychological care, without the clinical distance"
              description={`${SITE_NAME} was founded to be a sanctuary where scientific insight meets deep, non-judgmental human empathy -- a place designed around how people actually feel when they reach out for help.`}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14"
          >
            {[
              {
                icon: <ShieldCheck className="w-6 h-6 text-ocean" />,
                title: "Confidentiality First",
                text: "Every conversation is guarded under strict clinical confidentiality, with your pace fully in your control.",
              },
              {
                icon: <Sparkles className="w-6 h-6 text-ocean" />,
                title: "Evidence-Based Care",
                text: "CBT, ACT, and trauma-informed modalities grounded in active clinical research.",
              },
              {
                icon: <Users className="w-6 h-6 text-ocean" />,
                title: "Human-Centred Practice",
                text: "We see people, not checklists -- therapy shaped around your history, values, and agency.",
              },
            ].map((v) => (
              <motion.div key={v.title} variants={fadeInUp}>
                <Surface variant="raised" radius="surface" interactive className="p-8 h-full">
                  <div className="w-12 h-12 rounded-soft surface-inset flex items-center justify-center mb-5">
                    {v.icon}
                  </div>
                  <h3 className="font-cormorant text-xl font-semibold text-ocean-deep mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{v.text}</p>
                </Surface>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* SERVICES -- Stage 3: Recognition */}
      <section className="py-20 md:py-28 bg-surface-sunken/60">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
          >
            <SectionHeading
              eyebrow="What We Offer"
              title="Support built around your situation"
              description="Five focused pathways of care, each shaped to meet you where you are."
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14"
          >
            {SERVICES.map((service) => (
              <motion.div key={service.slug} variants={fadeInUp}>
                <Surface
                  variant="raised"
                  radius="surface"
                  interactive
                  className="p-8 h-full flex flex-col"
                >
                  <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep mb-2">
                    {service.name}
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed mb-6 flex-grow">
                    {service.tagline}
                  </p>
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-deep transition-colors"
                  >
                    Learn More <ArrowRight className="w-4 h-4" />
                  </Link>
                </Surface>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* TEAM -- Stage 4: Human Trust */}
      <section className="py-20 md:py-28">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
          >
            <SectionHeading eyebrow="Meet The Team" title="The person behind The Brain Tea" />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="mt-14 max-w-4xl mx-auto"
          >
            <Surface variant="raised" radius="panel" className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-4">
                <div className="relative aspect-[4/5] rounded-surface overflow-hidden">
                  <Image
                    src={founder.photo}
                    alt={founder.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 30vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="md:col-span-8">
                <h3 className="font-cormorant text-2xl md:text-3xl font-semibold text-ocean-deep mb-1">
                  {founder.name}
                </h3>
                <p className="text-sm text-ocean font-semibold mb-4">{founder.role}</p>
                <p className="text-sm text-ink-muted leading-relaxed mb-5 text-pretty">{founder.intro}</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-muted mb-0.5">Qualification</dt>
                    <dd className="text-ocean-deep font-medium">{founder.qualification}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-muted mb-0.5">Experience</dt>
                    <dd className="text-ocean-deep font-medium">{founder.experience}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-muted mb-0.5">Languages</dt>
                    <dd className="text-ocean-deep font-medium">{founder.languages.join(", ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-muted mb-0.5">Consultation Fee</dt>
                    <dd className="text-ocean-deep font-medium">{founder.fee}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 mt-5">
                  {founder.specialisations.map((s) => (
                    <Badge key={s} tone="sand">
                      {s}
                    </Badge>
                  ))}
                </div>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-deep mt-6 transition-colors"
                >
                  Read Full Story <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </Surface>
          </motion.div>
        </Container>
      </section>

      {/* HOW IT WORKS -- Stage 5: Reduced Uncertainty */}
      <section className="py-20 md:py-28 bg-surface-sunken/60">
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeInUp}
          >
            <SectionHeading
              eyebrow="The Process"
              title="Starting is simpler than you think"
              description="Three steps to your first session."
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-14"
          >
            {steps.map((step) => (
              <motion.div key={step.num} variants={fadeInUp}>
                <Surface variant="raised" radius="surface" className="p-8 h-full text-center">
                  <div className="font-cormorant text-6xl font-semibold text-ocean/15 leading-none mb-3">
                    {step.num}
                  </div>
                  <h3 className="font-cormorant text-xl font-semibold text-ocean-deep mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{step.description}</p>
                </Surface>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* TESTIMONIALS -- Stage 4/5 continued */}
      <section className="py-20 md:py-28">
        <Container>
          <div className="max-w-3xl mx-auto space-y-16">
            {testimonials.map((t) => (
              <motion.div
                key={t.author}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeInUp}
                className="text-center"
              >
                <div className="flex justify-center gap-1 text-gold text-sm mb-5" aria-hidden="true">
                  {"★".repeat(5)}
                </div>
                <p className="font-cormorant italic text-xl md:text-2xl text-ocean-deep leading-relaxed mb-5 text-balance">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="text-xs font-bold tracking-[0.2em] text-ink-muted uppercase">
                  {t.author} &mdash; {t.city}
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* FINAL CTA -- Stage 6: Action */}
      <section className="py-20 md:py-28">
        <Container>
          <Surface variant="raised" radius="panel" className="p-10 md:p-16 text-center max-w-3xl mx-auto">
            <h2 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-4">
              Ready to take the first step?
            </h2>
            <p className="text-ink-muted text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed text-pretty">
              You don&apos;t need to have it all figured out before reaching out. We&apos;ll meet you
              where you are.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold px-8 py-3.5 rounded-full shadow-surface-raised-sm hover:shadow-surface-raised hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <PhoneCall className="w-5 h-5" />
                Book via WhatsApp
              </a>
              <Button href="/contact" variant="primary" size="lg" className="w-full sm:w-auto">
                Contact Us
              </Button>
            </div>
          </Surface>
        </Container>
      </section>
    </div>
  );
}
