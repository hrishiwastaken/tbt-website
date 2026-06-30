"use client";

import React, { useState, useEffect } from "react";
import { Search, XCircle, FileText, CheckCircle2, AlertCircle, Mail, Phone } from "lucide-react";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Consolidated therapist functionality
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [statusVal, setStatusVal] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setNotesText(booking.notes || "");
    setStatusVal(booking.status);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusVal,
          notes: notesText,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("Session details updated successfully.");
        setBookings((prev) =>
          prev.map((b) =>
            b.id === selectedBooking.id
              ? { ...b, status: statusVal, notes: notesText, paymentStatus: statusVal === "COMPLETED" ? "PAID" : b.paymentStatus }
              : b
          )
        );
        setSelectedBooking((prev) => ({
          ...prev,
          status: statusVal,
          notes: notesText,
          paymentStatus: statusVal === "COMPLETED" ? "PAID" : prev.paymentStatus
        }));
      } else {
        setErrorMsg(data.error || "Failed to save updates.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error saving notes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBooking = async (bookingId, e) => {
    e.stopPropagation();
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
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev) => ({ ...prev, status: "CANCELLED" }));
          setStatusVal("CANCELLED");
        }
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
      <div className="font-dmsans text-sm text-sage py-12 italic">
        Loading appointments log...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-cormorant text-4xl font-semibold text-charcoal mb-2">Bookings Manager</h1>
          <p className="font-dmsans text-sm text-sage">Manage, schedule, cancel, or edit clinical notes in one place.</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Two column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Appointments List & Table */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-sand/20 p-4 rounded-xl border border-mist/30">
            <div className="relative flex-grow w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by client, service..."
                className="w-full pl-10 pr-4 py-3 bg-warm-white/60 rounded-lg border border-mist/40 font-dmsans text-xs text-charcoal focus:outline-none focus:border-forest"
              />
            </div>
            
            <div className="w-full sm:w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-warm-white/60 rounded-lg border border-mist/40 p-3 font-dmsans text-xs text-charcoal focus:outline-none focus:border-forest"
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

          {/* Table Container */}
          <div className="glass-card rounded-2xl border border-mist/30 overflow-hidden shadow-warm-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-mist/10 font-dmsans text-[10px] uppercase tracking-wider text-sage border-b border-mist/20">
                    <th className="p-4 pl-6">Client</th>
                    <th className="p-4">Slot</th>
                    <th className="p-4">Billing</th>
                    <th className="p-4">Appt</th>
                    <th className="p-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist/10 font-dmsans text-xs text-charcoal">
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
                      const isSelected = selectedBooking?.id === b.id;

                      return (
                        <tr
                          key={b.id}
                          onClick={() => handleBookingClick(b)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? "bg-forest/10 hover:bg-forest/15" 
                              : "hover:bg-warm-white/40"
                          }`}
                        >
                          <td className="p-4 pl-6">
                            <div className="font-bold text-charcoal">{b.client.name}</div>
                            <div className="text-[11px] text-sage">{b.service.name}</div>
                          </td>
                          <td className="p-4 text-charcoal font-semibold">
                            <div>{bDate}</div>
                            <div className="text-[11px] text-sage">{bTime}</div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              b.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}>
                              {b.paymentStatus}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold ${
                              b.status === "COMPLETED"
                                ? "text-emerald-700"
                                : b.status === "CANCELLED"
                                ? "text-red-700"
                                : b.status === "NO_SHOW"
                                ? "text-sage/60"
                                : "text-terracotta"
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {b.status !== "CANCELLED" && b.status !== "COMPLETED" ? (
                              <button
                                onClick={(e) => handleCancelBooking(b.id, e)}
                                disabled={actionLoading}
                                className="bg-transparent hover:bg-rose-50 text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 rounded-full px-3 py-1.5 text-[9px] uppercase font-bold tracking-wider transition-all disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <XCircle size={10} /> Cancel
                              </button>
                            ) : (
                              <span className="text-[10px] text-sage font-mono">Archived</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sage italic">
                        No bookings found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Secure Session Notes & Booking Details Form */}
        <div className="lg:col-span-5">
          {selectedBooking ? (
            <div className="glass-card p-6 md:p-8 rounded-2xl border border-mist/30 shadow-warm-soft flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
              <div className="border-b border-mist/20 pb-4">
                <span className="text-[9px] font-bold text-terracotta uppercase tracking-wider block mb-1">Session Record</span>
                <h3 className="font-cormorant text-2xl font-bold text-charcoal">{selectedBooking.client.name}</h3>
                <p className="text-xs text-sage">
                  Booking Reference: <span className="font-mono text-[10px]">{selectedBooking.id.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>

              {/* Client Summary card */}
              <div className="flex flex-col gap-3 text-xs text-sage bg-warm-white/50 p-4 rounded-xl border border-mist/20 font-dmsans">
                <div className="flex justify-between items-center border-b border-mist/10 pb-2">
                  <span className="text-[9px] uppercase font-bold text-sage">Email</span>
                  <span className="text-charcoal font-semibold flex items-center gap-1">
                    <Mail size={12} className="shrink-0" /> {selectedBooking.client.email}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-mist/10 pb-2">
                  <span className="text-[9px] uppercase font-bold text-sage">Phone</span>
                  <span className="text-charcoal font-semibold flex items-center gap-1">
                    <Phone size={12} className="shrink-0" /> {selectedBooking.client.phone}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-mist/10 pb-2">
                  <span className="text-[9px] uppercase font-bold text-sage">Date of Birth</span>
                  <span className="text-charcoal font-semibold">{selectedBooking.client.dob}</span>
                </div>
                <div className="flex justify-between items-center border-b border-mist/10 pb-2">
                  <span className="text-[9px] uppercase font-bold text-sage">Emergency Contact</span>
                  <span className="text-charcoal font-semibold">{selectedBooking.client.emergencyContact}</span>
                </div>
                {selectedBooking.razorpayPaymentId && (
                  <div className="flex justify-between items-center border-b border-mist/10 pb-2">
                    <span className="text-[9px] uppercase font-bold text-sage">UPI Ref / UTR</span>
                    <span className="text-charcoal font-semibold font-mono">{selectedBooking.razorpayPaymentId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase font-bold text-sage">Payment Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedBooking.paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                      : "bg-red-50 text-red-700 border border-red-100"
                  }`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Form updates */}
              <form onSubmit={handleUpdateSession} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-sage block mb-2">Session Status</label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-warm-white/60 rounded-xl border border-mist/35 p-3 text-xs text-charcoal focus:outline-none focus:border-forest"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="NO_SHOW">NO_SHOW</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-sage block mb-2 flex items-center gap-1">
                    <FileText size={14} className="text-terracotta" /> Secure Clinical Notes
                  </label>
                  <textarea
                    rows={6}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Write session summaries, progress logs, or therapeutic targets securely. These notes will be cryptographically encrypted at rest."
                    className="w-full bg-warm-white/60 rounded-xl border border-mist/35 p-4 text-xs text-charcoal focus:outline-none focus:border-forest"
                  />
                  <span className="text-[9px] text-sage/75 block mt-1">
                    * Compliance note: Data is encrypted using AES-256-GCM.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-forest hover:bg-terracotta text-warm-white font-bold py-3 rounded-full transition-colors disabled:opacity-50 shadow-sm"
                >
                  {saving ? "Encrypting & Saving..." : "Save Session Records"}
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-card border border-dashed border-mist/60 rounded-2xl p-12 text-center text-sage/80 flex flex-col items-center gap-4 h-full justify-center min-h-[400px]">
              <FileText size={48} className="text-mist" />
              <p className="text-xs leading-relaxed max-w-[280px]">
                Select an appointment from the log table to manage records, write secure clinical notes, and verify client details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
