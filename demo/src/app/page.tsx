export const dynamic = "force-dynamic";

import { getDb, ensureTable } from "@/db";
import { spells } from "@/db/schema";
import { CreateForm } from "./create-form";
import { PhraseList } from "./phrase-list";

export default async function Home() {
  await ensureTable();
  const all = await getDb()
    .select({ phrase: spells.phrase, createdAt: spells.createdAt })
    .from(spells)
    .orderBy(spells.createdAt);

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: "2.75rem", fontWeight: 900, marginBottom: "8px" }}>
        Magic Phrase Vault
      </h1>
      <p style={{ color: "#555", marginBottom: "48px", lineHeight: 1.6 }}>
        Create a mapping from a magic phrase to a secret.
        Retrieve it at <code>/api/[phrase]</code>.
      </p>

      <section style={{ marginBottom: "56px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>
          Create a spell
        </h2>
        <CreateForm />
      </section>

      <section>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>
          Existing phrases ({all.length})
        </h2>
        <PhraseList phrases={all.map((s) => s.phrase)} />
      </section>
    </main>
  );
}
