"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Team", href: "/team" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav className="bg-surface-bright dark:bg-inverse-surface w-full sticky top-0 z-50 border-b border-surface-variant/30 transition-all duration-300">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-6">
        <Link href="/" className="font-hero text-h2 text-primary dark:text-primary-fixed-dim hover:opacity-90 transition-opacity">
          Madhumati Clinic
        </Link>
        
        {/* Desktop Links */}
        <div className="hidden md:flex gap-8 items-center font-body text-body">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors duration-300 ${
                  isActive
                    ? "text-rosewood-cta dark:text-tertiary-fixed font-semibold border-b-2 border-rosewood-cta scale-95"
                    : "text-taupe-body dark:text-outline-variant hover:text-rosewood-cta dark:hover:text-tertiary-fixed"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Link
            href="/book"
            className="bg-rosewood-cta text-on-primary rounded-full px-6 py-3 font-label text-label uppercase tracking-widest hover:opacity-90 transition-all shadow-sm hover:shadow-md inline-block"
          >
            Book a Session
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-primary focus:outline-none p-2"
          aria-label="Toggle Mobile Menu"
        >
          <span className="material-symbols-outlined">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-bright border-b border-surface-variant animate-[fadeIn_0.3s_ease-out]">
          <div className="flex flex-col px-margin-mobile py-6 gap-4 font-body text-body">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 transition-colors duration-300 ${
                    isActive
                      ? "text-rosewood-cta font-semibold border-l-4 border-rosewood-cta pl-3"
                      : "text-taupe-body hover:text-rosewood-cta"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-rosewood-cta text-on-primary text-center rounded-full py-3 mt-2 font-label text-label uppercase tracking-widest hover:opacity-90 transition-all inline-block"
            >
              Book a Session
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
