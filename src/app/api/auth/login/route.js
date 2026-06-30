import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePasswords, signToken } from "@/lib/auth";

export async function POST(request) {
  try {
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

    // Determine redirect path based on role
    const redirectUrl = user.role === "ADMIN" ? "/admin/bookings" : "/therapist/dashboard";

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
