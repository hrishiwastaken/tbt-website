import Link from "next/link";
import { notFound } from "next/navigation";
import { Wifi, MapPin, ArrowLeft } from "lucide-react";
import Container from "../../../components/ui/Container";
import Surface from "../../../components/ui/Surface";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import { SERVICES, getServiceBySlug } from "../../../lib/services-data";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return {
    title: `${service.name} | The Brain Tea`,
    description: service.description,
  };
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      <section className="pt-36 pb-16">
        <Container className="max-w-3xl">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-sage hover:text-forest-slate mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All Services
          </Link>
          <h1 className="font-cormorant text-4xl md:text-5xl font-semibold text-forest-slate leading-tight mb-4 text-balance">
            {service.name}
          </h1>
          <p className="text-teal-sage font-medium mb-6">{service.tagline}</p>
          <div className="flex flex-wrap gap-2 mb-8">
            {service.availability.map((mode) => (
              <Badge key={mode} tone="sand">
                {mode === "Online" ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <MapPin className="w-3 h-3" />
                )}
                {mode}
              </Badge>
            ))}
          </div>
          <p className="text-base md:text-lg text-charcoal/80 leading-relaxed text-pretty">
            {service.description}
          </p>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="max-w-3xl grid grid-cols-1 gap-6">
          <Surface variant="raised" radius="surface" className="p-8">
            <h2 className="font-cormorant text-xl font-semibold text-forest-slate mb-4">
              Who this is suitable for
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-charcoal/80">
              {service.suitableFor.map((topic) => (
                <li key={topic} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-sage shrink-0" />
                  {topic}
                </li>
              ))}
            </ul>
          </Surface>

          {service.process && (
            <Surface variant="raised" radius="surface" className="p-8">
              <h2 className="font-cormorant text-xl font-semibold text-forest-slate mb-3">
                Process
              </h2>
              <p className="text-sm text-charcoal/80 leading-relaxed">
                {service.process}
              </p>
            </Surface>
          )}

          <div className="text-center pt-6">
            <Button
              href={`/book?service=${encodeURIComponent(service.slug)}`}
              size="lg"
            >
              Book Appointment
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
