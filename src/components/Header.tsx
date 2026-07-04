"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { MAIN_NAV, SITE_NAME } from "../lib/site";

export default function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isDashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/therapist") ||
    pathname.startsWith("/portal");
  if (isDashboard) return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ease-out-soft ${
          isScrolled
            ? "bg-ivory/90 backdrop-blur-lg border-b border-ocean/10 shadow-warm-soft py-3"
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link href="/" className="z-50">
            <span className="font-cormorant font-semibold text-2xl md:text-3xl text-ocean-deep tracking-tight">
              {SITE_NAME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {MAIN_NAV.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`font-dmsans text-sm font-medium tracking-wide transition-colors relative py-1 ${
                    isActive ? "text-ocean font-semibold" : "text-ocean-deep/80 hover:text-ocean"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-ocean"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            <Link
              href="/book"
              className="font-dmsans text-sm font-semibold bg-ocean hover:bg-ocean-deep text-white px-6 py-2.5 rounded-full shadow-surface-raised-sm hover:shadow-surface-raised transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer"
            >
              Book Appointment
            </Link>
          </nav>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden z-50 text-ocean-deep p-1.5 focus:outline-none"
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6 text-ivory" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-ocean-deep text-ivory flex flex-col justify-center items-center px-6"
          >
            <nav className="flex flex-col items-center space-y-8 text-center">
              {MAIN_NAV.map((link, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  key={link.name}
                >
                  <Link
                    href={link.href}
                    className="font-cormorant text-3xl font-semibold hover:text-gold transition-colors"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * MAIN_NAV.length }}
              >
                <Link
                  href="/book"
                  className="inline-block font-dmsans text-lg font-medium bg-ivory text-ocean-deep px-8 py-3 rounded-full hover:bg-gold transition-colors shadow-lg"
                >
                  Book Appointment
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
