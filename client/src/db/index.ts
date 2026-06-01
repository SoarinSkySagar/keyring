import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon HTTP driver — sends queries over HTTPS (port 443) instead of TCP
// PostgreSQL protocol (port 5432). Works in Docker, serverless, and any
// environment where port 5432 may be blocked.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
