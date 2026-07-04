import Link from "next/link";
import { ArrowRight, Wifi, MapPin } from "lucide-react";
import Container from "../../components/ui/Container";
import Surface from "../../components/ui/Surface";
import Badge from "../../components/ui/Badge";
import { SERVICES } from "../../lib/services-data";

export const metadata = {
  title: "Our Services | The Brain Tea",
  description: "Five focused pathways of psychological and psychiatric care, online and offline.",
};

export default function Services() {
  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      <section className="pt-36 pb-20">
        <Container className="text-center">
          <Badge tone="gold" className="mb-4">
            Clinical Care Options
          </Badge>
          <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-ocean-deep leading-tight mb-6 text-balance">
            Our Services
          </h1>
          <p className="text-ink-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-pretty">
            Evidence-based support tailored to your needs, across five focused pathways of care.
          </p>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SERVICES.map((service) => (
            <Surface
              key={service.slug}
              variant="raised"
              radius="surface"
              interactive
              className="p-8 md:p-10 flex flex-col"
            >
              <h2 className="font-cormorant text-2xl md:text-3xl font-semibold text-ocean-deep mb-2">
                {service.name}
              </h2>
              <p className="text-sm text-ocean font-medium mb-4">{service.tagline}</p>
              <p className="text-sm md:text-base text-ink-muted leading-relaxed mb-6 flex-grow">
                {service.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {service.availability.map((mode) => (
                  <Badge key={mode} tone="sand">
                    {mode === "Online" ? <Wifi className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {mode}
                  </Badge>
                ))}
              </div>
              <Link
                href={`/services/${service.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-deep transition-colors"
              >
                Learn More <ArrowRight className="w-4 h-4" />
              </Link>
            </Surface>
          ))}
        </Container>
      </section>

      <section className="pb-24 text-center">
        <Container className="max-w-xl">
          <p className="text-sm md:text-base text-ink-muted leading-relaxed">
            Not sure which service is right for you? Reach out and we&apos;ll help you find the
            best fit -- fees are discussed during your initial consultation.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:text-ocean-deep transition-colors mt-4"
          >
            Contact Us <ArrowRight className="w-4 h-4" />
          </Link>
        </Container>
      </section>
    </div>
  );
}
