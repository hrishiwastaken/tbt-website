"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Calendar, Users, CreditCard, LogOut, ShieldAlert } from "lucide-react";
import { SITE_NAME } from "../../lib/site";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        router.push("/admin/login");
      } else {
        setAdminEmail("admin@thebraintea.com");
      }
    } catch (err) {
      console.error(err);
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

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
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Appointments", href: "/admin/bookings", icon: Calendar },
    { name: "Clients", href: "/admin/clients", icon: Users },
    { name: "Transactions", href: "/admin/payments", icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex justify-center items-center font-dmsans text-sm text-ink-muted">
        Loading admin console...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row font-dmsans">
      <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-ocean/10 flex flex-col justify-between py-6 px-4 shrink-0">
        <div>
          <div className="px-3 mb-8">
            <Link href="/" className="font-cormorant font-semibold text-2xl text-ocean-deep block hover:opacity-90 leading-tight">
              {SITE_NAME}
            </Link>
            <span className="font-dmsans text-[10px] text-ocean uppercase tracking-widest font-bold flex items-center gap-1 mt-1">
              <ShieldAlert size={10} /> Admin Console
            </span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
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
          <div className="text-[10px] text-ink-muted font-mono truncate">{adminEmail}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-ink-muted hover:text-red-700 transition-colors text-xs font-bold tracking-widest uppercase cursor-pointer"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-grow p-6 md:p-12 overflow-y-auto max-w-7xl">{children}</main>
    </div>
  );
}
