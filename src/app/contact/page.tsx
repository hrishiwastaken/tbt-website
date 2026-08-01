import React from "react";
import Image from "next/image";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Linkedin,
  MessageCircle,
} from "lucide-react";
import { INSTAGRAM_URL, WHATSAPP_URL } from "@/lib/site";

export default function Contact() {
  return (
    <div className="bg-ivory min-h-screen font-dmsans">
      {/* PAGE HERO */}
      <section className="bg-sand pt-32 pb-20 border-b border-mist/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-xs font-semibold tracking-[0.15em] text-terracotta uppercase mb-4 block">
            Begin Your Healing Path
          </span>
          <h1 className="font-cormorant text-5xl md:text-6xl font-semibold text-charcoal leading-tight mb-6">
            Contact & Book
          </h1>
          <p className="text-sage text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Reach out in confidence. We are here to match you with the right
            support system and address your needs.
          </p>
        </div>
      </section>

      {/* TWO-COLUMN LAYOUT */}
      <section className="py-24 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Contact details & Map */}
          <div className="lg:col-span-5 space-y-10">
            <div>
              <h2 className="font-cormorant text-3xl md:text-4xl font-semibold text-charcoal mb-6">
                Get In Touch
              </h2>
              <p className="text-sage text-sm md:text-base leading-relaxed mb-8">
                Whether you want to schedule a session, check pricing tiers, or
                ask simple questions, we are ready to guide you. Use any of the
                options below.
              </p>
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-mist/30 rounded-xl text-forest shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-cormorant text-lg font-semibold text-charcoal">
                    Clinic Address
                  </h4>
                  <p className="font-dmsans text-sm text-sage leading-relaxed mt-1">
                    Flat No. 8, 5th Floor, Abhimanshree Society,
                    <br />
                    Baner-Pashan Link Road, above ICICI Direct, Pune - 411008
                  </p>
                  <p className="font-dmsans text-xs text-sage/70 mt-1">
                    Near Ramnagar Metro Station
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-mist/30 rounded-xl text-forest shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-cormorant text-lg font-semibold text-charcoal">
                    Phone & WhatsApp
                  </h4>
                  <p className="font-dmsans text-sm text-sage leading-relaxed mt-1">
                    +91 93098 33817
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-mist/30 rounded-xl text-forest shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-cormorant text-lg font-semibold text-charcoal">
                    Email Communication
                  </h4>
                  <p className="font-dmsans text-sm text-sage leading-relaxed mt-1">
                    contact@thebraintea.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-mist/30 rounded-xl text-forest shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-cormorant text-lg font-semibold text-charcoal">
                    Operating Hours
                  </h4>
                  <p className="font-dmsans text-sm text-sage leading-relaxed mt-1">
                    Monday – Friday: 9:00 AM – 7:00 PM
                    <br />
                    Saturday: 10:00 AM – 4:00 PM
                  </p>
                </div>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4 pt-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-sand hover:bg-mist/30 hover:text-forest rounded-full text-sage transition-all"
                aria-label="Instagram Link"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-sand hover:bg-mist/30 hover:text-forest rounded-full text-sage transition-all"
                aria-label="LinkedIn Link"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>

            {/* A look at the room before you arrive — first visits are easier
                when the space is already familiar. */}
            <div className="mb-6 rounded-2xl overflow-hidden shadow-warm-soft border border-mist/20 relative aspect-[4/3] bg-warm-tan">
              <Image
                src="/team/office.jpg"
                alt="The consultation room at The Brain Tea — soft seating, plants and natural light"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-slate/70 to-transparent px-5 pb-4 pt-10">
                <span className="font-dmsans text-[11px] font-semibold uppercase tracking-[0.18em] text-warm-white">
                  Our space in Baner, Pune
                </span>
              </div>
            </div>

            {/* Google Map Mockup / Iframe */}
            <div className="rounded-2xl overflow-hidden shadow-warm-soft border border-mist/20 relative aspect-video bg-sand">
              {/* Using a clean filter on standard iframe embed to keep aesthetics matching the ivory/sand look */}
              <iframe
                title="The Brain Tea Location Map"
                src="https://www.google.com/maps?q=Abhimanshree+Society%2C+Baner-Pashan+Link+Road%2C+Pune+411008&output=embed"
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  filter: "grayscale(1) contrast(0.9) brightness(0.95)",
                }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Right Column: WhatsApp CTA */}
          <div className="lg:col-span-7">
            <div className="glass-card p-8 md:p-12 rounded-2xl border border-mist/30 shadow-warm-soft flex flex-col items-center text-center gap-6">
              <div className="p-4 bg-[#25D366]/10 rounded-full text-[#25D366]">
                <MessageCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-cormorant text-3xl font-semibold text-charcoal mb-3">
                  Chat With Us on WhatsApp
                </h3>
                <p className="font-dmsans text-sm text-sage leading-relaxed max-w-md">
                  For the fastest response, message us directly on WhatsApp and
                  we&apos;ll help you find the right support or book a session.
                </p>
              </div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-medium px-8 py-3 rounded-full transition-colors shadow-sm hover:shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                Start WhatsApp Chat
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
