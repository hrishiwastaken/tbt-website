import React from "react";
import Image from "next/image";

/**
 * The Brain Tea brand logo — a transparent-background mark, trimmed to its
 * own artwork (no badge, no circular frame or fill around it), presented at
 * the size `className` specifies (e.g. "w-14 h-14").
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
    <span className={`relative inline-block ${className}`}>
      <Image
        src={src}
        alt="The Brain Tea"
        fill
        sizes="128px"
        className="object-contain"
        priority
        unoptimized
      />
    </span>
  );
}
