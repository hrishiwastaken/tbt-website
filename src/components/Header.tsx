"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { NavLink } from "./ui/NavLink";
import { isDashboardRoute } from "../lib/site";

export default function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the mobile menu on route change — handled during render (React's
  // "reset state on change" pattern) so it doesn't require a setState-in-effect.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setIsMobileMenuOpen(false);
  }

  // Lock body scroll while the full-screen mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const isDashboard = isDashboardRoute(pathname);
  if (isDashboard) return null;

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Internship", href: "/internship" },
    { name: "FAQ", href: "/faq" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-warm-sand/90 backdrop-blur-lg border-b border-muted-sage/20 shadow-warm-soft py-1.5"
            : "bg-transparent py-2.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="z-50 flex items-center"
            aria-label="The Brain Tea — Home"
          >
            <Logo className="w-12 h-12 md:w-14 md:h-14 shrink-0" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NavLink
                  key={link.name}
                  href={link.href}
                  className={`font-dmsans text-sm font-medium tracking-wide transition-colors relative py-1 ${
                    isActive
                      ? "text-teal-sage font-semibold"
                      : "text-forest-slate/90 hover:text-teal-sage"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-sage"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </NavLink>
              );
            })}

            {/* Book Appointment CTA */}
            <Link
              href="/book"
              className="font-dmsans text-sm font-semibold bg-teal-sage hover:bg-forest-slate text-warm-sand px-6 py-2.5 rounded-full shadow-sm hover:shadow-warm-soft transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 btn-shimmer"
            >
              Book Appointment
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden z-50 text-forest p-1.5 focus:outline-none"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-warm-white" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-forest text-warm-white flex flex-col justify-center items-center px-6"
          >
            <nav className="flex flex-col items-center space-y-8 text-center">
              {navLinks.map((link, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  key={link.name}
                >
                  <NavLink
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="font-cormorant text-3xl font-semibold hover:text-mist transition-colors"
                  >
                    {link.name}
                  </NavLink>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * navLinks.length }}
              >
                <Link
                  href="/book"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-block font-dmsans text-lg font-medium bg-warm-white text-forest px-8 py-3 rounded-full hover:bg-mist transition-colors shadow-lg"
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
