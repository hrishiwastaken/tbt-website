"use client";

import React, { useState, useEffect } from "react";
import { Search, Download, CreditCard, ShieldAlert } from "lucide-react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error loading payments.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open("/api/admin/reports", "_blank");
  };

  // Filter Payments
  const filteredPayments = payments.filter((p) => {
    const clientName = p.booking.client.name.toLowerCase();
    const invoiceNum = (p.invoiceNumber || "").toLowerCase();
    const rzpId = (p.razorpayPaymentId || "").toLowerCase();
    const query = searchTerm.toLowerCase();

    return (
      clientName.includes(query) ||
      invoiceNum.includes(query) ||
      rzpId.includes(query)
    );
  });

  // Calculate gross total
  const grossTotal = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="font-body text-body text-taupe-body py-12 italic">
        Loading financial logs...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-hero text-h1 text-on-surface mb-2">Transactions Log</h1>
          <p className="font-body text-body text-taupe-body">Audit clinic payment receipts, Razorpay orders, and downloads.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-rosewood-cta text-on-primary hover:opacity-90 px-6 py-3 rounded-full font-label text-label uppercase tracking-widest transition-opacity shadow-sm"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded bg-[#ffdad6] text-[#ba1a1a] font-body text-caption font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Stats Summary & Search bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Gross Revenue Summary Card */}
        <div className="md:col-span-4 bg-surface-container-low p-6 rounded-2xl border border-surface-variant/20 flex items-center justify-between shadow-sm">
          <div>
            <span className="font-label text-label text-taupe-body uppercase tracking-wider block mb-1">Gross Revenue</span>
            <span className="font-hero text-h2 text-on-surface font-bold">
              ₹{grossTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <span className="h-12 w-12 bg-surface-container rounded-full flex items-center justify-center text-rosewood-cta">
            <CreditCard size={20} />
          </span>
        </div>

        {/* Search */}
        <div className="md:col-span-8 relative w-full h-full flex items-center bg-linen-surface/60 p-4 rounded-2xl border border-surface-variant/30">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe-body" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ledger by client, invoice number, or Razorpay ID..."
              className="w-full pl-10 pr-4 py-3 bg-alabaster-bg rounded-lg border border-surface-variant/40 font-body text-caption text-on-surface focus:outline-none focus:border-rosewood-cta"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-linen-surface/80 rounded-2xl border border-surface-variant/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container font-label text-[10px] uppercase tracking-wider text-taupe-body border-b border-surface-variant/30">
                <th className="p-4 pl-6">Invoice Number</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Paid For</th>
                <th className="p-4">Razorpay Reference</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6">Transaction Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/20 font-body text-caption">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => {
                  const pDate = new Date(p.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const pTime = new Date(p.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={p.id} className="hover:bg-alabaster-bg/50 transition-colors">
                      <td className="p-4 pl-6 font-mono text-caption text-on-surface font-semibold">
                        {p.invoiceNumber || `REC-${p.bookingId.slice(0, 6).toUpperCase()}`}
                      </td>
                      <td className="p-4 text-on-surface font-semibold">
                        {p.booking.client.name}
                      </td>
                      <td className="p-4 text-on-surface">
                        <div className="font-semibold">{p.booking.service.name}</div>
                        <div className="text-[11px] text-taupe-body">with {p.booking.therapist.name}</div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-taupe-body">
                        {p.razorpayPaymentId || <span className="italic text-taupe-body/50">pay_mock_direct</span>}
                      </td>
                      <td className="p-4 text-on-surface font-bold">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          p.status === "SUCCESS"
                            ? "bg-[#d6e7d7] text-[#111f15]"
                            : p.status === "REFUNDED"
                            ? "bg-surface-container text-taupe-body"
                            : "bg-[#ffdad6] text-[#ba1a1a]"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-taupe-body font-semibold">
                        {pDate} <span className="text-[10px] font-normal font-mono">at {pTime}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-taupe-body italic">
                    No transactions matching search parameters.
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
