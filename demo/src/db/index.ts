import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDb() {
  return drizzle(neon(process.env.DEMO_DATABASE_URL!), { schema });
}

export async function ensureTable() {
  const sql = neon(process.env.DEMO_DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS spells (
      phrase TEXT PRIMARY KEY,
      secret TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}
