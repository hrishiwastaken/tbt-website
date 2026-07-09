"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Calendar, Users, CreditCard, LogOut, ShieldAlert } from "lucide-react";

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
      <div className="min-h-screen bg-ivory flex justify-center items-center font-dmsans text-sm text-sage">
        Loading admin console...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row font-dmsans">
      {/* Sidebar Panel */}
      <aside className="w-full md:w-64 bg-sand/30 border-b md:border-b-0 md:border-r border-mist/30 flex flex-col justify-between py-6 px-4 shrink-0">
        <div>
          <div className="px-3 mb-8">
            <Link href="/" className="font-cormorant font-semibold text-2xl text-charcoal block hover:opacity-90 leading-tight">
              The Brain Tea
            </Link>
            <span className="font-dmsans text-[10px] text-terracotta uppercase tracking-widest font-bold flex items-center gap-1 mt-1">
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
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-forest text-warm-white"
                      : "text-sage hover:bg-mist/20 hover:text-charcoal"
                  }`}
                >
                  <Icon size={14} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-mist/20 mt-6 px-3 flex flex-col gap-4">
          <div className="text-[10px] text-sage font-mono truncate">
            {adminEmail}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sage hover:text-red-700 transition-colors text-xs font-bold tracking-widest uppercase"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto max-w-7xl">
        {children}
      </main>
    </div>
  );
}
