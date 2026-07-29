"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Post-checkout landing page. The gateway redirects the payer back here; the
// redirect itself proves nothing, so this page polls the server, which
// answers from the DB (webhook already landed) or asks the gateway directly
// and records the authoritative result before responding.

const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 5000;
const POLL_SLOW_AFTER_MS = 30000;
const POLL_STOP_AFTER_MS = 180000;

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!expiresAt) return undefined;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(ms > 0 ? ms : 0);
    };
    const timer = setInterval(tick, 1000);
    // First paint shows within a second; no synchronous set in the effect body.
    const kickoff = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(kickoff);
    };
  }, [expiresAt]);
  if (!expiresAt || remaining == null) return null;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function PaymentStatusInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || searchParams.get("id");

  const [status, setStatus] = useState(null); // null = first check running
  const [error, setError] = useState("");
  const [pollingStopped, setPollingStopped] = useState(false);
  const [retrying, setRetrying] = useState(false);
  // Bumping the epoch restarts the polling loop (used by "check now").
  const [pollEpoch, setPollEpoch] = useState(0);
  const startedAtRef = useRef(null);
  const timerRef = useRef(null);

  const check = useCallback(async () => {
    if (!bookingId) return null;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment-status`, {
        cache: "no-store",
      });
      if (res.status === 429) return null; // rate-limited; next tick retries
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not check the payment status.");
        return null;
      }
      setError("");
      setStatus(data);
      return data;
    } catch {
      // transient network error — keep polling
      return null;
    }
  }, [bookingId]);

  // Poll until a terminal state or the stop deadline.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    startedAtRef.current = Date.now();

    const loop = async () => {
      if (cancelled) return;
      const data = await check();
      const state = data?.state;
      if (
        state &&
        ["PAID", "REFUND_PENDING", "REFUNDED", "NO_PAYMENT_REQUIRED"].includes(
          state,
        )
      ) {
        return; // terminal — the render below redirects/settles
      }
      if (state === "FAILED" || state === "EXPIRED") return;
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed > POLL_STOP_AFTER_MS) {
        setPollingStopped(true);
        return;
      }
      timerRef.current = setTimeout(
        loop,
        elapsed > POLL_SLOW_AFTER_MS ? POLL_SLOW_MS : POLL_FAST_MS,
      );
    };

    loop();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [bookingId, check, pollEpoch]);

  // Terminal navigations
  useEffect(() => {
    if (!status) return;
    if (status.state === "PAID" || status.state === "NO_PAYMENT_REQUIRED") {
      router.replace(`/booking-confirmed?id=${bookingId}`);
    }
  }, [status, router, bookingId]);

  const countdown = useCountdown(status?.expiresAt);

  const manualCheck = () => {
    setPollingStopped(false);
    setStatus(null);
    setPollEpoch((n) => n + 1); // restarts the polling loop from scratch
  };

  const retryPayment = async () => {
    if (retrying) return;
    setRetrying(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/retry-payment`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not restart the payment.");
        setRetrying(false);
        return;
      }
      if (data.state === "PAID") {
        router.replace(`/booking-confirmed?id=${bookingId}`);
        return;
      }
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setError("Could not restart the payment. Please try again.");
      setRetrying(false);
    } catch {
      setError("Network error while restarting the payment.");
      setRetrying(false);
    }
  };

  if (!bookingId) {
    return (
      <StatusShell
        title="Booking not found"
        tone="failed"
        body="This page needs a booking reference. Please start again from the booking page."
        action={
          <Link href="/book" className={buttonClass}>
            Book a Session
          </Link>
        }
      />
    );
  }

  const state = status?.state;

  if (state === "FAILED" || state === "EXPIRED") {
    const canRetry = state === "FAILED" && status?.canRetry;
    return (
      <StatusShell
        title={canRetry ? "Payment not completed" : "Payment window closed"}
        tone="failed"
        body={
          canRetry
            ? "Your payment didn't go through — nothing has been charged. Your slot is still reserved for a short while, so you can try again now."
            : "This payment didn't complete and the reservation has been released — nothing has been charged. If any amount was deducted by your bank, it is reversed automatically by your UPI provider. Please pick a slot again."
        }
        error={error}
        action={
          canRetry ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={retryPayment}
                disabled={retrying}
                className={buttonClass}
              >
                {retrying ? "Restarting payment..." : "Try Payment Again"}
              </button>
              {countdown && (
                <span className="text-xs text-sage">
                  Slot reserved for {countdown} more
                </span>
              )}
            </div>
          ) : (
            <Link href="/book" className={buttonClass}>
              Book Again
            </Link>
          )
        }
      />
    );
  }

  if (state === "REFUND_PENDING" || state === "REFUNDED") {
    return (
      <StatusShell
        title={state === "REFUNDED" ? "Payment refunded" : "Refund on its way"}
        tone="info"
        body={
          state === "REFUNDED"
            ? "This payment has been refunded in full to your original payment method."
            : "Your payment was received after the reservation window closed, so the session could not be confirmed. Our team will refund the full amount to your UPI account within a few working days."
        }
        action={
          <Link href="/contact" className={buttonClass}>
            Contact Us
          </Link>
        }
      />
    );
  }

  // Checking / pending
  return (
    <StatusShell
      title={status ? "Waiting for your payment" : "Checking payment status"}
      tone="pending"
      body={
        status
          ? "If you approved the payment in your UPI app, it will confirm here within a few seconds. If a collect request is waiting in your UPI app, approve it to complete the booking."
          : "One moment — confirming your payment with the gateway."
      }
      error={error}
      action={
        <div className="flex flex-col items-center gap-3">
          {countdown && (
            <span className="text-xs text-sage">
              Slot reserved for {countdown} more
            </span>
          )}
          {(pollingStopped || status) && (
            <button
              type="button"
              onClick={manualCheck}
              className="text-forest underline text-sm hover:text-terracotta transition-colors"
            >
              I&apos;ve paid — check now
            </button>
          )}
          {status?.checkoutUrl && (
            <a
              href={status.checkoutUrl}
              className="text-xs text-sage underline hover:text-forest"
            >
              Reopen the payment page
            </a>
          )}
        </div>
      }
      spinner
    />
  );
}

const buttonClass =
  "bg-forest hover:bg-terracotta text-warm-white font-medium px-8 py-3.5 rounded-full transition-colors disabled:opacity-50 inline-block text-sm";

function StatusShell({ title, body, tone, action, error, spinner = false }) {
  const toneStyles = {
    pending: "border-mist/40",
    failed: "border-terracotta/40",
    info: "border-forest/30",
  };
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-warm-white">
      <div
        className={`w-full max-w-lg rounded-2xl border ${toneStyles[tone]} bg-white/70 p-10 text-center shadow-sm`}
      >
        {spinner && (
          <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-mist border-t-forest" />
        )}
        <h1 className="font-cormorant text-3xl font-semibold text-charcoal mb-3">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-sage mb-8">{body}</p>
        {error && (
          <p className="mb-6 rounded-lg border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-xs text-terracotta">
            {error}
          </p>
        )}
        {action}
        <p className="mt-8 text-[11px] leading-relaxed text-sage/80">
          Payments are verified directly with the payment gateway. You are never
          charged for an unconfirmed session — failed or expired payments are
          reversed automatically by UPI.
        </p>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-sage text-sm">
          Loading...
        </div>
      }
    >
      <PaymentStatusInner />
    </Suspense>
  );
}
