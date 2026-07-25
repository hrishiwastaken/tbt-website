import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The wizard is a client component; stub the Next-only imports so it can be
// rendered in isolation. Effects never run under renderToStaticMarkup, so the
// step-1 markup here is exactly what the server sends on first paint.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("a", null, children),
}));

const { default: BookingWizard } = await import("../BookingWizard.js");

const service = {
  id: "svc-1",
  name: "Individual Therapy",
  slug: "individual-therapy",
  priceMinor: 150000,
  durationMinutes: 50,
  description: "A focused, one-on-one session.",
};

const render = (props: Record<string, unknown>) =>
  renderToStaticMarkup(React.createElement(BookingWizard, props));

// The Continue button carries a `disabled:opacity-50` class either way, so
// assert on the rendered attribute rather than the substring "disabled".
const continueIsDisabled = (html: string) =>
  /<button[^>]*\sdisabled=""[^>]*>Continue<\/button>/.test(html);

describe("BookingWizard step 1 — service selection", () => {
  it("lists the services and leaves Continue enabled when any are bookable", () => {
    const html = render({ services: [service] });
    expect(html).toContain("Individual Therapy");
    expect(html).not.toContain("No services are open for booking");
    expect(continueIsDisabled(html)).toBe(false);
  });

  it("explains the empty list and disables Continue when nothing is bookable", () => {
    const html = render({ services: [] });
    expect(html).toContain("No services are open for booking");
    expect(continueIsDisabled(html)).toBe(true);
  });

  it("says so when the preselected service is not bookable", () => {
    const html = render({ services: [service], initialService: "no-such-svc" });
    expect(html).toContain("isn&#x27;t open for booking right now");
    expect(html).toContain("Individual Therapy");
  });

  it("skips step 1 entirely when the preselected service is bookable", () => {
    const html = render({
      services: [service],
      initialService: "individual-therapy",
    });
    expect(html).toContain("Choose Your Consultant");
    expect(html).not.toContain("No services are open for booking");
  });
});
