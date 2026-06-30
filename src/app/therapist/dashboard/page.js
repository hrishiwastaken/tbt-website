"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, User, Phone, Mail, Award, Clock, FileText, CheckCircle2, AlertCircle, LogOut } from "lucide-react";

export default function TherapistDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [statusVal, setStatusVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/therapist/bookings");
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
        setTherapist(data.therapist || null);
      } else {
        router.push("/therapist/login");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading dashboard data.");
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
      const res = await fetch(`/api/therapist/bookings/${selectedBooking.id}`, {
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
        // Refresh local items state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === selectedBooking.id
              ? { ...b, status: statusVal, notes: notesText }
              : b
          )
        );
        setSelectedBooking((prev) => ({
          ...prev,
          status: statusVal,
          notes: notesText,
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

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/therapist/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Metrics
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED").length;
  const upcomingBookings = bookings.filter((b) => b.status === "CONFIRMED").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-alabaster-bg flex justify-center items-center font-body text-body text-taupe-body">
        Loading therapist profile and sessions...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-alabaster-bg flex flex-col font-body">
      {/* Top Navbar */}
      <header className="bg-surface-bright border-b border-surface-variant/30 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-40">
        <div>
          <span className="font-hero text-h3 text-primary block">Madhumati Clinic</span>
          <span className="font-label text-label text-rosewood-cta uppercase tracking-widest">
            {therapist?.name || "Therapist Portal"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 border border-outline hover:bg-surface-container-low text-on-surface px-4 py-2 rounded-full font-label text-label uppercase tracking-widest transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="max-w-7xl w-full mx-auto p-6 md:p-12 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Center Column: Session List & Stats */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-linen-surface p-4 rounded-xl border border-surface-variant/30 text-center">
              <span className="text-h3 font-hero text-rosewood-cta block">{totalBookings}</span>
              <span className="font-label text-[10px] uppercase text-taupe-body tracking-wider">Total</span>
            </div>
            <div className="bg-linen-surface p-4 rounded-xl border border-surface-variant/30 text-center">
              <span className="text-h3 font-hero text-[#536256] block">{completedBookings}</span>
              <span className="font-label text-[10px] uppercase text-taupe-body tracking-wider">Completed</span>
            </div>
            <div className="bg-linen-surface p-4 rounded-xl border border-surface-variant/30 text-center">
              <span className="text-h3 font-hero text-tertiary block">{upcomingBookings}</span>
              <span className="font-label text-[10px] uppercase text-taupe-body tracking-wider">Upcoming</span>
            </div>
          </div>

          {/* Bookings List */}
          <div className="bg-linen-surface/85 p-6 rounded-2xl border border-surface-variant/30 shadow-sm flex flex-col gap-4">
            <h3 className="font-hero text-h3 text-on-surface border-b border-surface-variant/20 pb-3 flex items-center gap-2">
              <Calendar size={20} className="text-rosewood-cta" /> Appointments Log
            </h3>

            {bookings.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {bookings.map((booking) => {
                  const bDate = new Date(booking.dateTime).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const bTime = new Date(booking.dateTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isSelected = selectedBooking?.id === booking.id;

                  return (
                    <div
                      key={booking.id}
                      onClick={() => handleBookingClick(booking)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                        isSelected
                          ? "border-rosewood-cta bg-alabaster-bg shadow-sm"
                          : "border-surface-variant bg-transparent hover:border-outline"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <h4 className="font-bold text-on-surface font-body text-body">{booking.client.name}</h4>
                        <span className="font-label text-[11px] text-taupe-body uppercase tracking-wider">
                          {booking.service.name} • {bDate} at {bTime}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded text-caption font-semibold ${
                          booking.status === "COMPLETED"
                            ? "bg-[#d6e7d7] text-[#111f15]"
                            : booking.status === "CANCELLED"
                            ? "bg-[#ffdad6] text-[#ba1a1a]"
                            : booking.status === "NO_SHOW"
                            ? "bg-surface-container-highest text-primary-fixed-dim"
                            : "bg-primary-container text-rosewood-cta border border-rosewood-cta/30"
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-body text-body text-taupe-body italic text-center py-8">
                No appointment bookings registered under your profile.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Form Editor (Client details + Secure notes) */}
        <div className="lg:col-span-5">
          {selectedBooking ? (
            <div className="bg-linen-surface/85 p-8 rounded-2xl border border-surface-variant/30 shadow-sm flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
              <div className="border-b border-surface-variant/20 pb-4">
                <span className="font-label text-[10px] text-rosewood-cta uppercase tracking-widest block mb-1">Active Record</span>
                <h3 className="font-hero text-h2 text-on-surface">{selectedBooking.client.name}</h3>
                <p className="font-body text-caption text-taupe-body">
                  Session ID: <span className="font-mono text-[10px]">{selectedBooking.id.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>

              {/* Success/Error displays */}
              {successMsg && (
                <div className="p-4 rounded bg-[#d6e7d7] text-[#111f15] font-body text-caption flex items-center gap-2">
                  <CheckCircle2 size={16} /> {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-4 rounded bg-[#ffdad6] text-[#ba1a1a] font-body text-caption font-semibold flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}

              {/* Client detail details */}
              <div className="flex flex-col gap-3 font-body text-caption text-taupe-body bg-alabaster-bg p-4 rounded-xl border border-surface-variant/20">
                <div className="flex justify-between items-center border-b border-surface-variant/10 pb-2">
                  <span className="font-label text-[10px] uppercase font-semibold">Email</span>
                  <span className="text-on-surface font-semibold flex items-center gap-1">
                    <Mail size={12} /> {selectedBooking.client.email}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-variant/10 pb-2">
                  <span className="font-label text-[10px] uppercase font-semibold">Phone</span>
                  <span className="text-on-surface font-semibold flex items-center gap-1">
                    <Phone size={12} /> {selectedBooking.client.phone}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-variant/10 pb-2">
                  <span className="font-label text-[10px] uppercase font-semibold">Date of Birth</span>
                  <span className="text-on-surface font-semibold">{selectedBooking.client.dob}</span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-variant/10 pb-2">
                  <span className="font-label text-[10px] uppercase font-semibold">Emergency Link</span>
                  <span className="text-on-surface font-semibold">{selectedBooking.client.emergencyContact}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-label text-[10px] uppercase font-semibold">Payment Status</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedBooking.paymentStatus === "PAID" ? "bg-[#d6e7d7] text-[#111f15]" : "bg-[#ffdad6] text-[#ba1a1a]"
                  }`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Status and Notes Update form */}
              <form onSubmit={handleUpdateSession} className="space-y-6">
                <div>
                  <label className="font-label text-label text-taupe-body uppercase tracking-wider block mb-2">Session Status</label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-alabaster-bg rounded-lg border border-surface-variant p-3 font-body text-caption text-on-surface focus:ring-rosewood-cta focus:border-rosewood-cta"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="NO_SHOW">NO_SHOW</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="font-label text-label text-taupe-body uppercase tracking-wider block mb-2 flex items-center gap-1">
                    <FileText size={14} className="text-rosewood-cta" /> Clinical Session Notes
                  </label>
                  <textarea
                    rows={6}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Write session summaries, progress logs, or therapeutic targets securely. These notes will be cryptographically encrypted."
                    className="w-full bg-alabaster-bg rounded-lg border border-surface-variant p-4 font-body text-caption text-on-surface focus:ring-rosewood-cta focus:border-rosewood-cta"
                  />
                  <span className="text-[10px] text-taupe-body/75 block mt-1">
                    * Data safety: Notes are encrypted at rest using AES-256-GCM.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-rosewood-cta text-on-primary font-body text-body py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Encrypting & Saving..." : "Save Session Records"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-linen-surface/50 border border-dashed border-surface-variant/60 rounded-2xl p-12 text-center text-taupe-body/80 flex flex-col items-center gap-4 h-full justify-center min-h-[400px]">
              <FileText size={48} className="text-surface-variant" />
              <p className="font-body text-body leading-relaxed max-w-[280px]">
                Select an appointment from the list to manage records, write notes, and verify client details.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
