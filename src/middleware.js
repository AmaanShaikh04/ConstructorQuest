import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";

// Page-level gate. The API routes check the session again for themselves —
// middleware is the polite redirect, not the security boundary.

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/team") && session?.role !== "team") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Already signed in? Skip the login screen.
  if (pathname === "/" && session) {
    return NextResponse.redirect(new URL(session.role === "admin" ? "/admin" : "/team", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/team/:path*", "/admin/:path*"],
};
