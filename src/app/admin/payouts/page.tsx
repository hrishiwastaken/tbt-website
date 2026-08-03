"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR, formatDateTime } from "@/lib/format";
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
import {
  REFERENCE_PATTERN,
  REFERENCE_TITLE,
  sanitizeReference,
  TRANSFER_REF_MAX_LENGTH,
} from "@/lib/inputFormats";

interface Balance {
  therapistId: string;
  name: string;
  earnedMinor: number;
  paidMinor: number;
  reservedMinor: number;
  payableMinor: number;
}

interface PayoutRow {
  id: string;
  amountMinor: number;
  status: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
  therapist: { id: string; name: string };
}

export default function AdminPayoutsPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<Balance | null>(null);
  const [markingPaid, setMarkingPaid] = useState<PayoutRow | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts?page=${page}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load payouts");
      setPayouts(data.items);
      setBalances(data.balances);
      setPageCount(data.pageCount);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const run = async () => {
      await fetchAll();
    };
    run();
  }, [fetchAll]);

  const transition = async (
    payout: PayoutRow,
    toStatus: string,
    reference?: string,
  ) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/payouts/${payout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payout update failed");
      setMarkingPaid(null);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">
          Consultant Payouts
        </h1>
        <p className="font-dmsans text-sm text-ink-muted">
          Settle earned commission. Every settlement posts an immutable ledger
          entry.
        </p>
      </div>

      <ErrorNote message={error} />

      <Panel
        title="Payable Balances"
        subtitle="Earned commission net of reversals, minus settled and reserved payouts."
      >
        {loading && balances.length === 0 ? (
          <LoadingRow />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {balances.map((balance) => (
              <div
                key={balance.therapistId}
                className="surface-inset rounded-soft p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="font-dmsans text-sm font-semibold text-ocean-deep">
                    {balance.name}
                  </span>
                  <span className="font-dmsans text-xl font-bold tabular-nums text-ocean-deep">
                    {formatINR(balance.payableMinor)}
                  </span>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2 font-dmsans text-[11px] text-ink-muted">
                  <span>
                    Earned
                    <br />
                    <strong className="tabular-nums text-ink">
                      {formatINR(balance.earnedMinor)}
                    </strong>
                  </span>
                  <span>
                    Paid
                    <br />
                    <strong className="tabular-nums text-ink">
                      {formatINR(balance.paidMinor)}
                    </strong>
                  </span>
                  <span>
                    Reserved
                    <br />
                    <strong className="tabular-nums text-ink">
                      {formatINR(balance.reservedMinor)}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={balance.payableMinor <= 0}
                  onClick={() => setCreating(balance)}
                  className="w-full rounded-full bg-ocean px-4 py-2 font-dmsans text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create payout
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Payout Register" subtitle={`${total} payouts recorded.`}>
        {loading ? (
          <LoadingRow />
        ) : payouts.length === 0 ? (
          <LoadingRow label="No payouts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dmsans text-sm">
              <thead>
                <tr className="border-b border-ocean/10 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Consultant</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-ocean/5">
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {formatDateTime(payout.createdAt)}
                    </td>
                    <td className="px-3 py-3.5 font-medium text-ocean-deep">
                      {payout.therapist.name}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-ocean-deep">
                      {formatINR(payout.amountMinor)}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-ink-muted">
                      {payout.method || "—"}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-ink-muted">
                      {payout.reference || "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusPill status={payout.status} />
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {payout.status === "PENDING" && (
                          <>
                            <ActionButton
                              disabled={busy}
                              onClick={() => transition(payout, "PROCESSING")}
                            >
                              Process
                            </ActionButton>
                            <ActionButton
                              disabled={busy}
                              onClick={() => setMarkingPaid(payout)}
                              primary
                            >
                              Mark paid
                            </ActionButton>
                            <ActionButton
                              disabled={busy}
                              onClick={() => transition(payout, "CANCELLED")}
                            >
                              Cancel
                            </ActionButton>
                          </>
                        )}
                        {payout.status === "PROCESSING" && (
                          <>
                            <ActionButton
                              disabled={busy}
                              onClick={() => setMarkingPaid(payout)}
                              primary
                            >
                              Mark paid
                            </ActionButton>
                            <ActionButton
                              disabled={busy}
                              onClick={() => transition(payout, "FAILED")}
                            >
                              Failed
                            </ActionButton>
                          </>
                        )}
                        {payout.status === "FAILED" && (
                          <ActionButton
                            disabled={busy}
                            onClick={() => transition(payout, "PROCESSING")}
                          >
                            Retry
                          </ActionButton>
                        )}
                      </div>
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

      {creating && (
        <CreatePayoutModal
          balance={creating}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null);
            fetchAll();
          }}
        />
      )}

      {markingPaid && (
        <MarkPaidModal
          payout={markingPaid}
          busy={busy}
          onClose={() => setMarkingPaid(null)}
          onConfirm={(reference) => transition(markingPaid, "PAID", reference)}
        />
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 font-dmsans text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-40 ${
        primary
          ? "bg-ocean text-white shadow-surface-raised-sm hover:-translate-y-0.5"
          : "border border-ocean/25 text-ocean-deep hover:bg-surface-sunken"
      }`}
    >
      {children}
    </button>
  );
}

function CreatePayoutModal({
  balance,
  onClose,
  onCreated,
}: {
  balance: Balance;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [amountRupees, setAmountRupees] = useState(
    String(balance.payableMinor / 100),
  );
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const amountMinor = Math.round(Number(amountRupees) * 100);
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: balance.therapistId,
          amountMinor,
          method,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payout");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Payout — ${balance.name}`} onClose={onClose}>
      <div className="space-y-4 font-dmsans">
        <ErrorNote message={error} />
        <p className="text-sm text-ink-muted">
          Payable balance:{" "}
          <strong className="text-ocean-deep">
            {formatINR(balance.payableMinor)}
          </strong>
          . The amount is reserved immediately and hits the ledger when marked
          paid.
        </p>
        <Field label="Amount (₹)">
          <input
            type="number"
            min={1}
            max={balance.payableMinor / 100}
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClass}
          >
            <option value="BANK_TRANSFER">Bank transfer (NEFT/IMPS)</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </Field>
        <Field label="Note (optional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            placeholder="e.g. Fortnightly settlement"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ocean/25 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ocean-deep hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !amountRupees || Number(amountRupees) <= 0}
            onClick={submit}
            className="rounded-full bg-ocean px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm disabled:opacity-40"
          >
            {busy ? "Creating..." : "Create payout"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MarkPaidModal({
  payout,
  busy,
  onClose,
  onConfirm,
}: {
  payout: PayoutRow;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reference: string) => void;
}) {
  const [reference, setReference] = useState(payout.reference || "");
  return (
    <Modal title="Confirm Settlement" onClose={onClose}>
      <div className="space-y-4 font-dmsans">
        <p className="text-sm text-ink-muted">
          Mark{" "}
          <strong className="text-ocean-deep">
            {formatINR(payout.amountMinor)}
          </strong>{" "}
          to{" "}
          <strong className="text-ocean-deep">{payout.therapist.name}</strong>{" "}
          as settled. This posts a permanent ledger entry and cannot be undone.
        </p>
        <Field label="Transfer reference">
          <input
            inputMode="text"
            maxLength={TRANSFER_REF_MAX_LENGTH}
            pattern={REFERENCE_PATTERN}
            title={REFERENCE_TITLE}
            value={reference}
            onChange={(e) =>
              setReference(sanitizeReference(e.target.value, TRANSFER_REF_MAX_LENGTH))
            }
            className={inputClass}
            placeholder="e.g. NEFT123456"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ocean/25 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-ocean-deep hover:bg-surface-sunken"
          >
            Back
          </button>
          <button
            type="button"
            disabled={busy || !reference.trim()}
            onClick={() => onConfirm(reference.trim())}
            className="rounded-full bg-ocean-deep px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm disabled:opacity-40"
          >
            {busy ? "Settling..." : "Confirm paid"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
