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

  // Reception desk: sub-admin scope (appointments, confirmations, payment
  // visibility, client records). There is no /reception/login page — a
  // receptionist signs in at /admin/login, the single shared portal that
  // dispatches to /admin or /reception by the account's actual role. ADMIN
  // is allowed through here too, since it already outranks every capability
  // the desk exposes; THERAPIST is not.
  if (pathname.startsWith("/reception")) {
    return guard(request, {
      prefix: "/reception",
      loginPath: "/admin/login",
      allowedRoles: ["RECEPTIONIST", "ADMIN"],
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
  matcher: ["/admin/:path*", "/reception/:path*", "/therapist/:path*"],
};
