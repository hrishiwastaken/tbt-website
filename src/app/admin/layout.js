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
      // Validate session via client fetching or similar
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        router.push("/admin/login");
      } else {
        // Mock email for dashboard display
        setAdminEmail("admin@madhumaticlinic.com");
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
      <div className="min-h-screen bg-alabaster-bg flex justify-center items-center font-body text-body text-taupe-body">
        Loading admin console...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alabaster-bg flex flex-col md:flex-row font-body">
      {/* Sidebar Panel */}
      <aside className="w-full md:w-64 bg-linen-surface border-b md:border-b-0 md:border-r border-surface-variant/40 flex flex-col justify-between py-6 px-4 shrink-0">
        <div>
          <div className="px-3 mb-8">
            <Link href="/" className="font-hero text-h3 text-on-surface block hover:opacity-90">
              Madhumati Clinic
            </Link>
            <span className="font-label text-[10px] text-rosewood-cta uppercase tracking-widest font-bold flex items-center gap-1 mt-1">
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
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg font-body text-caption transition-all ${
                    isActive
                      ? "bg-rosewood-cta text-white font-semibold"
                      : "text-taupe-body hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-surface-variant/30 mt-6 px-3 flex flex-col gap-4">
          <div className="text-[10px] text-taupe-body font-mono truncate">
            {adminEmail}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-taupe-body hover:text-[#ba1a1a] transition-colors font-label text-label uppercase tracking-widest"
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
