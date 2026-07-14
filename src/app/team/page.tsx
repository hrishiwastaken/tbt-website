import Image from "next/image";
import Link from "next/link";
import { Languages, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import Surface from "@/components/ui/Surface";
import Badge from "@/components/ui/Badge";
import SectionHeading from "@/components/ui/SectionHeading";
import { TEAM } from "@/lib/team-data";
import { SITE_TAGLINE } from "@/lib/site";

export const metadata = {
  title: "Our Team | The Brain Tea",
  description:
    "Meet the licensed practitioners at The Brain Tea — qualifications, specialisations, and approach to care.",
};

export default function TeamPage() {
  const gridCols =
    TEAM.length === 1
      ? "grid-cols-1 max-w-sm"
      : TEAM.length === 2
        ? "grid-cols-1 md:grid-cols-2 max-w-3xl"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl";

  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      <section className="pt-36 pb-20">
        <Container className="text-center">
          <Badge tone="ocean" className="mb-4">
            Our Practitioners
          </Badge>
          <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-forest-slate leading-tight mb-6 text-balance">
            Meet Our Team
          </h1>
          <p className="text-charcoal/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-pretty">
            {SITE_TAGLINE}. A collaborative, compassionate group of licensed
            professionals here to walk alongside you.
          </p>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className={`grid gap-8 justify-center mx-auto ${gridCols}`}>
            {TEAM.map((member) => (
              <Surface
                key={member.slug}
                variant="raised"
                radius="surface"
                interactive
                className="overflow-hidden flex flex-col"
              >
                <div className="relative h-72 w-full bg-warm-tan">
                  <Image
                    src={member.photo}
                    alt={`${member.name} - ${member.role}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-top"
                  />
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <h2 className="font-cormorant text-2xl font-semibold text-forest-slate mb-1">
                    {member.name}
                  </h2>
                  <p className="font-dmsans text-xs text-teal-sage font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="font-dmsans text-xs text-forest-slate bg-muted-sage/15 border border-teal-sage/10 px-2.5 py-1 rounded-full mb-1 inline-block self-start">
                    {member.qualification}
                  </p>
                  <p className="text-xs text-charcoal/70 mb-4">
                    {member.experience}
                  </p>

                  <p className="text-sm text-forest-slate/85 leading-relaxed mb-6 font-dmsans">
                    {member.intro}
                  </p>

                  <div className="mt-auto space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-charcoal/70 mb-2">
                        <Sparkles className="w-3 h-3" /> Specialises In
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {member.specialisations.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-medium text-forest-slate bg-warm-tan/40 border border-muted-sage/20 px-2 py-0.5 rounded-full font-dmsans"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-charcoal/70 mb-2">
                        <Languages className="w-3 h-3" /> Speaks
                      </div>
                      <p className="text-xs text-forest-slate/85">
                        {member.languages.join(", ")}
                      </p>
                    </div>

                    <div className="border-t border-muted-sage/20 pt-4 text-xs text-forest-slate/85">
                      <span className="font-semibold text-forest-slate">
                        {member.fee}
                      </span>
                    </div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="text-center max-w-2xl mx-auto">
          <SectionHeading
            eyebrow="Ready When You Are"
            title="Start your journey"
            description="Book a free consultation and we'll match you with the right practitioner for your needs."
          />
          <Link
            href="/book"
            className="inline-flex mt-8 items-center justify-center bg-teal-sage hover:bg-forest-slate text-white font-semibold px-8 py-3.5 rounded-full shadow-warm-soft hover:shadow-warm-soft transition-all"
          >
            Book a Consultation
          </Link>
        </Container>
      </section>
    </div>
  );
}
