"use server";

import { revalidatePath } from "next/cache";
import { getDb, ensureTable } from "@/db";
import { spells } from "@/db/schema";

export async function createSpell(
  _: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const phrase = (formData.get("phrase") as string)?.trim();
  const secret = (formData.get("secret") as string)?.trim();

  if (!phrase || !secret) return { error: "Both fields are required." };
  if (/\s/.test(phrase)) return { error: "Phrase must not contain spaces." };

  try {
    await ensureTable();
    await getDb().insert(spells).values({ phrase, secret });
    revalidatePath("/");
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
      return { error: "That phrase is already taken." };
    }
    console.error("[createSpell]", e);
    return { error: "Something went wrong." };
  }
}
