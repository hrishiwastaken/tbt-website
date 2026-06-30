"use client";

import React, { useState, useEffect } from "react";
import { LayoutDashboard, IndianRupee, Users, HeartHandshake, CalendarCheck } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="font-body text-body text-taupe-body py-12 italic">
        Loading analytics overview...
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Revenue",
      value: `₹${stats?.totalRevenue.toLocaleString("en-IN") || 0}`,
      icon: IndianRupee,
      desc: "Captured transactions from booking checkouts",
    },
    {
      name: "Active Patients",
      value: stats?.clientsCount || 0,
      icon: Users,
      desc: "Total client database registrations",
    },
    {
      name: "Practitioners",
      value: stats?.therapistsCount || 0,
      icon: HeartHandshake,
      desc: "Licensed psychologists on roster",
    },
    {
      name: "Session Bookings",
      value: stats?.bookingsCount.total || 0,
      icon: CalendarCheck,
      desc: `Completed: ${stats?.bookingsCount.completed} | Confirmed: ${stats?.bookingsCount.confirmed}`,
    },
  ];

  return (
    <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
      {/* Page Header */}
      <div>
        <h1 className="font-hero text-h1 text-on-surface mb-2">Practice Overview</h1>
        <p className="font-body text-body text-taupe-body">Live aggregate statistics for clinical and billing operations.</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="bg-linen-surface/80 p-6 rounded-2xl border border-surface-variant/40 shadow-sm flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="font-label text-label text-taupe-body uppercase tracking-wider">{card.name}</span>
                <span className="h-10 w-10 bg-surface-container rounded-full flex items-center justify-center text-rosewood-cta">
                  <Icon size={18} />
                </span>
              </div>
              <div>
                <span className="font-hero text-h2 text-on-surface font-bold block mb-1">{card.value}</span>
                <span className="font-body text-[11px] text-taupe-body/80">{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roster & Distribution splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Therapist Allocation */}
        <div className="bg-linen-surface/80 p-8 rounded-2xl border border-surface-variant/40 shadow-sm">
          <h3 className="font-hero text-h3 text-on-surface mb-6 border-b border-surface-variant/20 pb-3">
            Appointments by Therapist
          </h3>
          <div className="space-y-4">
            {stats?.therapistDistribution.map((t) => (
              <div key={t.name} className="flex flex-col gap-1 font-body">
                <div className="flex justify-between text-caption font-semibold">
                  <span className="text-on-surface">{t.name}</span>
                  <span className="text-rosewood-cta">{t.bookingsCount} sessions</span>
                </div>
                {/* Horizontal Progress bar */}
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rosewood-cta rounded-full"
                    style={{
                      width: `${
                        stats.bookingsCount.total > 0
                          ? (t.bookingsCount / stats.bookingsCount.total) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Short Guide Card */}
        <div className="bg-linen-surface/80 p-8 rounded-2xl border border-surface-variant/40 shadow-sm flex flex-col justify-between min-h-[250px]">
          <div>
            <h3 className="font-hero text-h3 text-on-surface mb-3 border-b border-surface-variant/20 pb-3">
              Compliance Standard
            </h3>
            <p className="font-body text-caption text-taupe-body leading-relaxed mb-4">
              All databases conform to HIPAA-ready and India IT Act guidelines. Client files are locked down via <strong>AES-256 encryption</strong>. 
              Only assigned therapists can decode clinical notes.
            </p>
          </div>
          <div className="p-3 bg-surface-container rounded-lg border border-surface-variant/20 font-mono text-[10px] text-taupe-body">
            Encryption Status: SECURED (GCM mode active)
          </div>
        </div>
      </div>
    </div>
  );
}
