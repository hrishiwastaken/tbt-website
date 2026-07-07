import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePasswords, signToken } from "@/lib/auth";

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
      return NextResponse.json({ error: NETLIFY_CONFIG_MESSAGE }, { status: 500 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter your email and password" },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePasswords(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate session JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Determine redirect path (both roles redirect to unified admin panel)
    const redirectUrl = "/admin/bookings";

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
      } SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: authConfigError(error) }, { status: 500 });
  }
}
