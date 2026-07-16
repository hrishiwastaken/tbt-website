import React from "react";

/**
 * The Brain Tea logo — faithful SVG recreation of the brand file:
 * an open thin circle sweeping into a dot at the upper right, with
 * the stacked "The Brain Tea" wordmark inside. Inherits currentColor.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="The Brain Tea"
    >
      {/* Near-closed ring with a small gap at the top: sweeps counter-
          clockwise from just left of top, around the left and bottom, up
          the right side, terminating at the dot in the top-right. */}
      <path
        d="M 92 26 A 100 100 0 1 0 172 33"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Terminal dot at the top-right of the opening */}
      <circle cx="178" cy="28" r="8.5" fill="currentColor" />

      {/* Stacked wordmark */}
      <g
        fill="currentColor"
        fontFamily="var(--font-dm-sans), sans-serif"
        fontWeight="400"
      >
        <text x="74" y="84" fontSize="28" letterSpacing="0.5">
          The
        </text>
        <text x="46" y="144" fontSize="56" letterSpacing="0.5">
          Brain
        </text>
        <text x="96" y="200" fontSize="56" letterSpacing="0.5">
          Tea
        </text>
      </g>
    </svg>
  );
}
