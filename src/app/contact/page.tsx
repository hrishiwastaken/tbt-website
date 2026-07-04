import React, { Suspense } from "react";
import { Phone, Mail, MapPin, Clock, Instagram, Linkedin } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import Container from "@/components/ui/Container";
import Surface from "@/components/ui/Surface";
import Badge from "@/components/ui/Badge";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_HOURS,
  SITE_NAME,
} from "@/lib/site";

export const metadata = {
  title: "Contact & Book | The Brain Tea",
  description: "Reach out in confidence and book your first session.",
};

export default function Contact() {
  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      <section className="pt-36 pb-20">
        <Container className="text-center">
          <Badge tone="gold" className="mb-4">
            Begin Your Journey
          </Badge>
          <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-ocean-deep leading-tight mb-6 text-balance">
            Contact & Book
          </h1>
          <p className="text-ink-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed text-pretty">
            Reach out in confidence. We are here to match you with the right support and address
            your needs.
          </p>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 space-y-10">
            <div>
              <h2 className="font-cormorant text-3xl md:text-4xl font-semibold text-ocean-deep mb-4">
                Get In Touch
              </h2>
              <p className="text-ink-muted text-sm md:text-base leading-relaxed">
                Whether you want to schedule a session, ask about pricing, or have general
                questions, we&apos;re ready to help.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: <MapPin className="w-5 h-5" />,
                  label: "Clinic Address",
                  value: (
                    <>
                      {CONTACT_ADDRESS.line1}
                      <br />
                      {CONTACT_ADDRESS.line2}
                    </>
                  ),
                },
                {
                  icon: <Phone className="w-5 h-5" />,
                  label: "Phone & WhatsApp",
                  value: CONTACT_PHONE,
                },
                {
                  icon: <Mail className="w-5 h-5" />,
                  label: "Email",
                  value: CONTACT_EMAIL,
                },
                {
                  icon: <Clock className="w-5 h-5" />,
                  label: "Operating Hours",
                  value: (
                    <>
                      {CONTACT_HOURS.weekday}
                      <br />
                      {CONTACT_HOURS.weekend}
                    </>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-soft surface-inset flex items-center justify-center text-ocean shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-cormorant text-lg font-semibold text-ocean-deep">{item.label}</h4>
                    <p className="text-sm text-ink-muted leading-relaxed mt-1">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full surface-raised flex items-center justify-center text-ocean hover:text-ocean-deep transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full surface-raised flex items-center justify-center text-ocean hover:text-ocean-deep transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>

            <Surface variant="raised" radius="surface" className="overflow-hidden relative aspect-video">
              <iframe
                title={`${SITE_NAME} Location Map`}
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.5620138981146!2d77.218224!3d28.613939!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfd5d34190c1f%3A0x63351ec30c5e7b57!2sConnaught%20Place%2C%20New%20Delhi%2C%20Delhi%20110001!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Surface>
          </div>

          <div className="lg:col-span-7">
            <Suspense
              fallback={
                <Surface variant="raised" radius="surface" className="text-center py-20 text-ink-muted">
                  Loading Request Form...
                </Surface>
              }
            >
              <ContactForm />
            </Suspense>
          </div>
        </Container>
      </section>
    </div>
  );
}
