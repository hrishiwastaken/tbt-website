"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarClock,
  CreditCard,
  User,
  Settings,
} from "lucide-react";
import { SITE_NAME } from "../../lib/site";

const NAV = [
  { name: "Dashboard", href: "/therapist", icon: LayoutDashboard },
  { name: "Calendar", href: "/therapist/calendar", icon: Calendar },
  { name: "Clients", href: "/therapist/clients", icon: Users },
  { name: "Appointments", href: "/therapist/appointments", icon: CalendarClock },
  { name: "Payments", href: "/therapist/payments", icon: CreditCard },
  { name: "Profile", href: "/therapist/profile", icon: User },
  { name: "Settings", href: "/therapist/settings", icon: Settings },
];

export default function TherapistLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/therapist/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row font-dmsans">
      <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-ocean/10 flex flex-col justify-between py-6 px-4 shrink-0">
        <div>
          <div className="px-3 mb-8">
            <Link href="/" className="font-cormorant font-semibold text-2xl text-ocean-deep block leading-tight">
              {SITE_NAME}
            </Link>
            <span className="font-dmsans text-[10px] text-ocean uppercase tracking-widest font-bold mt-1 block">
              Consultant Portal
            </span>
          </div>

          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
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
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-ocean/10 mt-6 px-3">
          <Link href="/therapist/login" className="text-xs font-bold tracking-widest uppercase text-ink-muted hover:text-ocean-deep transition-colors">
            ← Log Out
          </Link>
        </div>
      </aside>

      <main className="flex-grow p-6 md:p-12 overflow-y-auto max-w-7xl">{children}</main>
    </div>
  );
}
