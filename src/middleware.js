import { NextResponse } from "next/server";

function guard(request, { prefix, loginPath, allowedRoles }) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  try {
    // Edge-safe token payload decode
    const payload = JSON.parse(atob(token.split(".")[1]));
    const isExpired = payload.exp * 1000 < Date.now();

    if (isExpired || !allowedRoles.includes(payload.role)) {
      const response = NextResponse.redirect(new URL(loginPath, request.url));
      response.cookies.delete("auth_token");
      return response;
    }
  } catch (err) {
    const response = NextResponse.redirect(new URL(loginPath, request.url));
    response.cookies.delete("auth_token");
    return response;
  }

  return NextResponse.next();
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Admin console: ADMIN only. A consultant session carries no admin access —
  // they belong in /therapist, which is scoped to their own data.
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    return guard(request, {
      prefix: "/admin",
      loginPath: "/admin/login",
      allowedRoles: ["ADMIN"],
    });
  }

  // Consultant portal: scoped to the therapist's own data, THERAPIST only
  if (
    pathname.startsWith("/therapist") &&
    !pathname.startsWith("/therapist/login")
  ) {
    return guard(request, {
      prefix: "/therapist",
      loginPath: "/therapist/login",
      allowedRoles: ["THERAPIST"],
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/therapist/:path*"],
};
