import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET =
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-for-local-development";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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
