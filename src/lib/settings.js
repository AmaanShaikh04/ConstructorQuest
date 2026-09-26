import "server-only";
import { db } from "./supabase";

export async function getSetting(key, fallback = null) {
  try {
    const { data } = await db()
      .from("game_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  const { error } = await db()
    .from("game_settings")
    .upsert({ key, value: value === null ? null : String(value) }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function getAllSettings() {
  const { data } = await db().from("game_settings").select("key, value");
  const out = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}
