"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";

// Full-screen brand intro that plays once per browser session, then wipes away.
//
// Two rendering paths, chosen by engine:
//
//   "video" — Chromium/Firefox play public/intro/tbt-animation.webm, a VP9
//     clip with a real alpha channel, over the solid brand backdrop.
//
//   "css"   — WebKit (Safari, and every browser on iOS, which is WebKit
//     underneath) renders an equivalent animation built from the brand logo
//     plus SVG/CSS instead. WebKit cannot be trusted with either of the video
//     assets here:
//       * It decodes VP9 WebM but ignores the alpha channel, so the ~97% of
//         each frame that should be transparent paints opaque black — a black
//         square around the logo.
//       * The tbt-intro.mp4 fallback is H.264 (avc1, depth 24, no alpha) with
//         a light-grey background baked in, which neither matches the white
//         backdrop nor avoids Safari painting <video> letterbox bars black.
//     Both routes produced the black-square artifact reported on iPhone, so
//     WebKit skips video entirely rather than picking the lesser artifact.
//     Proper transparent video on Safari needs HEVC-with-alpha (hvc1), which
//     these source assets don't provide.
//
// Falls back safely everywhere: if the video errors, is blocked, or stalls, a
// timeout dismisses the overlay so the site is never blocked.

const SESSION_KEY = "tbt-intro-seen";
const SAFETY_TIMEOUT_MS = 3500; // hard cap — never let the overlay hang the page
const CSS_INTRO_MS = 2100; // ~matches the 2.13s video so both paths feel alike
const EXIT_MS = 700; // must match the CSS transition duration below
const BACKDROP = "#ffffff";

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

// True for Safari and for every browser on iOS/iPadOS (all WebKit, all subject
// to the alpha-channel limitation above). Deliberately a UA/engine check: there
// is no feature test for "renders WebM alpha correctly" — canPlayType reports
// "probably" for VP9 on modern Safari even though the alpha is dropped.
function isWebKitEngine() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a desktop Mac; touch points disambiguate.
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const desktopSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua);
  return iOS || desktopSafari;
}

export default function IntroOverlay() {
  const hydrated = useHydrated();
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);
  const videoRef = useRef(null);
  const dismissedRef = useRef(false);

  // Decide exactly once (lazy initializer, never updated) whether this visit
  // should see the intro, and how to render it. Frozen so that writing
  // SESSION_KEY on dismiss doesn't retroactively flip it to false and cut the
  // exit animation short. Safe on the server (returns false) and gated behind
  // `hydrated`, so the first client render matches the server markup.
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
  const [useCss] = useState(() =>
    typeof window === "undefined" ? false : isWebKitEngine(),
  );

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

  // Start playback (or the CSS timer) and arm the safety timeout once shown.
  useEffect(() => {
    if (!show) return;

    const safety = window.setTimeout(dismiss, SAFETY_TIMEOUT_MS);

    // CSS path has no media events to wait on — dismiss when it has run.
    if (useCss) {
      const t = window.setTimeout(dismiss, CSS_INTRO_MS);
      return () => {
        window.clearTimeout(safety);
        window.clearTimeout(t);
      };
    }

    const v = videoRef.current;
    if (v) {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        // Autoplay blocked or decode failed — skip straight to the site.
        p.catch(() => dismiss());
      }
    }

    return () => window.clearTimeout(safety);
  }, [show, useCss]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        // Solid brand backdrop behind the animation — brighter than the site's
        // own warm-ivory surface (#fffcf8).
        backgroundColor: BACKDROP,
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
      {useCss ? (
        <CssIntro />
      ) : (
        <VideoIntro videoRef={videoRef} onDone={dismiss} />
      )}

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

// Transparent-WebM path (Chromium / Firefox).
// The element is sized to the clip's own 1:1 ratio rather than stretched to the
// viewport with object-fit: contain. That leaves no letterbox region inside the
// <video> at all, so no engine gets the chance to paint those bars black.
function VideoIntro({ videoRef, onDone }) {
  return (
    <video
      ref={videoRef}
      muted
      autoPlay
      playsInline
      preload="auto"
      onEnded={onDone}
      onError={onDone}
      style={{
        width: "min(100vw, 100vh)",
        height: "min(100vw, 100vh)",
        aspectRatio: "1 / 1",
        objectFit: "contain",
        backgroundColor: "transparent",
      }}
    >
      <source src="/intro/tbt-animation.webm" type="video/webm" />
    </video>
  );
}

// WebKit path: the same beat — mark settles in while a ring draws around it —
// built from the transparent logo PNG and an SVG stroke, so nothing can render
// an opaque black frame.
function CssIntro() {
  const RING = 2 * Math.PI * 78; // circumference of the r=78 circle below

  return (
    <div
      style={{
        position: "relative",
        width: "min(62vw, 62vh, 340px)",
        height: "min(62vw, 62vh, 340px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes tbtIntroRing {
          from { stroke-dashoffset: ${RING}; opacity: 0; }
          25%  { opacity: 1; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes tbtIntroMark {
          0%   { opacity: 0; transform: scale(0.86); }
          60%  { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes tbtIntroHalo {
          0%   { opacity: 0; transform: scale(0.9); }
          55%  { opacity: 0.55; }
          100% { opacity: 0; transform: scale(1.18); }
        }
      `}</style>

      {/* Soft halo breathing outward behind the mark */}
      <div
        style={{
          position: "absolute",
          inset: "6%",
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, rgba(105,142,139,0.20) 0%, rgba(105,142,139,0) 70%)",
          animation: `tbtIntroHalo ${CSS_INTRO_MS}ms ease-out forwards`,
        }}
      />

      {/* Ring drawing itself around the mark */}
      <svg
        viewBox="0 0 180 180"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <circle
          cx="90"
          cy="90"
          r="78"
          fill="none"
          stroke="#698E8B"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING}
          transform="rotate(-90 90 90)"
          style={{
            animation: `tbtIntroRing ${Math.round(CSS_INTRO_MS * 0.8)}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
          }}
        />
      </svg>

      {/* The brand mark itself (transparent PNG, already cached by the header) */}
      <span
        style={{
          position: "relative",
          width: "56%",
          height: "56%",
          opacity: 0,
          animation: `tbtIntroMark ${Math.round(CSS_INTRO_MS * 0.62)}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
        }}
      >
        <Image
          src="/tbt-logo.png"
          alt=""
          fill
          sizes="340px"
          priority
          unoptimized
          style={{ objectFit: "contain" }}
        />
      </span>
    </div>
  );
}
