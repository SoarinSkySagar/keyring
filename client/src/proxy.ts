import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Use edge-safe config (no DB) for middleware
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
  ],
};
