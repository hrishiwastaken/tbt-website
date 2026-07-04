"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ShieldCheck, HeartHandshake, Award, Compass, Target } from "lucide-react";
import Container from "../../components/ui/Container";
import Surface from "../../components/ui/Surface";
import SectionHeading from "../../components/ui/SectionHeading";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { TEAM } from "../../lib/team-data";
import { SITE_NAME } from "../../lib/site";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const values = [
  {
    icon: <ShieldCheck className="w-7 h-7 text-ocean" />,
    title: "Confidentiality First",
    text: "We protect your stories with absolute discretion. Every conversation is guarded under strict clinical confidentiality guidelines.",
  },
  {
    icon: <Award className="w-7 h-7 text-ocean" />,
    title: "Evidence-Based Care",
    text: "Our methodologies are grounded in active research -- Cognitive Behavioral, Acceptance & Commitment, and Trauma-Informed modalities.",
  },
  {
    icon: <HeartHandshake className="w-7 h-7 text-ocean" />,
    title: "Human-Centred Practice",
    text: "We believe in people over diagnoses. Therapy is customized to respect your personal history, pace, values, and agency.",
  },
];

export default function About() {
  const founder = TEAM[0];

  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      {/* HERO */}
      <section className="pt-36 pb-20">
        <Container className="text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge tone="gold" className="mb-4">
              About Us
            </Badge>
            <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-ocean-deep leading-tight mb-6 text-balance">
              About {SITE_NAME}
            </h1>
            <p className="text-ink-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-pretty">
              We believe every person deserves a space where they feel seen, heard, and supported
              on their journey toward mental well-being.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* OUR STORY */}
      <section className="pb-24">
        <Container className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-2">
              Building a safe haven for healing
            </h2>
            <div className="text-ink-muted text-base md:text-lg space-y-5 leading-relaxed text-pretty">
              <p>
                {SITE_NAME} was founded with a singular, vital goal: to create a therapeutic
                environment that combines clinical excellence with genuine, authentic warmth.
                Traditional clinical spaces often feel cold or sterile -- we set out to change
                that, designing a practice that feels like entering a comfortable, peaceful room
                where you can catch your breath.
              </p>
              <p>
                Our philosophy is simple: therapy is not about &ldquo;fixing&rdquo; someone, but
                about exploring the layers of human experience together. We meet you exactly where
                you are -- whether you are navigating anxiety, relationship conflict, or seeking to
                understand yourself more deeply.
              </p>
            </div>
          </div>

          <Surface variant="raised" radius="panel" className="lg:col-span-5 relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80"
              alt="Soft natural sunlight filtering through leaves near a quiet reading space"
              fill
              sizes="(max-width: 1024px) 100vw, 35vw"
              className="object-cover"
            />
          </Surface>
        </Container>
      </section>

      {/* MISSION & VISION */}
      <section className="py-20 bg-surface-sunken/60">
        <Container className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Surface variant="raised" radius="surface" className="p-8 md:p-10">
            <div className="w-12 h-12 rounded-soft surface-inset flex items-center justify-center mb-5">
              <Target className="w-6 h-6 text-ocean" />
            </div>
            <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep mb-3">Our Mission</h3>
            <p className="text-sm md:text-base text-ink-muted leading-relaxed">
              To make compassionate, evidence-based psychological care approachable -- removing the
              stigma and clinical distance that keeps people from reaching out.
            </p>
          </Surface>
          <Surface variant="raised" radius="surface" className="p-8 md:p-10">
            <div className="w-12 h-12 rounded-soft surface-inset flex items-center justify-center mb-5">
              <Compass className="w-6 h-6 text-ocean" />
            </div>
            <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep mb-3">Our Vision</h3>
            <p className="text-sm md:text-base text-ink-muted leading-relaxed">
              A world where seeking mental health support feels as natural and welcomed as any
              other form of care for wellbeing.
            </p>
          </Surface>
        </Container>
      </section>

      {/* VALUES */}
      <section className="py-24">
        <Container>
          <SectionHeading
            eyebrow="What Guides Us"
            title="The principles behind our practice"
            description="Our core values form the foundation of how we treat every individual who reaches out."
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14"
          >
            {values.map((v) => (
              <motion.div key={v.title} variants={fadeInUp}>
                <Surface variant="raised" radius="surface" interactive className="p-8 h-full">
                  <div className="w-12 h-12 rounded-soft surface-inset flex items-center justify-center mb-5">
                    {v.icon}
                  </div>
                  <h3 className="font-cormorant text-xl font-semibold text-ocean-deep mb-3">{v.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{v.text}</p>
                </Surface>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* TEAM */}
      <section className="py-24 bg-surface-sunken/60">
        <Container>
          <SectionHeading
            eyebrow="Our Practitioner"
            title="Meet the team"
            description="A compassionate professional here to walk alongside you."
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-14"
          >
            {TEAM.map((t) => (
              <motion.div key={t.slug} variants={fadeInUp}>
                <Surface variant="raised" radius="surface" interactive className="overflow-hidden flex flex-col h-full">
                  <div className="relative h-72 w-full">
                    <Image
                      src={t.photo}
                      alt={`${t.name} - ${t.role}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 30vw"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="p-8 flex flex-col justify-between flex-grow">
                    <div>
                      <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep mb-1">{t.name}</h3>
                      <p className="text-xs text-ocean font-semibold mb-3">{t.role}</p>
                      <Badge tone="sand" className="mb-4">
                        {t.qualification}
                      </Badge>
                      <p className="text-sm text-ink-muted leading-relaxed mb-6">{t.intro}</p>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-6">
                        <div>
                          <dt className="uppercase tracking-wide text-ink-muted/70">Experience</dt>
                          <dd className="text-ocean-deep font-medium">{t.experience}</dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-ink-muted/70">Fee</dt>
                          <dd className="text-ocean-deep font-medium">{t.fee}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="uppercase tracking-wide text-ink-muted/70">Languages</dt>
                          <dd className="text-ocean-deep font-medium">{t.languages.join(", ")}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="border-t border-ocean/10 pt-4 flex flex-wrap gap-1.5">
                      {t.specialisations.map((tag) => (
                        <Badge key={tag} tone="ocean">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Surface>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <Container className="max-w-2xl">
          <h2 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-4">
            We are here to support your path forward.
          </h2>
          <p className="text-sm md:text-base text-ink-muted mb-8">
            Speak with one of our coordinators to find the right fit for your needs.
          </p>
          <Button href="/contact" size="lg">
            Schedule a Consultation
          </Button>
        </Container>
      </section>
    </div>
  );
}
