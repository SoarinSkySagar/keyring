export const dynamic = "force-dynamic";

import { eq } from "drizzle-orm";
import { getDb, ensureTable } from "@/db";
import { spells } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ phrase: string }> }
) {
  const { phrase } = await params;

  try {
    await ensureTable();
    const rows = await getDb()
      .select({ secret: spells.secret })
      .from(spells)
      .where(eq(spells.phrase, phrase))
      .limit(1);

    if (!rows.length) {
      return new Response("error: unknown magic phrase", { status: 404 });
    }

    return new Response(rows[0].secret, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (e) {
    console.error("[api/phrase]", e);
    return new Response("error: internal server error", { status: 500 });
  }
}
