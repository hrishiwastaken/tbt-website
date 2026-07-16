"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { forwardRef } from "react";

type NavLinkProps = React.ComponentProps<typeof Link>;

/**
 * Drop-in replacement for next/link's <Link> for primary navigation tabs.
 *
 * Clicking a link that points at the route you're already on is a no-op in
 * Next.js — no navigation and no scroll. Users expect tapping the active tab to
 * jump back to the top of the page (native app tab-bar behaviour), so when the
 * href matches the current path we cancel the navigation and smooth-scroll to
 * the top instead. Dashboard shells scroll inside their <main> rather than the
 * window, so we nudge both.
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function NavLink({ href, onClick, ...props }, ref) {
    const pathname = usePathname();

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      // Only intercept plain left-clicks that would otherwise be a same-route no-op.
      const isModified =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (typeof href === "string" && href === pathname && !isModified) {
        event.preventDefault();
        const behavior: ScrollBehavior = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
          ? "auto"
          : "smooth";
        window.scrollTo({ top: 0, behavior });
        document.querySelector("main")?.scrollTo({ top: 0, behavior });
      }
    };

    return <Link ref={ref} href={href} onClick={handleClick} {...props} />;
  },
);
