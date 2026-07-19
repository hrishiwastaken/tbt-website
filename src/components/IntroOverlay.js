"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Full-screen brand intro that plays once per browser session.
// Plays public/intro/tbt-intro.mp4 (~2.1s), then wipes away to reveal the site.
// Falls back safely: if the video errors, is blocked, or stalls, a timeout
// dismisses it so the site is never blocked.

const SESSION_KEY = "tbt-intro-seen";
const SAFETY_TIMEOUT_MS = 3500; // hard cap — never let the overlay hang the page
const EXIT_MS = 700; // must match the CSS transition duration below

// SSR-safe "are we on the client yet" flag. Server and first client render both
// return false (so markup matches and there's no hydration mismatch), then it
// flips to true after mount. Avoids setState-in-an-effect for the mount gate.
const emptySubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export default function IntroOverlay() {
  const hydrated = useHydrated();
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);
  const videoRef = useRef(null);
  const dismissedRef = useRef(false);

  // Decide exactly once (lazy initializer, never updated) whether this visit
  // should see the intro. Frozen so that writing SESSION_KEY on dismiss doesn't
  // retroactively flip it to false and cut the exit animation short. Safe on the
  // server (returns false) and gated behind `hydrated`, so the first client
  // render matches the server markup — no hydration mismatch.
  const [allowed] = useState(() => {
    if (typeof window === "undefined") return false;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      seen = false; // private mode / storage disabled — show it, self-limits per load
    }
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return !seen && !prefersReduced;
  });

  const show = hydrated && allowed && !gone;

  // Lock body scroll while the overlay is on screen; restore on exit.
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  // Begin the exit transition, then unmount after it finishes.
  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore storage failures — worst case the intro shows again next load
    }
    setExiting(true);
    window.setTimeout(() => setGone(true), EXIT_MS);
  };

  // Start playback and arm the safety timeout once shown.
  useEffect(() => {
    if (!show) return;

    const t = window.setTimeout(dismiss, SAFETY_TIMEOUT_MS);

    const v = videoRef.current;
    if (v) {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        // Autoplay blocked or decode failed — skip straight to the site.
        p.catch(() => dismiss());
      }
    }

    return () => window.clearTimeout(t);
  }, [show]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        // Matches the video's light-gray backdrop so there is no flash before
        // the first frame paints, and the `contain` letterbox bars are invisible.
        backgroundColor: "#cbcbcb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        // Exit: fade + gentle upward "curtain" wipe, like the reference reveal.
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(-3%)" : "translateY(0)",
        clipPath: exiting ? "inset(0 0 100% 0)" : "inset(0 0 0 0)",
        transition: `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease, clip-path ${EXIT_MS}ms ease`,
        willChange: "opacity, transform, clip-path",
      }}
    >
      <video
        ref={videoRef}
        src="/intro/tbt-intro.mp4"
        muted
        autoPlay
        playsInline
        preload="auto"
        onEnded={dismiss}
        onError={dismiss}
        style={{
          width: "100%",
          height: "100%",
          // `contain` keeps the full square logo visible on every aspect ratio;
          // the gray letterbox blends into the matching overlay background.
          objectFit: "contain",
        }}
      />

      <button
        type="button"
        onClick={dismiss}
        aria-label="Skip intro"
        style={{
          position: "absolute",
          bottom: "1.75rem",
          right: "1.75rem",
          padding: "0.5rem 1.1rem",
          fontSize: "0.72rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "#fdfbf7",
          background: "rgba(0,0,0,0.28)",
          border: "1px solid rgba(253,251,247,0.45)",
          borderRadius: "9999px",
          cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}
      >
        Skip
      </button>
    </div>
  );
}
