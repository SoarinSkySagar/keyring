// Edge-compatible config — no DB imports, used by middleware
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [], // Providers requiring DB are added in auth.ts only
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isAuthPage =
        nextUrl.pathname === "/login" || nextUrl.pathname === "/signup";

      if (isOnDashboard && !isLoggedIn) return false; // Redirect to /login
      if (isLoggedIn && isAuthPage)
        return Response.redirect(new URL("/dashboard", nextUrl)); // Already logged in
      return true;
    },
  },
} satisfies NextAuthConfig;
