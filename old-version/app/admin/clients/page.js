"use client";

import React, { useState, useEffect } from "react";
import { Search, AlertTriangle, ShieldCheck } from "lucide-react";

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
      <div className="font-dmsans text-sm text-sage py-12 italic">
        Loading client database...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Page Header */}
      <div>
        <h1 className="font-cormorant text-4xl font-semibold text-charcoal mb-2">Patient Records</h1>
        <p className="font-dmsans text-sm text-sage">Search client registry or fulfill GDPR/India IT Act compliance deletion requests.</p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-red-200 text-red-700 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Search Controls */}
      <div className="flex gap-4 items-center bg-sand/20 p-4 rounded-xl border border-mist/30">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patient registry by name, email, or phone number..."
            className="w-full pl-10 pr-4 py-3 bg-warm-white/60 rounded-lg border border-mist/40 font-dmsans text-xs text-charcoal focus:outline-none focus:border-forest"
          />
        </div>
      </div>

      {/* Table view */}
      <div className="glass-card rounded-2xl border border-mist/30 overflow-hidden shadow-warm-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-mist/10 font-dmsans text-[10px] uppercase tracking-wider text-sage border-b border-mist/20">
                <th className="p-4 pl-6">Full Name & DOB</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Emergency Contact</th>
                <th className="p-4">Total Sessions</th>
                <th className="p-4">Consent Status</th>
                <th className="p-4 pr-6 text-right">Compliance actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist/10 font-dmsans text-xs text-charcoal">
              {filteredClients.length > 0 ? (
                filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-warm-white/40 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-charcoal">{c.name}</div>
                      <div className="text-[11px] text-sage font-mono">DOB: {c.dob}</div>
                    </td>
                    <td className="p-4 text-charcoal">
                      <div>{c.email}</div>
                      <div className="text-[11px] text-sage font-mono">{c.phone}</div>
                    </td>
                    <td className="p-4 text-charcoal">
                      {c.emergencyContact}
                    </td>
                    <td className="p-4 text-charcoal font-semibold pl-8">
                      {c._count.bookings}
                    </td>
                    <td className="p-4">
                      {c.gdprConsent ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <ShieldCheck size={14} /> Agreed
                        </span>
                      ) : (
                        <span className="text-red-700 font-semibold flex items-center gap-1">
                          <AlertTriangle size={14} /> Refused
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handlePurgeClient(c.id, c.name)}
                        disabled={actionLoading}
                        className="bg-transparent hover:bg-rose-50 text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        Purge Patient File
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sage italic">
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
