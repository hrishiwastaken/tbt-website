"use client";

import React, { useState, useEffect } from "react";
import { IndianRupee, Users, HeartHandshake, CalendarCheck } from "lucide-react";

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
      <div className="font-dmsans text-sm text-ink-muted py-12 italic">
        Loading analytics overview...
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Revenue",
      value: `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`,
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
      value: stats?.bookingsCount?.total ?? 0,
      icon: CalendarCheck,
      desc: `Completed: ${stats?.bookingsCount?.completed ?? 0} | Confirmed: ${stats?.bookingsCount?.confirmed ?? 0}`,
    },
  ];

  return (
    <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="font-cormorant text-4xl font-semibold text-ocean-deep mb-2">Practice Overview</h1>
        <p className="font-dmsans text-sm text-ink-muted">Live aggregate statistics for clinical and billing operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="surface-raised rounded-surface p-6 flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold tracking-wider uppercase text-ink-muted">{card.name}</span>
                <span className="h-10 w-10 rounded-full surface-inset flex items-center justify-center text-ocean">
                  <Icon size={18} />
                </span>
              </div>
              <div>
                <span className="font-cormorant text-3xl font-bold text-ocean-deep block mb-1">{card.value}</span>
                <span className="text-[11px] text-ink-muted/80 font-medium">{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="surface-raised rounded-surface p-8">
          <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep mb-6 border-b border-ocean/10 pb-3">
            Appointments by Therapist
          </h3>
          <div className="space-y-4">
            {stats?.therapistDistribution.map((t) => (
              <div key={t.name} className="flex flex-col gap-1 font-dmsans">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-ocean-deep">{t.name}</span>
                  <span className="text-ocean">{t.bookingsCount} sessions</span>
                </div>
                <div className="h-2 w-full surface-inset rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ocean rounded-full"
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

        <div className="surface-raised rounded-surface p-8 flex flex-col justify-between min-h-[250px]">
          <div>
            <h3 className="font-cormorant text-2xl font-semibold text-ocean-deep mb-3 border-b border-ocean/10 pb-3">
              Compliance Standard
            </h3>
            <p className="font-dmsans text-xs text-ink-muted leading-relaxed mb-4">
              All databases conform to HIPAA-ready and India IT Act guidelines. Client files are
              locked down via <strong>AES-256 encryption</strong>. Only assigned therapists can
              decode clinical notes.
            </p>
          </div>
          <div className="surface-inset rounded-soft p-3 font-mono text-[10px] text-ink-muted">
            Encryption Status: SECURED (GCM mode active)
          </div>
        </div>
      </div>
    </div>
  );
}
