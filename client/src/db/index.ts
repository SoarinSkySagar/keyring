import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon free-tier compute auto-suspends after ~5 min of inactivity.
// The cold start takes 1–4s, during which fetch() throws AggregateError.
// Retrying with back-off covers the wake-up window transparently.
async function retryFetch(
  url: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const delays = [1000, 2500];
  let lastErr: unknown;
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await fetch(url as RequestInfo, init);
    } catch (err) {
      lastErr = err;
      if (i < delays.length) await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
  throw lastErr;
}

neonConfig.fetchFunction = retryFetch;

// Defer neon() until first query — DATABASE_URL is absent during `next build`
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
