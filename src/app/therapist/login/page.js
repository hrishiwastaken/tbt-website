"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TherapistLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Force redirect to dashboard
        router.push(data.redirectUrl || "/therapist/dashboard");
        router.refresh();
      } else {
        setErrorMsg(data.error || "Authentication failed.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("A network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-alabaster-bg flex flex-col justify-center items-center px-margin-mobile relative overflow-hidden">
      {/* Decorative breathe bg */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full breathwork-bg blur-3xl opacity-20"></div>
      </div>

      <div className="w-full max-w-md bg-linen-surface p-8 md:p-12 rounded-[20px] border border-surface-variant/40 shadow-sm text-center">
        <Link href="/" className="font-hero text-h2 text-primary hover:opacity-90 transition-opacity block mb-2">
          Madhumati Clinic
        </Link>
        <span className="font-label text-label text-rosewood-cta uppercase tracking-widest block mb-8">
          Therapist Portal
        </span>

        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-[#ffdad6] text-[#ba1a1a] font-body text-caption font-semibold text-left">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label className="font-label text-label text-taupe-body uppercase block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="therapist@madhumaticlinic.com"
              className="form-input-minimal"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="font-label text-label text-taupe-body uppercase block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="form-input-minimal"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rosewood-cta text-on-primary font-body text-body py-4 rounded-full hover:opacity-90 transition-opacity mt-4 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Login to Portal"}
          </button>
        </form>

        <div className="mt-8 border-t border-surface-variant/30 pt-4 flex justify-between font-caption text-caption text-taupe-body">
          <Link href="/" className="hover:text-rosewood-cta transition-colors">
            ← Main Site
          </Link>
          <Link href="/admin/login" className="hover:text-rosewood-cta transition-colors">
            Admin Login →
          </Link>
        </div>
      </div>
    </main>
  );
}
