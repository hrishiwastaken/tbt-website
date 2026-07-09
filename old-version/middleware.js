import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Redirection for Therapist Portal Paths to Admin Panel
  if (pathname.startsWith("/therapist")) {
    if (pathname.startsWith("/therapist/login")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.redirect(new URL("/admin/bookings", request.url));
  }

  // 2. Protect Admin Dashboard Routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      // Edge-safe token payload decode
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      
      // Allow both ADMIN and THERAPIST roles
      if (isExpired || (payload.role !== "ADMIN" && payload.role !== "THERAPIST")) {
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.delete("auth_token");
        return response;
      }
    } catch (err) {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("auth_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/therapist/:path*"
  ],
};
