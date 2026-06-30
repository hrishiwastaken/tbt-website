import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer class="bg-surface-container-low dark:bg-surface-container-lowest w-full mt-24">
      <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-section-padding flex flex-col gap-8">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <Link href="/" className="font-hero text-h2 text-primary dark:text-primary-fixed-dim hover:opacity-90 transition-opacity">
              Madhumati Clinic
            </Link>
            <p className="font-body text-caption text-taupe-body mt-2 max-w-sm">
              A premium sanctuary for emotional clarity, mental health optimization, and deep cognitive presence.
            </p>
          </div>
          
          <div class="flex flex-wrap gap-6 md:gap-8 font-caption text-caption text-taupe-body dark:text-on-surface-variant">
            <Link href="/about" className="hover:text-rosewood-cta dark:hover:text-tertiary-fixed transition-colors">About Us</Link>
            <Link href="/services" className="hover:text-rosewood-cta dark:hover:text-tertiary-fixed transition-colors">Services</Link>
            <Link href="/team" className="hover:text-rosewood-cta dark:hover:text-tertiary-fixed transition-colors">Our Team</Link>
            <Link href="/contact" className="hover:text-rosewood-cta dark:hover:text-tertiary-fixed transition-colors">Contact</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-outline-variant/30 pt-8 mt-4 items-center gap-4">
          <p class="font-caption text-caption text-taupe-body dark:text-on-surface-variant">
            © {new Date().getFullYear()} Madhumati Clinic. All rights reserved. 
            <br />
            <span className="text-[#ba1a1a] font-semibold">Crisis Support:</span> If you are in immediate distress or danger, please contact local emergency medical services or call a national crisis helpline.
          </p>
          
          <div className="flex flex-wrap gap-4 md:justify-end font-caption text-caption text-taupe-body/80">
            <Link href="/admin/login" className="hover:text-rosewood-cta transition-colors">Admin Portal</Link>
            <span className="text-surface-variant">|</span>
            <Link href="/therapist/login" className="hover:text-rosewood-cta transition-colors">Therapist Portal</Link>
            <span className="text-surface-variant">|</span>
            <Link href="/privacy" className="hover:text-rosewood-cta transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
