"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  LogOut,
  ConciergeBell,
  CheckCheck,
  Menu,
  X,
} from "lucide-react";
import { NavLink } from "../../components/ui/NavLink";
import Logo from "../../components/Logo";

// Reception desk shell. Deliberately identical in structure and styling to
// the admin console (src/app/admin/layout.js) — same tokens, same sidebar,
// same behaviour — with a front-desk nav and badge.
//
// There is no /reception/login page: a receptionist signs in at
// /admin/login, the single shared portal for ADMIN and RECEPTIONIST
// accounts, and is redirected here by their account's actual role.

export default function ReceptionLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkReceptionAuth = async () => {
      try {
        const res = await fetch("/api/reception/me");
        if (!res.ok) {
          router.push("/admin/login");
        } else {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error(err);
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    };
    checkReceptionAuth();
  }, [router]);

  // Close the mobile sidebar when navigating to a new route. Done during
  // render (React-endorsed "reset state on change") rather than in an effect
  // so it doesn't trigger an extra render pass.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { name: "Front Desk", href: "/reception", icon: LayoutDashboard },
    { name: "Appointments", href: "/reception/appointments", icon: Calendar },
    { name: "Confirmations", href: "/reception/confirmations", icon: CheckCheck },
    { name: "Payments", href: "/reception/payments", icon: CreditCard },
    { name: "Clients", href: "/reception/clients", icon: Users },
  ];

  if (loading) {
    return (
      <div
        data-panel
        className="min-h-screen bg-panel-ivory flex justify-center items-center font-dmsans text-sm text-ink-muted"
      >
        Loading reception desk...
      </div>
    );
  }

  const nav = (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <NavLink
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-3 rounded-soft text-xs font-semibold uppercase tracking-wider transition-all ${
              isActive
                ? "bg-ocean text-white shadow-surface-raised-sm"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ocean-deep"
            }`}
          >
            <Icon size={14} />
            {item.name}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div
      data-panel
      className="min-h-screen bg-panel-ivory flex flex-col md:flex-row font-dmsans"
    >
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-surface border-b border-ocean/10 px-4 py-3">
        <Link
          href="/"
          className="flex items-center"
          aria-label="The Brain Tea — Home"
        >
          <Logo className="h-9 w-9 shrink-0" />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          className="surface-inset h-9 w-9 rounded-full flex items-center justify-center text-ocean-deep"
        >
          {menuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-surface border-b border-ocean/10 px-4 py-4">
          {nav}
        </div>
      )}

      <aside className="hidden md:flex w-64 bg-surface border-r border-ocean/10 flex-col justify-between py-6 px-4 shrink-0 md:sticky md:top-0 md:h-screen">
        <div>
          <div className="px-3 mb-8">
            <Link
              href="/"
              className="flex items-center hover:opacity-90"
              aria-label="The Brain Tea — Home"
            >
              <Logo className="h-12 w-12 shrink-0" />
            </Link>
            <span className="font-dmsans text-[10px] text-ocean uppercase tracking-widest font-bold flex items-center gap-1 mt-1">
              <ConciergeBell size={10} /> Reception Desk
            </span>
          </div>
          {nav}
        </div>

        <div className="pt-4 border-t border-ocean/10 mt-6 px-3 flex flex-col gap-4">
          <div className="text-[10px] text-ink-muted font-mono truncate">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-ink-muted hover:text-red-700 transition-colors text-xs font-bold tracking-widest uppercase cursor-pointer"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-grow p-4 md:p-10 overflow-y-auto w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
