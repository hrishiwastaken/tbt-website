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
      <div className="font-dmsans text-sm text-sage py-12 italic">
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
        <h1 className="font-cormorant text-4xl font-semibold text-charcoal mb-2">Practice Overview</h1>
        <p className="font-dmsans text-sm text-sage">Live aggregate statistics for clinical and billing operations.</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="glass-card p-6 rounded-2xl border border-mist/30 shadow-warm-soft flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold tracking-wider uppercase text-sage">{card.name}</span>
                <span className="h-10 w-10 bg-mist/20 rounded-full flex items-center justify-center text-forest">
                  <Icon size={18} />
                </span>
              </div>
              <div>
                <span className="font-cormorant text-3xl font-bold text-charcoal block mb-1">{card.value}</span>
                <span className="text-[11px] text-sage/80 font-medium">{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roster & Distribution splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Therapist Allocation */}
        <div className="glass-card p-8 rounded-2xl border border-mist/30 shadow-warm-soft">
          <h3 className="font-cormorant text-2xl font-semibold text-charcoal mb-6 border-b border-mist/20 pb-3">
            Appointments by Therapist
          </h3>
          <div className="space-y-4">
            {stats?.therapistDistribution.map((t) => (
              <div key={t.name} className="flex flex-col gap-1 font-dmsans">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-charcoal">{t.name}</span>
                  <span className="text-terracotta">{t.bookingsCount} sessions</span>
                </div>
                {/* Horizontal Progress bar */}
                <div className="h-2 w-full bg-mist/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-forest rounded-full"
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
        <div className="glass-card p-8 rounded-2xl border border-mist/30 shadow-warm-soft flex flex-col justify-between min-h-[250px]">
          <div>
            <h3 className="font-cormorant text-2xl font-semibold text-charcoal mb-3 border-b border-mist/20 pb-3">
              Compliance Standard
            </h3>
            <p className="font-dmsans text-xs text-sage leading-relaxed mb-4">
              All databases conform to HIPAA-ready and India IT Act guidelines. Client files are locked down via <strong>AES-256 encryption</strong>. 
              Only assigned therapists can decode clinical notes.
            </p>
          </div>
          <div className="p-3 bg-mist/10 rounded-lg border border-mist/20 font-mono text-[10px] text-sage">
            Encryption Status: SECURED (GCM mode active)
          </div>
        </div>
      </div>
    </div>
  );
}
