import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";

// Page-level gate. The API routes check the session again for themselves —
// middleware is the polite redirect, not the security boundary.

const HOME_FOR = { admin: "/admin", team: "/team", guest: "/guest" };

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  for (const [role, path] of Object.entries(HOME_FOR)) {
    if (pathname.startsWith(path) && session?.role !== role) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Already signed in? Skip the login screen.
  if (pathname === "/" && session?.role) {
    const home = HOME_FOR[session.role];
    if (home) return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  // `/leaderboard` is deliberately absent: the guest hall of fame is public.
  matcher: ["/", "/team/:path*", "/admin/:path*", "/guest/:path*"],
};
