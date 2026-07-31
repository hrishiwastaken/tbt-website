"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Search, UserPlus } from "lucide-react";
import { formatINR, formatDate, formatTime } from "@/lib/format";
import {
  ErrorNote,
  Field,
  inputClass,
  LoadingRow,
  Modal,
  Pager,
  Panel,
  StatusPill,
} from "@/components/admin/ui";
import { BookingDetailModal } from "@/components/reception/bookings";

interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  emergencyContact: string;
  gdprConsent: boolean;
  createdAt: string;
  _count: { bookings: number };
}

interface ClientDetail extends Omit<ClientRow, "_count"> {
  updatedAt: string;
  bookings: {
    id: string;
    dateTime: string;
    durationMinutes: number;
    amountMinor: number;
    status: string;
    paymentStatus: string;
    invoiceNumber: string | null;
    therapist: { id: string; name: string };
    service: { id: string; name: string };
  }[];
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  dob: "",
  emergencyContact: "",
};

type ClientForm = typeof EMPTY_FORM;

export default function ReceptionClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [refreshKey, setRefreshKey] = useState(0);

  const [registering, setRegistering] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [openClientId, setOpenClientId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), sort });
        if (search) params.set("q", search);
        const res = await fetch(`/api/reception/clients?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load clients");
        if (cancelled) return;
        setRows(data.items);
        setPageCount(data.pageCount);
        setTotal(data.total);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load clients",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [page, search, sort, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
            Clients
          </h1>
          <p className="font-dmsans text-sm text-ink-muted">
            Register new clients and keep contact details current.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRegistering(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ocean px-5 py-2.5 font-dmsans text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5"
        >
          <UserPlus size={13} /> Register client
        </button>
      </div>

      <ErrorNote message={error} />

      <Panel title="Client Registry" subtitle={`${total} registered clients.`}>
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={13}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, phone..."
              className={`${inputClass} !py-2 !pl-9 !text-xs`}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} !py-2 !text-xs w-44`}
          >
            <option value="name">Sort: name</option>
            <option value="recent">Sort: recently added</option>
          </select>
        </div>

        {loading ? (
          <LoadingRow label="Loading clients..." />
        ) : rows.length === 0 ? (
          <LoadingRow label="No clients match." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3">Emergency contact</th>
                  <th className="px-3 py-3 text-right">Sessions</th>
                  <th className="px-3 py-3">Registered</th>
                  <th className="px-3 py-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-ocean/5 transition-colors hover:bg-surface-sunken/60"
                  >
                    <td
                      className="cursor-pointer px-3 py-3.5"
                      onClick={() => setOpenClientId(row.id)}
                    >
                      <div className="font-semibold text-ocean-deep">
                        {row.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        DOB {row.dob}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.email}
                      <br />
                      {row.phone}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {row.emergencyContact}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-ink">
                      {row._count.bookings}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(row)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ocean/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager
          page={page}
          pageCount={pageCount}
          total={total}
          onPage={setPage}
        />
      </Panel>

      {registering && (
        <ClientFormModal
          title="Register Client"
          submitLabel="Register client"
          initial={EMPTY_FORM}
          onClose={() => setRegistering(false)}
          onSubmit={async (form) => {
            const res = await fetch("/api/reception/clients", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");
            setRegistering(false);
            refresh();
          }}
        />
      )}

      {editing && (
        <ClientFormModal
          title={`Edit ${editing.name}`}
          submitLabel="Save changes"
          initial={{
            name: editing.name,
            email: editing.email,
            phone: editing.phone,
            dob: editing.dob,
            emergencyContact: editing.emergencyContact,
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (form) => {
            const res = await fetch(`/api/reception/clients/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed");
            setEditing(null);
            refresh();
          }}
        />
      )}

      {openClientId && (
        <ClientDetailModal
          clientId={openClientId}
          onClose={() => setOpenClientId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function ClientFormModal({
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial: ClientForm;
  onClose: () => void;
  onSubmit: (form: ClientForm) => Promise<void>;
}) {
  const [form, setForm] = useState<ClientForm>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof ClientForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setError("");
    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.dob ||
      !form.emergencyContact
    ) {
      setError("All fields are required");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4 font-dmsans">
        <ErrorNote message={error} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Full name">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              max={today}
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Emergency contact">
              <input
                value={form.emergencyContact}
                onChange={(e) => set("emergencyContact", e.target.value)}
                className={inputClass}
                placeholder="Name & phone of an emergency contact"
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-ocean/25 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ocean-deep transition-colors hover:bg-surface-sunken disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-full bg-ocean px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
          >
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ClientDetailModal({
  clientId,
  onClose,
  onChanged,
}: {
  clientId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [totals, setTotals] = useState<{
    paidMinor: number;
    outstandingMinor: number;
    outstandingCount: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/reception/clients/${clientId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load client");
      return;
    }
    setClient(data.client);
    setTotals(data.totals);
  }, [clientId]);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    run();
  }, [load]);

  return (
    <>
      <Modal title="Client Record" onClose={onClose} wide>
        {!client ? (
          <LoadingRow />
        ) : (
          <div className="space-y-6 font-dmsans">
            <ErrorNote message={error} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="surface-inset rounded-soft p-4 text-sm md:col-span-2">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Contact
                </div>
                <div className="font-cormorant text-xl font-semibold text-ocean-deep">
                  {client.name}
                </div>
                <div className="text-xs text-ink-muted">{client.email}</div>
                <div className="text-xs text-ink-muted">{client.phone}</div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="font-semibold">Date of birth</span>
                  <span>{client.dob}</span>
                  <span className="font-semibold">Emergency</span>
                  <span>{client.emergencyContact}</span>
                  <span className="font-semibold">Registered</span>
                  <span>{formatDate(client.createdAt)}</span>
                </div>
              </div>
              <div className="surface-inset rounded-soft p-4 text-sm">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Account
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-ink-muted">Paid</span>
                  <span className="text-right font-semibold tabular-nums text-ink">
                    {formatINR(totals?.paidMinor ?? 0)}
                  </span>
                  <span className="text-ink-muted">Outstanding</span>
                  <span className="text-right font-semibold tabular-nums text-ocean-deep">
                    {formatINR(totals?.outstandingMinor ?? 0)}
                  </span>
                  <span className="text-ink-muted">Unpaid sessions</span>
                  <span className="text-right tabular-nums text-ink">
                    {totals?.outstandingCount ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Appointment history
              </h4>
              {client.bookings.length === 0 ? (
                <LoadingRow label="No appointments yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {client.bookings.map((b) => (
                        <tr
                          key={b.id}
                          onClick={() => setBookingId(b.id)}
                          className="cursor-pointer border-b border-ocean/5 transition-colors hover:bg-surface-sunken/60"
                        >
                          <td className="py-2.5 pr-3">
                            <div className="font-semibold text-ocean-deep">
                              {b.service.name}
                            </div>
                            <div className="text-xs text-ink-muted">
                              {formatDate(b.dateTime)} ·{" "}
                              {formatTime(b.dateTime)} · {b.therapist.name}
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-ink">
                            {formatINR(b.amountMinor)}
                          </td>
                          <td className="py-2.5 pr-3">
                            <StatusPill status={b.status} />
                          </td>
                          <td className="py-2.5">
                            <StatusPill status={b.paymentStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {bookingId && (
        <BookingDetailModal
          bookingId={bookingId}
          onClose={() => setBookingId(null)}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
      )}
    </>
  );
}
