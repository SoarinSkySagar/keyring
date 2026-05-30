import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use postgres.js with the pooler URL (PgBouncer).
// max:1 — serverless: each function invocation gets one connection,
//          returned immediately; prevents pool exhaustion across cold starts.
// channel_binding is stripped — PgBouncer doesn't support SCRAM-SHA-256-PLUS.
const dbUrl = (process.env.DATABASE_URL ?? "").replace(/[&?]channel_binding=[^&]*/g, "");

const client = postgres(dbUrl, {
  max: 1,
  connect_timeout: 30,  // wait up to 30s for Neon to wake from auto-suspend
  idle_timeout: 20,
  max_lifetime: 1800,
});

export const db = drizzle(client, { schema });
