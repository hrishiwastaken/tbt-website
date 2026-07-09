"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarClock,
  CreditCard,
  User,
  Settings,
  LogOut,
  HeartHandshake,
} from "lucide-react";
import { SITE_NAME } from "../../lib/site";

const NAV = [
  { name: "Dashboard", href: "/therapist", icon: LayoutDashboard },
  { name: "Calendar", href: "/therapist/calendar", icon: Calendar },
  { name: "Appointments", href: "/therapist/appointments", icon: CalendarClock },
  { name: "Clients", href: "/therapist/clients", icon: Users },
  { name: "Earnings", href: "/therapist/payments", icon: CreditCard },
  { name: "Profile", href: "/therapist/profile", icon: User },
  { name: "Settings", href: "/therapist/settings", icon: Settings },
];

export default function TherapistLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const isLoginPage = pathname === "/therapist/login";

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/therapist/me");
      if (!res.ok) {
        router.push("/therapist/login");
        return;
      }
      const data = await res.json();
      setName(data.consultant?.name || data.user?.email || "");
    } catch (err) {
      console.error(err);
      router.push("/therapist/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoginPage) checkAuth();
  }, [isLoginPage, checkAuth]);

  if (isLoginPage) return <>{children}</>;

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/therapist/login");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div data-panel className="min-h-screen bg-panel-ivory flex justify-center items-center font-dmsans text-sm text-ink-muted">
        Loading consultant portal...
      </div>
    );
  }

  return (
    <div data-panel className="min-h-screen bg-panel-ivory flex flex-col md:flex-row font-dmsans">
      <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-ocean/10 flex flex-col justify-between py-6 px-4 shrink-0 md:sticky md:top-0 md:h-screen">
        <div>
          <div className="px-3 mb-8">
            <Link href="/" className="font-cormorant font-semibold text-2xl text-ocean-deep block leading-tight">
              {SITE_NAME}
            </Link>
            <span className="font-dmsans text-[10px] text-ocean uppercase tracking-widest font-bold mt-1 flex items-center gap-1">
              <HeartHandshake size={10} /> Consultant Portal
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

        <div className="pt-4 border-t border-ocean/10 mt-6 px-3 flex flex-col gap-4">
          <div className="text-[10px] text-ink-muted font-mono truncate">{name}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-ink-muted hover:text-red-700 transition-colors text-xs font-bold tracking-widest uppercase cursor-pointer"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-grow p-4 md:p-10 overflow-y-auto w-full max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
