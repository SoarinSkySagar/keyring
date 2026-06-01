import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// neon() throws at call time if DATABASE_URL is missing, but Next.js evaluates
// this module during `next build` when env vars are not available. Use a Proxy
// so the neon() call is deferred until the first actual query at runtime.
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getInstance() {
  if (!_db) _db = drizzle(neon(process.env.DATABASE_URL!), { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_t, prop: string | symbol) {
    return (getInstance() as any)[prop];
  },
});
