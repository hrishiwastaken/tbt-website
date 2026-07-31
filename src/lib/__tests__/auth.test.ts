import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../auth";

// Token-forgery resistance. verifyToken must accept ONLY tokens signed with
// the configured secret using the pinned algorithm — never a token signed
// with the source's dev fallback, never an unsigned "alg:none" token.

const REAL_SECRET = "unit-test-secret-A";
const DEV_FALLBACK = "fallback-secret-key-for-local-development";

describe("JWT verification hardening", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", REAL_SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a token it signed itself", () => {
    const token = signToken({ userId: "u1", email: "a@b.c", role: "ADMIN" });
    const decoded = verifyToken(token) as { role?: string } | null;
    expect(decoded?.role).toBe("ADMIN");
  });

  it("rejects a token forged with the source's dev fallback secret", () => {
    const forged = jwt.sign(
      { userId: "x", email: "attacker@evil.com", role: "ADMIN" },
      DEV_FALLBACK,
      { expiresIn: "7d" },
    );
    expect(verifyToken(forged)).toBeNull();
  });

  it("rejects an unsigned alg:none token", () => {
    const header = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        userId: "x",
        email: "a@b.c",
        role: "ADMIN",
        exp: Math.floor(Date.now() / 1000) + 9999,
      }),
    ).toString("base64url");
    expect(verifyToken(`${header}.${payload}.`)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const other = jwt.sign({ userId: "x", role: "ADMIN" }, "some-other-secret");
    expect(verifyToken(other)).toBeNull();
  });

  it("fails closed: refuses to sign with the dev fallback in production", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => signToken({ userId: "u", role: "ADMIN" })).toThrow(
      /NEXTAUTH_SECRET/,
    );
    // And a fallback-forged token is not accepted either (verify returns null
    // because resolving the secret throws internally).
    const forged = jwt.sign({ role: "ADMIN" }, DEV_FALLBACK);
    expect(verifyToken(forged)).toBeNull();
  });
});
