"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Smartphone, X, RotateCw } from "lucide-react";

/**
 * Desktop-only helper: opens the current page inside a phone-sized
 * frame so mobile layout can be checked without leaving the PC.
 * Renders nothing on touch devices or when already inside the preview iframe.
 *
 * Presets mirror modern phone panels (physical px @ device pixel ratio
 * → CSS viewport px, which is what media queries actually see).
 */
const PRESETS = [
  { label: "HD+", note: "720 × 1600", w: 360, h: 800 }, // @2x DPR
  { label: "Full HD+", note: "1080 × 2400", w: 412, h: 915 }, // @~2.6x DPR
];

export default function PhonePreview() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isFramed, setIsFramed] = useState(true); // assume framed until proven top-level
  const [reloadKey, setReloadKey] = useState(0);
  const [presetIdx, setPresetIdx] = useState(1); // Full HD+ default
  const [scale, setScale] = useState(1);

  const preset = PRESETS[presetIdx];
  const bezel = 12; // bezel padding around the screen (px, pre-scale)
  const frameW = preset.w + bezel * 2;
  const frameH = preset.h + bezel * 2;

  useEffect(() => {
    // Never show the toggle inside its own iframe (would recurse)
    setIsFramed(window.self !== window.top);
  }, []);

  // Fit the phone to the available window height (leave room for controls)
  useEffect(() => {
    if (!isOpen) return;
    const fit = () =>
      setScale(Math.min(1, (window.innerHeight - 90) / frameH, (window.innerWidth - 48) / frameW));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [isOpen, frameH, frameW]);

  // Close with Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Public-site helper only: keep the admin/therapist/portal dashboards untouched
  const isDashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/therapist") ||
    pathname.startsWith("/portal");

  if (isFramed || isDashboard) return null;

  return (
    <>
      {/* Floating toggle — bottom-left so it doesn't clash with WhatsApp */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden lg:flex fixed bottom-6 left-6 z-50 items-center gap-2 bg-forest-slate hover:bg-teal-sage text-warm-sand px-4 py-3 rounded-full shadow-lg transition-colors font-dmsans text-xs font-bold tracking-wider uppercase"
        aria-label="Preview on phone"
        title="Preview this page on a phone screen"
      >
        <Smartphone size={16} />
        Phone View
      </button>

      {/* Overlay with phone frame */}
      {isOpen && (
        <div className="hidden lg:flex fixed inset-0 z-[100] bg-near-black/75 backdrop-blur-sm flex-col items-center justify-start pt-4 overflow-hidden">
          {/* Controls */}
          <div className="flex items-center gap-3 mb-3 shrink-0">
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPresetIdx(i)}
                className={`px-4 py-1.5 rounded-full font-dmsans text-[11px] font-bold tracking-wider uppercase transition-colors border ${
                  i === presetIdx
                    ? "bg-warm-sand text-forest-slate border-warm-sand"
                    : "bg-transparent text-warm-sand/70 border-warm-sand/30 hover:text-warm-sand hover:border-warm-sand/60"
                }`}
                title={`${p.note} panel · ${p.w} × ${p.h} viewport`}
              >
                {p.label} · {p.note}
              </button>
            ))}
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="p-2 rounded-full bg-warm-sand/15 hover:bg-warm-sand/30 text-warm-sand transition-colors"
              aria-label="Reload preview"
              title="Reload"
            >
              <RotateCw size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full bg-warm-sand/15 hover:bg-warm-sand/30 text-warm-sand transition-colors"
              aria-label="Close preview"
              title="Close (Esc)"
            >
              <X size={14} />
            </button>
          </div>

          {/* Scaled wrapper keeps layout size while the phone renders at true viewport px */}
          <div style={{ width: frameW * scale, height: frameH * scale }} className="shrink-0">
            <div
              className="relative bg-near-black rounded-[52px] shadow-2xl border border-warm-sand/20"
              style={{
                width: frameW,
                height: frameH,
                padding: bezel,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {/* Punch-hole camera */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-near-black rounded-full z-10 pointer-events-none border border-warm-sand/10" />
              <iframe
                key={`${reloadKey}-${presetIdx}`}
                src={pathname}
                title="Mobile preview"
                style={{ width: preset.w, height: preset.h }}
                className="rounded-[40px] bg-warm-white border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
