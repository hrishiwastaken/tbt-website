"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import { ErrorNote, Field, inputClass, LoadingRow, Panel } from "@/components/admin/ui";

interface Consultant {
  id: string;
  name: string;
  slug: string;
  photo: string | null;
  bio: string;
  feeMinor: number;
  status: string;
  effectiveCommissionBps: number;
}

export default function TherapistProfilePage() {
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/therapist/me");
    const data = await res.json();
    if (res.ok) {
      setConsultant(data.consultant);
      setBio(data.consultant.bio);
      setPhoto(data.consultant.photo || "");
    } else {
      setError(data.error || "Failed to load profile");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/therapist/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, photo: photo || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      setNotice("Profile updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setPasswordBusy(true);
    setPasswordError("");
    setPasswordNotice("");
    try {
      const res = await fetch("/api/therapist/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setPasswordNotice("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <div>
        <h1 className="mb-2 font-cormorant text-4xl font-semibold text-ocean-deep">Your Profile</h1>
        <p className="font-dmsans text-sm text-ink-muted">Public bio and photo shown on the practice website.</p>
      </div>

      <ErrorNote message={error} />

      {!consultant ? (
        <LoadingRow label="Loading profile..." />
      ) : (
        <>
          <Panel title="Public Profile">
            <div className="space-y-4 font-dmsans">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="surface-inset rounded-soft p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Session Fee</div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-ocean-deep">{formatINR(consultant.feeMinor)}</div>
                </div>
                <div className="surface-inset rounded-soft p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Commission</div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-ocean-deep">{consultant.effectiveCommissionBps / 100}%</div>
                </div>
                <div className="surface-inset rounded-soft p-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Status</div>
                  <div className="mt-1 text-lg font-bold text-ocean-deep">{consultant.status}</div>
                </div>
              </div>
              <p className="text-[11px] italic text-ink-muted">
                Fee and commission are set by the clinic administrator.
              </p>

              <Field label="Photo URL">
                <input value={photo} onChange={(e) => setPhoto(e.target.value)} className={inputClass} placeholder="https://..." />
              </Field>
              <Field label="Bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  className={`${inputClass} resize-none`}
                />
              </Field>
              {notice && <p className="text-xs font-medium text-emerald-700">{notice}</p>}
              <button
                type="button"
                disabled={busy}
                onClick={saveProfile}
                className="rounded-full bg-ocean px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
              >
                {busy ? "Saving..." : "Save profile"}
              </button>
            </div>
          </Panel>

          <Panel title="Change Password">
            <div className="max-w-sm space-y-4 font-dmsans">
              <ErrorNote message={passwordError} />
              {passwordNotice && <p className="text-xs font-medium text-emerald-700">{passwordNotice}</p>}
              <Field label="Current password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="New password (min 10 characters)">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                disabled={passwordBusy || !currentPassword || newPassword.length < 10}
                onClick={changePassword}
                className="rounded-full bg-ocean px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-surface-raised-sm transition-all hover:-translate-y-0.5 disabled:opacity-40"
              >
                {passwordBusy ? "Updating..." : "Change password"}
              </button>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
