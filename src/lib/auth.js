import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Resolve the JWT signing secret, failing CLOSED in production. If a live
// deployment forgets NEXTAUTH_SECRET, we must NOT fall back to a hardcoded
// value: that value ships in the source, so anyone could forge a valid
// admin session with it. Throwing here means verifyToken rejects every
// token (no forgery possible) and signToken refuses to mint one, rather
// than silently trusting a publicly-known key. The dev/test fallback is
// kept only for local convenience where NODE_ENV is not "production".
const DEV_FALLBACK_SECRET = "fallback-secret-key-for-local-development";

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Refusing to sign or verify tokens with the " +
        "built-in development secret in production.",
    );
  }
  return DEV_FALLBACK_SECRET;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  // HS256 is pinned implicitly by the string secret; verifyToken pins the
  // accepted algorithm explicitly to defeat "alg" confusion / "none" attacks.
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    // Pin the algorithm allow-list so a token with a forged header
    // (alg:"none", or an RS/HS confusion attempt) can never be accepted.
    return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

// Utility to parse cookies manually from raw headers or request object
export function getCookieValue(request, cookieName) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Helper to verify request and get user session details
export async function getSession(request) {
  const token = getCookieValue(request, "auth_token");
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
}
