import { GraduationCap, Users, FileCheck, Award, ClipboardList } from "lucide-react";
import Container from "../../components/ui/Container";
import Surface from "../../components/ui/Surface";
import Badge from "../../components/ui/Badge";
import SectionHeading from "../../components/ui/SectionHeading";
import InternshipApplicationForm from "../../components/InternshipApplicationForm";

export const metadata = {
  title: "Internship Program | The Brain Tea",
  description: "Graduate and postgraduate psychology internships with mentorship and clinical exposure.",
};

const PROGRAMS = [
  {
    title: "BA Psychology -- Administrative Focus",
    audience: "Graduate Internship",
    duration: "6 months",
    commitment: "4 hours/day -- 25 hours/week",
    stipend: "₹5,000/month",
    learning: [
      "Clinic administration",
      "Client coordination",
      "Appointment scheduling",
      "Professional communication",
      "Social media support",
      "Workshop coordination",
      "Mental-health awareness",
      "Administrative operations",
    ],
    eligibility: [
      "BA/BSc Psychology student or graduate",
      "Good communication skills",
      "Interest in mental health",
    ],
  },
  {
    title: "MA Psychology -- Clinical Focus",
    audience: "Postgraduate Internship",
    duration: "4 weeks, extendable",
    commitment: "Supervision fee: ₹6,000",
    stipend: null,
    learning: [
      "Case discussions",
      "Clinical observation",
      "Psychological assessments",
      "Report writing",
      "Treatment planning",
      "Ethics & confidentiality",
      "Clinical documentation",
      "Individual supervision",
      "Weekly feedback",
    ],
    eligibility: [
      "MA/MSc Psychology student or graduate",
      "Basic counselling knowledge",
      "Interest in psychotherapy",
    ],
  },
];

const BENEFITS = [
  "Individual mentorship",
  "Practical learning",
  "Clinical exposure",
  "Professional development",
  "Internship certificate",
  "Performance-based recommendation letter",
];

const STEPS = [
  { icon: <ClipboardList className="w-6 h-6 text-teal-sage" />, title: "Submit Application" },
  { icon: <FileCheck className="w-6 h-6 text-teal-sage" />, title: "Application Review" },
  { icon: <Users className="w-6 h-6 text-teal-sage" />, title: "Interview" },
  { icon: <GraduationCap className="w-6 h-6 text-teal-sage" />, title: "Internship Begins" },
];

export default function InternshipPage() {
  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      <section className="pt-36 pb-20">
        <Container className="text-center">
          <Badge tone="gold" className="mb-4">
            Learn With Us
          </Badge>
          <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-forest-slate leading-tight mb-6 text-balance">
            Internship Program
          </h1>
          <p className="text-charcoal/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-pretty">
            Learning opportunities, mentorship, and professional development for psychology
            students entering clinical or administrative practice.
          </p>
          <a
            href="#apply"
            className="inline-flex mt-8 items-center justify-center bg-teal-sage hover:bg-forest-slate text-white font-semibold px-8 py-3.5 rounded-full shadow-warm-soft hover:shadow-warm-soft transition-all"
          >
            Apply Now
          </a>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PROGRAMS.map((p) => (
            <Surface key={p.title} variant="raised" radius="surface" className="p-8 flex flex-col">
              <Badge tone="ocean" className="mb-4 self-start">
                {p.audience}
              </Badge>
              <h2 className="font-cormorant text-2xl font-semibold text-forest-slate mb-4">{p.title}</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-6">
                <div>
                  <dt className="uppercase tracking-wide text-charcoal/80">Duration</dt>
                  <dd className="text-forest-slate font-medium">{p.duration}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-charcoal/80">Commitment</dt>
                  <dd className="text-forest-slate font-medium">{p.commitment}</dd>
                </div>
                {p.stipend && (
                  <div>
                    <dt className="uppercase tracking-wide text-charcoal/80">Stipend</dt>
                    <dd className="text-forest-slate font-medium">{p.stipend}</dd>
                  </div>
                )}
              </dl>

              <h3 className="text-xs font-bold uppercase tracking-wide text-charcoal/80 mb-2">You&apos;ll Learn</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-charcoal/80 mb-6">
                {p.learning.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-sage shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <h3 className="text-xs font-bold uppercase tracking-wide text-charcoal/80 mb-2">Eligibility</h3>
              <ul className="space-y-1.5 text-sm text-charcoal/80">
                {p.eligibility.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-tan shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Surface>
          ))}
        </Container>
      </section>

      <section className="py-20 bg-warm-sand/40">
        <Container>
          <SectionHeading eyebrow="Why Intern With Us" title="What you'll gain" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-forest-slate">
                <Award className="w-4 h-4 text-warm-tan shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading eyebrow="How It Works" title="Application process" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {STEPS.map((s, i) => (
              <Surface key={s.title} variant="raised" radius="surface" className="p-6 text-center">
                <div className="w-12 h-12 rounded-soft bg-warm-sand/40 border border-muted-sage/25 flex items-center justify-center mx-auto mb-4">
                  {s.icon}
                </div>
                <p className="text-xs text-charcoal/80 mb-1">Step {i + 1}</p>
                <p className="font-cormorant text-lg font-semibold text-forest-slate">{s.title}</p>
              </Surface>
            ))}
          </div>
        </Container>
      </section>

      <section id="apply" className="py-20 scroll-mt-24">
        <Container className="max-w-3xl">
          <SectionHeading eyebrow="Apply" title="Internship application" className="mb-10" />
          <InternshipApplicationForm />
        </Container>
      </section>
    </div>
  );
}
