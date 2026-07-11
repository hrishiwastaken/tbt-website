"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SITE_NAME } from "../../../lib/site";

export default function TherapistLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portal: "therapist" }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(data.redirectUrl || "/therapist");
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
    <main
      data-panel
      className="min-h-screen bg-panel-ivory flex flex-col justify-center items-center px-6 font-dmsans"
    >
      <div className="surface-raised rounded-panel w-full max-w-md p-8 md:p-12">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-cormorant font-semibold text-3xl text-ocean-deep block mb-2"
          >
            {SITE_NAME}
          </Link>
          <span className="text-xs font-bold tracking-widest text-ocean uppercase block">
            Consultant Portal
          </span>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-red-200 text-red-700 text-xs font-semibold text-left">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label className="text-xs font-bold tracking-wider uppercase text-ink-muted block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@thebraintea.com"
              className="w-full bg-surface border-t-0 border-l-0 border-r-0 border-b border-ocean/25 focus:ring-0 focus:border-ocean text-ink py-2 px-0 transition-colors text-base"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-bold tracking-wider uppercase text-ink-muted block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-surface border-t-0 border-l-0 border-r-0 border-b border-ocean/25 focus:ring-0 focus:border-ocean text-ink py-2 px-0 transition-colors text-base"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ocean hover:-translate-y-0.5 text-white font-bold py-4 rounded-full transition-all mt-4 disabled:opacity-50 shadow-surface-raised-sm"
          >
            {loading ? "Authenticating..." : "Login to Portal"}
          </button>
        </form>

        <div className="mt-8 border-t border-ocean/10 pt-4 flex justify-between text-xs text-ink-muted font-medium">
          <Link href="/" className="hover:text-ocean-deep transition-colors">
            ← Main Site
          </Link>
          <Link
            href="/admin/login"
            className="hover:text-ocean-deep transition-colors"
          >
            Admin Login →
          </Link>
        </div>
      </div>
    </main>
  );
}
