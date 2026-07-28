import React from "react";
import Image from "next/image";

/**
 * The Brain Tea brand logo — a transparent-background mark (no baked-in
 * white disc), presented at the size `className` specifies (e.g. "w-14
 * h-14"). The image is zoomed slightly so the emblem fills its box instead
 * of floating in the file's built-in padding.
 *
 * `variant="dark"` (default) is the forest-green mark for light surfaces
 * (header, admin/therapist chrome). `variant="light"` swaps in the
 * warm-white recolor for dark surfaces (e.g. the footer), since the dark
 * ink would otherwise wash out against a dark background.
 */
export default function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const src = variant === "light" ? "/tbt-logo-light.png" : "/tbt-logo.png";
  return (
    <span
      className={`relative inline-block overflow-hidden rounded-full ${className}`}
    >
      <Image
        src={src}
        alt="The Brain Tea"
        fill
        sizes="128px"
        className="object-cover scale-[1.42]"
        priority
      />
    </span>
  );
}
