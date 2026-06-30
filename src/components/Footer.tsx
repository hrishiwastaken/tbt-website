"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/admin") || pathname.startsWith("/therapist");
  if (isDashboard) return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-forest text-warm-white pt-20 pb-8 border-t border-sage/20 relative z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-16">
        
        {/* Column 1: Brand & Tagline */}
        <div className="flex flex-col space-y-4">
          <Link href="/">
            <span className="font-cormorant font-semibold text-3xl tracking-tight">
              Solis Psychology
            </span>
          </Link>
          <p className="font-dmsans text-sm text-mist leading-relaxed max-w-sm">
            A compassionate, safe, and professional mental health practice dedicated to supporting individuals, couples, and families through evidence-based psychotherapy.
          </p>
          <p className="font-dmsans text-xs text-mist/60">
            Licensed practitioner under RCI guidelines.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div className="flex flex-col space-y-4 md:border-l md:border-sage/20 md:pl-12">
          <h4 className="font-cormorant text-xl font-semibold tracking-wide">
            Quick Links
          </h4>
          <nav className="flex flex-col space-y-2.5">
            <Link href="/" className="font-dmsans text-sm text-mist hover:text-warm-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="font-dmsans text-sm text-mist hover:text-warm-white transition-colors">
              About the Practice
            </Link>
            <Link href="/services" className="font-dmsans text-sm text-mist hover:text-warm-white transition-colors">
              Our Services
            </Link>
            <Link href="/faq" className="font-dmsans text-sm text-mist hover:text-warm-white transition-colors">
              Frequently Asked Questions
            </Link>
            <Link href="/book" className="font-dmsans text-sm text-mist hover:text-warm-white transition-colors">
              Book Appointment
            </Link>
            <Link href="/admin/login" className="font-dmsans text-sm text-mist hover:text-warm-white transition-colors">
              Admin Portal
            </Link>
          </nav>
        </div>

        {/* Column 3: Contact Info */}
        <div className="flex flex-col space-y-4 md:border-l md:border-sage/20 md:pl-12">
          <h4 className="font-cormorant text-xl font-semibold tracking-wide">
            Contact Info
          </h4>
          <div className="font-dmsans text-sm text-mist space-y-3 leading-relaxed">
            <p>
              <span className="block font-medium text-warm-white">Address:</span>
              12, Green Meadow Lane, Sector 4,
              <br />
              New Delhi, DL 110001
            </p>
            <p>
              <span className="block font-medium text-warm-white">Phone / WhatsApp:</span>
              +91 75584 93155
            </p>
            <p>
              <span className="block font-medium text-warm-white">Email:</span>
              contact@solispsychology.com
            </p>
            <p>
              <span className="block font-medium text-warm-white">Hours:</span>
              Mon – Fri: 9:00 AM – 7:00 PM
              <br />
              Saturday: 10:00 AM – 4:00 PM
            </p>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-sage/20 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-mist/60 font-dmsans">
        <p>© {currentYear} Solis Psychology & Mental Health Clinic. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Confidentiality guaranteed. Professional Mental Health Services.</p>
      </div>
    </footer>
  );
}
