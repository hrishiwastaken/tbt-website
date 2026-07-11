"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarClock,
  CreditCard,
  FileText,
  User,
  PhoneCall,
} from "lucide-react";
import { SITE_NAME, WHATSAPP_URL, CONTACT_PHONE } from "../../lib/site";
import { NavLink } from "../../components/ui/NavLink";

const NAV = [
  { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { name: "Book Appointment", href: "/book", icon: CalendarPlus },
  { name: "My Appointments", href: "/portal/appointments", icon: CalendarClock },
  { name: "Payments", href: "/portal/payments", icon: CreditCard },
  { name: "Invoices", href: "/portal/invoices", icon: FileText },
  { name: "Profile", href: "/portal/profile", icon: User },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-ivory flex flex-col md:flex-row font-dmsans">
      <aside className="w-full md:w-64 bg-warm-white border-b md:border-b-0 md:border-r border-muted-sage/20 flex flex-col justify-between py-6 px-4 shrink-0">
        <div>
          <div className="px-3 mb-8">
            <Link href="/" className="font-cormorant font-semibold text-2xl text-forest-slate block leading-tight">
              {SITE_NAME}
            </Link>
            <span className="font-dmsans text-[10px] text-teal-sage uppercase tracking-widest font-bold mt-1 block">
              Client Portal
            </span>
          </div>

          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-soft text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-teal-sage text-white shadow-warm-soft"
                      : "text-charcoal/80 hover:bg-warm-sand/50 hover:text-forest-slate"
                  }`}
                >
                  <Icon size={14} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-muted-sage/20 mt-6 px-3 flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-charcoal/80">
            Need to reschedule or cancel?
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-semibold text-teal-sage hover:text-forest-slate transition-colors"
          >
            <PhoneCall size={14} /> Contact Clinic ({CONTACT_PHONE})
          </a>
        </div>
      </aside>

      <main className="flex-grow p-6 md:p-12 overflow-y-auto max-w-7xl">{children}</main>
    </div>
  );
}
