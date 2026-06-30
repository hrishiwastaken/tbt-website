"use client";

import React, { useState, useEffect } from "react";
import { Search, Calendar, User, CheckCircle, AlertOctagon, XCircle } from "lucide-react";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading bookings.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this appointment? This action is irreversible.")) return;

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message || "Appointment cancelled successfully.");
        // Refresh bookings log
        fetchBookings();
      } else {
        setErrorMsg(data.error || "Failed to cancel appointment.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error during cancellation.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.invoiceNumber && b.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="font-body text-body text-taupe-body py-12 italic">
        Loading appointments log...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-hero text-h1 text-on-surface mb-2">Bookings Manager</h1>
          <p className="font-body text-body text-taupe-body">Reschedule, cancel, or audit practice schedule logs.</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded bg-[#d6e7d7] text-[#111f15] font-body text-caption">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded bg-[#ffdad6] text-[#ba1a1a] font-body text-caption font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-linen-surface/60 p-4 rounded-xl border border-surface-variant/30">
        <div className="relative flex-grow w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe-body" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client, therapist, service, or receipt ID..."
            className="w-full pl-10 pr-4 py-3 bg-alabaster-bg rounded-lg border border-surface-variant/40 font-body text-caption text-on-surface focus:outline-none focus:border-rosewood-cta"
          />
        </div>
        
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-alabaster-bg rounded-lg border border-surface-variant/40 p-3 font-body text-caption text-on-surface focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PENDING">PENDING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="NO_SHOW">NO_SHOW</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-linen-surface/80 rounded-2xl border border-surface-variant/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container font-label text-[10px] uppercase tracking-wider text-taupe-body border-b border-surface-variant/30">
                <th className="p-4 pl-6">Client Details</th>
                <th className="p-4">Practitioner</th>
                <th className="p-4">Therapy Slot</th>
                <th className="p-4">Billing Status</th>
                <th className="p-4">Appt Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/20 font-body text-caption">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => {
                  const bDate = new Date(b.dateTime).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const bTime = new Date(b.dateTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={b.id} className="hover:bg-alabaster-bg/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-on-surface">{b.client.name}</div>
                        <div className="text-[11px] text-taupe-body">{b.client.email}</div>
                      </td>
                      <td className="p-4 text-on-surface">
                        <div className="font-semibold">{b.therapist.name}</div>
                        <div className="text-[11px] text-taupe-body">{b.service.name}</div>
                      </td>
                      <td className="p-4 text-on-surface font-semibold">
                        <div>{bDate}</div>
                        <div className="text-[11px] text-taupe-body">{bTime} ({b.durationMinutes} min)</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-on-surface">
                          ₹{b.amount.toLocaleString("en-IN")}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          b.paymentStatus === "PAID"
                            ? "bg-[#d6e7d7] text-[#111f15]"
                            : "bg-[#ffdad6] text-[#ba1a1a]"
                        }`}>
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[11px] font-semibold ${
                          b.status === "COMPLETED"
                            ? "text-[#536256]"
                            : b.status === "CANCELLED"
                            ? "text-[#ba1a1a]"
                            : b.status === "NO_SHOW"
                            ? "text-primary-fixed-dim"
                            : "text-rosewood-cta"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {b.status !== "CANCELLED" && b.status !== "COMPLETED" ? (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={actionLoading}
                            className="bg-transparent hover:bg-[#ffdad6] text-[#ba1a1a] hover:text-[#ba1a1a] border border-[#ba1a1a]/30 rounded-full px-3 py-1.5 font-label text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <XCircle size={10} /> Cancel
                          </button>
                        ) : (
                          <span className="text-[10px] text-taupe-body font-mono">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-taupe-body italic">
                    No bookings found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
