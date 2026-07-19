import React from "react";
import Image from "next/image";

/**
 * The Brain Tea brand logo — the exact brand asset (public/tbt-logo.png),
 * presented as a circular badge. `className` controls the box size
 * (e.g. "w-14 h-14"). The image is zoomed slightly so the emblem fills
 * the circle instead of floating in the file's built-in padding.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-block overflow-hidden rounded-full ${className}`}
    >
      <Image
        src="/tbt-logo.png"
        alt="The Brain Tea"
        fill
        sizes="128px"
        className="object-cover scale-[1.42]"
        priority
      />
    </span>
  );
}
