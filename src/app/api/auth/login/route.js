import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePasswords, signToken } from "@/lib/auth";
import { rateLimiter } from "@/lib/rateLimit";

// Per-IP throttle on credential submission. Combined with the uniform
// "Invalid email or password" response (which never reveals whether an
// email exists or which role it holds), this blunts online password
// brute-forcing. Note: the limiter is in-memory and per-instance — it stops
// single-source guessing but a distributed attacker rotating IPs needs an
// edge/WAF rate limit or account lockout, which is out of this layer's reach.
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

function requestIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

const NETLIFY_CONFIG_MESSAGE =
  "Database connection is not configured. Set DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, and ENCRYPTION_KEY in Netlify, then seed the database.";

function missingRuntimeConfig() {
  return ["DATABASE_URL", "NEXTAUTH_SECRET"].filter((key) => !process.env[key]);
}

function authConfigError(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Environment variable not found") ||
    message.includes("DATABASE_URL") ||
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection")
  ) {
    return NETLIFY_CONFIG_MESSAGE;
  }

  return "Internal server error";
}

export async function POST(request) {
  try {
    const missing = missingRuntimeConfig();

    if (missing.length > 0) {
      console.error(`Login API configuration missing: ${missing.join(", ")}`);
      return NextResponse.json(
        { error: NETLIFY_CONFIG_MESSAGE },
        { status: 500 },
      );
    }

    const { isBlocked } = rateLimiter(
      `login:${requestIp(request)}`,
      LOGIN_MAX_ATTEMPTS,
      LOGIN_WINDOW_MS,
    );
    if (isBlocked) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }

    const { email, password, portal } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter your email and password" },
        { status: 400 },
      );
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Verify password
    const isPasswordValid = await comparePasswords(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // The "admin" portal is a single shared sign-in for both ADMIN and
    // RECEPTIONIST accounts — entering receptionist credentials here is the
    // only way to reach the reception desk; there is no separate reception
    // login page. Which dashboard you land on is decided by the account's
    // actual role, not by anything the client claims. THERAPIST stays on its
    // own portal and is rejected outright here. Unknown/absent `portal`
    // falls back to "admin" so a malformed request can never widen access.
    // The response is identical to a wrong password (same message, same
    // 401) so a cross-portal attempt can't be used to confirm which role an
    // email belongs to.
    const PORTAL_ROLES = {
      admin: ["ADMIN", "RECEPTIONIST"],
      therapist: ["THERAPIST"],
    };
    const requestedPortal = Object.hasOwn(PORTAL_ROLES, portal ?? "")
      ? portal
      : "admin";
    const allowedRoles = PORTAL_ROLES[requestedPortal];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const REDIRECTS = {
      ADMIN: "/admin",
      RECEPTIONIST: "/reception",
      THERAPIST: "/therapist",
    };
    const redirectUrl = REDIRECTS[user.role];

    // Generate session JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      redirectUrl,
    });

    // Set cookie headers (HTTP-Only, Secure, SameSite)
    const isProd = process.env.NODE_ENV === "production";
    response.headers.set(
      "Set-Cookie",
      `auth_token=${token}; Path=/; HttpOnly; ${
        isProd ? "Secure;" : ""
      } SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
    );

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: authConfigError(error) },
      { status: 500 },
    );
  }
}
