"use client";

import React, { useState, useEffect } from "react";
import { Search, Download, CreditCard } from "lucide-react";

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
      <div className="font-dmsans text-sm text-sage py-12 italic">
        Loading financial logs...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-cormorant text-4xl font-semibold text-charcoal mb-2">Transactions Log</h1>
          <p className="font-dmsans text-sm text-sage">Audit clinic payment receipts, Razorpay orders, and downloads.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-forest hover:bg-terracotta text-warm-white px-6 py-3 rounded-full font-dmsans text-xs font-bold tracking-widest uppercase transition-all shadow-sm hover:shadow-md"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-red-200 text-red-700 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Stats Summary & Search bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Gross Revenue Summary Card */}
        <div className="md:col-span-4 bg-warm-white/50 p-6 rounded-2xl border border-mist/20 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-sage block mb-1">Gross Revenue</span>
            <span className="font-cormorant text-3xl font-bold text-charcoal">
              ₹{grossTotal.toLocaleString("en-IN")}
            </span>
          </div>
          <span className="h-12 w-12 bg-mist/20 rounded-full flex items-center justify-center text-forest">
            <CreditCard size={20} />
          </span>
        </div>

        {/* Search */}
        <div className="md:col-span-8 relative w-full h-full flex items-center bg-sand/20 p-4 rounded-2xl border border-mist/30">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ledger by client, invoice number, or UPI Ref / UTR..."
              className="w-full pl-10 pr-4 py-3 bg-warm-white/60 rounded-lg border border-mist/40 font-dmsans text-xs text-charcoal focus:outline-none focus:border-forest"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card rounded-2xl border border-mist/30 overflow-hidden shadow-warm-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-mist/10 font-dmsans text-[10px] uppercase tracking-wider text-sage border-b border-mist/20">
                <th className="p-4 pl-6">Invoice Number</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Paid For</th>
                <th className="p-4">UPI Ref / UTR</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6">Transaction Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist/10 font-dmsans text-xs text-charcoal">
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
                    <tr key={p.id} className="hover:bg-warm-white/40 transition-colors">
                      <td className="p-4 pl-6 font-mono font-semibold text-charcoal">
                        {p.invoiceNumber || `REC-${p.bookingId.slice(0, 6).toUpperCase()}`}
                      </td>
                      <td className="p-4 font-semibold text-charcoal">
                        {p.booking.client.name}
                      </td>
                      <td className="p-4 text-charcoal">
                        <div className="font-semibold">{p.booking.service.name}</div>
                        <div className="text-[11px] text-sage">with {p.booking.therapist.name}</div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-sage">
                        {p.razorpayPaymentId || <span className="italic text-sage/40">post_session_upi</span>}
                      </td>
                      <td className="p-4 font-bold text-charcoal">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          p.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                            : p.status === "REFUNDED"
                            ? "bg-mist/20 text-sage"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-sage font-semibold">
                        {pDate} <span className="text-[10px] font-normal font-mono">at {pTime}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sage italic">
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
