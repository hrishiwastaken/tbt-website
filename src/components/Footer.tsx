"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

export default function Footer() {
  const pathname = usePathname();
  const isDashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/therapist") ||
    pathname.startsWith("/portal");
  if (isDashboard) return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-forest-slate text-warm-sand pt-20 pb-8 border-t border-muted-sage/20 relative z-10">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-16">
        {/* Column 1: Brand & Tagline */}
        <div className="flex flex-col space-y-4">
          <Link
            href="/"
            className="flex items-center"
            aria-label="The Brain Tea — Home"
          >
            <Logo className="w-24 h-24 shadow-warm-soft ring-1 ring-warm-sand/20 shrink-0" />
          </Link>
          <p className="font-dmsans text-sm text-warm-sand/80 leading-relaxed max-w-sm">
            A compassionate, safe, and professional mental health practice
            dedicated to supporting individuals, couples, and families through
            evidence-based psychotherapy.
          </p>
          <p className="font-dmsans text-xs text-warm-sand/50">
            Licensed practitioner under RCI guidelines.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div className="flex flex-col space-y-4 md:border-l md:border-muted-sage/20 md:pl-12">
          <h4 className="font-cormorant text-xl font-semibold tracking-wide text-warm-sand">
            Quick Links
          </h4>
          <nav className="flex flex-col space-y-2.5">
            <Link
              href="/"
              className="font-dmsans text-sm text-warm-sand/80 hover:text-warm-sand transition-colors"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="font-dmsans text-sm text-warm-sand/80 hover:text-warm-sand transition-colors"
            >
              About the Practice
            </Link>
            <Link
              href="/services"
              className="font-dmsans text-sm text-warm-sand/80 hover:text-warm-sand transition-colors"
            >
              Our Services
            </Link>
            <Link
              href="/internship"
              className="font-dmsans text-sm text-warm-sand/80 hover:text-warm-sand transition-colors"
            >
              Internship Program
            </Link>
            <Link
              href="/faq"
              className="font-dmsans text-sm text-warm-sand/80 hover:text-warm-sand transition-colors"
            >
              Frequently Asked Questions
            </Link>
            <Link
              href="/book"
              className="font-dmsans text-sm text-warm-sand/80 hover:text-warm-sand transition-colors"
            >
              Book Appointment
            </Link>
            <Link
              href="/admin/login"
              className="font-dmsans text-sm text-warm-sand/80 hover:text-warm-sand transition-colors"
            >
              Admin Portal
            </Link>
          </nav>
        </div>

        {/* Column 3: Contact Info */}
        <div className="flex flex-col space-y-4 md:border-l md:border-muted-sage/20 md:pl-12">
          <h4 className="font-cormorant text-xl font-semibold tracking-wide text-warm-sand">
            Contact Info
          </h4>
          <div className="font-dmsans text-sm text-warm-sand/80 space-y-3 leading-relaxed">
            <p>
              <span className="block font-medium text-warm-sand">Address:</span>
              12, Green Meadow Lane, Sector 4,
              <br />
              New Delhi, DL 110001
            </p>
            <p>
              <span className="block font-medium text-warm-sand">
                Phone / WhatsApp:
              </span>
              +91 75584 93155
            </p>
            <p>
              <span className="block font-medium text-warm-sand">Email:</span>
              contact@thebraintea.com
            </p>
            <p>
              <span className="block font-medium text-warm-sand">Hours:</span>
              Mon – Fri: 9:00 AM – 7:00 PM
              <br />
              Saturday: 10:00 AM – 4:00 PM
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 border-t border-muted-sage/20 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-warm-sand/50 font-dmsans">
        <p>
          © {currentYear} The Brain Tea Mental Health Clinic. All rights
          reserved.
        </p>
        <p className="mt-2 md:mt-0">
          Confidentiality guaranteed. Professional Mental Health Services.
        </p>
      </div>
    </footer>
  );
}
