import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({
      message: "Logged out successfully",
    });

    // Clear the auth_token cookie by setting max-age to 0 and date to past
    const isProd = process.env.NODE_ENV === "production";
    response.headers.set(
      "Set-Cookie",
      `auth_token=; Path=/; HttpOnly; ${
        isProd ? "Secure;" : ""
      } SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );

    return response;
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
