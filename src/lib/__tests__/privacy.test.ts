import { describe, expect, it } from "vitest";
import { maskEmail } from "../privacy";

// The booking confirmation page is reachable by booking UUID alone, with no
// client login behind it. maskEmail is what stops a leaked booking link from
// also handing over a transcribable contact address, so the invariant under
// test is simple: the local part must never survive in full.

describe("maskEmail", () => {
  it("keeps the domain and a short head, hides the rest", () => {
    expect(maskEmail("hrishi@gmail.com")).toBe("hr••••@gmail.com");
  });

  it("never emits the full local part", () => {
    const samples = [
      "a@b.co",
      "ab@b.co",
      "abc@b.co",
      "firstname.lastname@clinic.example.org",
    ];
    for (const email of samples) {
      const local = email.slice(0, email.lastIndexOf("@"));
      const masked = maskEmail(email);
      expect(masked).not.toContain(local);
      expect(masked).toContain("•");
    }
  });

  it("masks very short local parts whole", () => {
    // Keeping a head of a one- or two-character address would disclose all
    // or half of it, so these are masked entirely. Padding to a minimum of
    // three also stops the mask from disclosing the original length.
    expect(maskEmail("a@b.co")).toBe("•••@b.co");
    expect(maskEmail("ab@b.co")).toBe("•••@b.co");
  });

  it("preserves the domain so the client can still recognise the inbox", () => {
    expect(maskEmail("someone@thebraintea.com")).toContain("@thebraintea.com");
  });

  it("degrades safely on malformed input rather than echoing it", () => {
    expect(maskEmail("not-an-email")).toBe("•••");
    expect(maskEmail("@leading.com")).toBe("•••");
    expect(maskEmail("trailing@")).toBe("•••");
    expect(maskEmail("")).toBe("•••");
    // Guarding the runtime path, not the type path.
    expect(maskEmail(null as unknown as string)).toBe("•••");
  });
});
