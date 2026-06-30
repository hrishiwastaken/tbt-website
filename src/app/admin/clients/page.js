"use client";

import React, { useState, useEffect } from "react";
import { Search, UserCheck, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AdminClientsPage() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      if (res.ok) {
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading clients.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeClient = async (clientId, clientName) => {
    const confirmationText = `ERASE CLIENT ${clientName.toUpperCase()}`;
    const userPrompt = prompt(
      `WARNING: This will permanently delete ${clientName}, all their session bookings, payment history, and encrypted notes for GDPR/IT Act compliance.\n\nTo confirm, type exactly: "${confirmationText}"`
    );

    if (userPrompt !== confirmationText) {
      alert("Verification mismatch. Purge cancelled.");
      return;
    }

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message || "Client data permanently purged.");
        fetchClients();
      } else {
        setErrorMsg(data.error || "Failed to purge client data.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error purging client data.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Clients
  const filteredClients = clients.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="font-body text-body text-taupe-body py-12 italic">
        Loading client database...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Page Header */}
      <div>
        <h1 className="font-hero text-h1 text-on-surface mb-2">Patient Records</h1>
        <p className="font-body text-body text-taupe-body">Search client registry or fulfill GDPR/India IT Act compliance deletion requests.</p>
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

      {/* Search Controls */}
      <div className="flex gap-4 items-center bg-linen-surface/60 p-4 rounded-xl border border-surface-variant/30">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe-body" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient registry by name, email, or telephone number..."
            className="w-full pl-10 pr-4 py-3 bg-alabaster-bg rounded-lg border border-surface-variant/40 font-body text-caption text-on-surface focus:outline-none focus:border-rosewood-cta"
          />
        </div>
      </div>

      {/* Table view */}
      <div className="bg-linen-surface/80 rounded-2xl border border-surface-variant/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container font-label text-[10px] uppercase tracking-wider text-taupe-body border-b border-surface-variant/30">
                <th className="p-4 pl-6">Full Name & DOB</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Emergency Contact</th>
                <th className="p-4">Total Sessions</th>
                <th className="p-4">Consent Status</th>
                <th className="p-4 pr-6 text-right">Compliance actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/20 font-body text-caption">
              {filteredClients.length > 0 ? (
                filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-alabaster-bg/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-on-surface">{c.name}</div>
                      <div className="text-[11px] text-taupe-body font-mono">DOB: {c.dob}</div>
                    </td>
                    <td className="p-4 text-on-surface">
                      <div>{c.email}</div>
                      <div className="text-[11px] text-taupe-body font-mono">{c.phone}</div>
                    </td>
                    <td className="p-4 text-on-surface">
                      {c.emergencyContact}
                    </td>
                    <td className="p-4 text-on-surface font-semibold pl-8">
                      {c._count.bookings}
                    </td>
                    <td className="p-4">
                      {c.gdprConsent ? (
                        <span className="text-[#536256] font-semibold flex items-center gap-1">
                          <ShieldCheck size={14} /> Agreed
                        </span>
                      ) : (
                        <span className="text-[#ba1a1a] font-semibold flex items-center gap-1">
                          <AlertTriangle size={14} /> Refused
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handlePurgeClient(c.id, c.name)}
                        disabled={actionLoading}
                        className="bg-transparent hover:bg-[#ffdad6] text-[#ba1a1a] hover:text-[#ba1a1a] border border-[#ba1a1a]/30 rounded-full px-3 py-1.5 font-label text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        Purge Patient File
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-taupe-body italic">
                    No patients matching search parameters.
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
