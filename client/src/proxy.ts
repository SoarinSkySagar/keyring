import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight middleware — checks for the Privy identity-token cookie.
 * Full token verification happens in each server action/component via
 * getCurrentUser() (Node.js runtime, not edge).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has("privy-id-token");

  const onDashboard = pathname.startsWith("/dashboard");
  const onAuthPage = pathname === "/login" || pathname === "/signup";

  if (onDashboard && !hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasToken && onAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
