import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // Protect Admin Dashboard Routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      // Edge-safe token payload decode
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      
      if (isExpired || payload.role !== "ADMIN") {
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

  // Protect Therapist Dashboard Routes
  if (pathname.startsWith("/therapist") && !pathname.startsWith("/therapist/login")) {
    if (!token) {
      return NextResponse.redirect(new URL("/therapist/login", request.url));
    }

    try {
      // Edge-safe token payload decode
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired || payload.role !== "THERAPIST") {
        const response = NextResponse.redirect(new URL("/therapist/login", request.url));
        response.cookies.delete("auth_token");
        return response;
      }
    } catch (err) {
      const response = NextResponse.redirect(new URL("/therapist/login", request.url));
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
