import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is enforced client-side (AuthGuard) and server-side (getCurrentUser).
// Middleware only handles the NEXT_PUBLIC_APP_URL rewrite if needed.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
