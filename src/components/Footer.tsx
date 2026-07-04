"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SITE_NAME,
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_HOURS,
} from "../lib/site";

export default function Footer() {
  const pathname = usePathname();
  const isDashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/therapist") ||
    pathname.startsWith("/portal");
  if (isDashboard) return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ocean-deep text-ivory pt-20 pb-8 border-t border-ocean/20 relative z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-16">
        <div className="flex flex-col space-y-4">
          <Link href="/">
            <span className="font-cormorant font-semibold text-3xl tracking-tight">
              {SITE_NAME}
            </span>
          </Link>
          <p className="font-dmsans text-sm text-ivory/80 leading-relaxed max-w-sm">
            A calm, modern space for therapy, psychiatric support, and psychological growth --
            dedicated to supporting individuals, couples, and families through evidence-based
            care.
          </p>
          <p className="font-dmsans text-xs text-ivory/50">
            Licensed practitioners under RCI guidelines.
          </p>
        </div>

        <div className="flex flex-col space-y-4 md:border-l md:border-ivory/15 md:pl-12">
          <h4 className="font-cormorant text-xl font-semibold tracking-wide text-ivory">
            Quick Links
          </h4>
          <nav className="flex flex-col space-y-2.5">
            <Link href="/" className="font-dmsans text-sm text-ivory/80 hover:text-ivory transition-colors">
              Home
            </Link>
            <Link href="/about" className="font-dmsans text-sm text-ivory/80 hover:text-ivory transition-colors">
              About Us
            </Link>
            <Link href="/services" className="font-dmsans text-sm text-ivory/80 hover:text-ivory transition-colors">
              Our Services
            </Link>
            <Link href="/internship" className="font-dmsans text-sm text-ivory/80 hover:text-ivory transition-colors">
              Internship Program
            </Link>
            <Link href="/faq" className="font-dmsans text-sm text-ivory/80 hover:text-ivory transition-colors">
              Frequently Asked Questions
            </Link>
            <Link href="/book" className="font-dmsans text-sm text-ivory/80 hover:text-ivory transition-colors">
              Book Appointment
            </Link>
            <Link href="/admin/login" className="font-dmsans text-sm text-ivory/80 hover:text-ivory transition-colors">
              Admin Portal
            </Link>
          </nav>
        </div>

        <div className="flex flex-col space-y-4 md:border-l md:border-ivory/15 md:pl-12">
          <h4 className="font-cormorant text-xl font-semibold tracking-wide text-ivory">
            Contact Info
          </h4>
          <div className="font-dmsans text-sm text-ivory/80 space-y-3 leading-relaxed">
            <p>
              <span className="block font-medium text-ivory">Address:</span>
              {CONTACT_ADDRESS.line1}
              <br />
              {CONTACT_ADDRESS.line2}
            </p>
            <p>
              <span className="block font-medium text-ivory">Phone / WhatsApp:</span>
              {CONTACT_PHONE}
            </p>
            <p>
              <span className="block font-medium text-ivory">Email:</span>
              {CONTACT_EMAIL}
            </p>
            <p>
              <span className="block font-medium text-ivory">Hours:</span>
              {CONTACT_HOURS.weekday}
              <br />
              {CONTACT_HOURS.weekend}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-ivory/15 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-ivory/50 font-dmsans">
        <p>© {currentYear} {SITE_NAME}. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Confidentiality guaranteed. Professional mental health services.</p>
      </div>
    </footer>
  );
}
