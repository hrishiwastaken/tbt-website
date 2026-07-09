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
      {/* Open circle: from just left of top, counter-clockwise around
          to the upper right where it terminates */}
      <path
        d="M 111.3 20.4 A 100 100 0 1 0 206.6 70"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Terminal dot in the opening */}
      <circle cx="197" cy="56" r="8" fill="currentColor" />

      {/* Stacked wordmark */}
      <g fill="currentColor" fontFamily="var(--font-dm-sans), sans-serif" fontWeight="400">
        <text x="72" y="80" fontSize="27" letterSpacing="0.5">
          The
        </text>
        <text x="48" y="140" fontSize="54" letterSpacing="0.5">
          Brain
        </text>
        <text x="96" y="196" fontSize="54" letterSpacing="0.5">
          Tea
        </text>
      </g>
    </svg>
  );
}
