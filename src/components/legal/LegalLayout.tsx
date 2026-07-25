import React, { ReactNode } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import {
  SITE_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_ADDRESS,
  LEGAL_EFFECTIVE_DATE,
} from "@/lib/site";

// Shared shell for the compliance / policy pages (Terms, Privacy, Refund,
// Delivery). Rendered as a server component so each page can export its own
// SEO metadata. Content pages write plain semantic HTML (<h2>, <p>, <ul>…)
// inside `children`; the prose wrapper below styles it consistently with the
// public "quiet luxury" palette (warm-sand / forest-slate / teal-sage).

const OTHER_POLICIES = [
  { name: "Terms & Conditions", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Refund & Cancellation Policy", href: "/refund-policy" },
  { name: "Shipping & Delivery Policy", href: "/shipping-policy" },
  { name: "Contact Us", href: "/contact" },
];

export interface LegalLayoutProps {
  eyebrow?: string;
  title: string;
  intro: string;
  /** Semantic policy content — headings, paragraphs, lists. */
  children: ReactNode;
  /** Route of the current page, so it is excluded from the "related" list. */
  currentPath: string;
}

export default function LegalLayout({
  eyebrow = "Legal & Compliance",
  title,
  intro,
  children,
  currentPath,
}: LegalLayoutProps) {
  return (
    <div className="bg-warm-sand min-h-screen font-dmsans">
      {/* PAGE HERO */}
      <section className="bg-warm-tan/30 pt-32 pb-16 border-b border-muted-sage/20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <span className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4 block">
            {eyebrow}
          </span>
          <h1 className="font-cormorant text-4xl md:text-5xl lg:text-6xl font-semibold text-forest-slate leading-tight mb-6">
            {title}
          </h1>
          <p className="text-forest-slate/85 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {intro}
          </p>
          <p className="mt-6 inline-block rounded-full bg-warm-sand/70 border border-muted-sage/30 px-4 py-1.5 text-xs font-medium tracking-wide text-forest-slate/70">
            Last updated: {LEGAL_EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      {/* POLICY BODY */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <article
            className="font-dmsans text-forest-slate/85 leading-relaxed
              [&_h2]:font-cormorant [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-semibold [&_h2]:text-forest-slate [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:scroll-mt-28
              [&_h3]:font-cormorant [&_h3]:text-lg [&_h3]:md:text-xl [&_h3]:font-semibold [&_h3]:text-forest-slate [&_h3]:mt-8 [&_h3]:mb-3
              [&_p]:mb-4 [&_p]:text-[15px] [&_p]:md:text-base
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-2
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:space-y-2
              [&_li]:text-[15px] [&_li]:md:text-base [&_li]:leading-relaxed [&_li]:pl-1
              [&_a]:text-teal-sage [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-forest-slate
              [&_strong]:text-forest-slate [&_strong]:font-semibold
              [&_:first-child]:mt-0"
          >
            {children}
          </article>

          {/* CONTACT / GRIEVANCE BLOCK */}
          <div className="mt-14 rounded-2xl bg-warm-tan/30 border border-muted-sage/20 p-6 md:p-8">
            <h2 className="font-cormorant text-2xl font-semibold text-forest-slate mb-2">
              Questions about this policy?
            </h2>
            <p className="text-sm text-forest-slate/80 mb-6 max-w-xl">
              For any queries, grievances, or requests relating to this policy
              or your payments, reach {SITE_LEGAL_NAME} at:
            </p>
            <div className="space-y-3 text-sm text-forest-slate/85">
              <p className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-teal-sage shrink-0" />
                <span>
                  {CONTACT_ADDRESS.line1}
                  <br />
                  {CONTACT_ADDRESS.line2}
                </span>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-teal-sage shrink-0" />
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-teal-sage underline underline-offset-2 hover:text-forest-slate"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-teal-sage shrink-0" />
                <span>{CONTACT_PHONE}</span>
              </p>
            </div>
          </div>

          {/* RELATED POLICIES */}
          <nav className="mt-10 border-t border-muted-sage/20 pt-8">
            <h3 className="text-[11px] font-bold tracking-[0.25em] text-teal-sage uppercase mb-4">
              Related Policies
            </h3>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {OTHER_POLICIES.filter((p) => p.href !== currentPath).map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="font-dmsans text-sm text-forest-slate/80 hover:text-teal-sage transition-colors underline underline-offset-2 decoration-muted-sage/40"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </div>
  );
}
