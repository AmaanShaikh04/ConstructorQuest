import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { setSetting, getAllSettings } from "@/lib/settings";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

const COUNTDOWN_SECONDS = 10;

/**
 * Fires the synchronized start countdown.
 * Sets countdown_at to now and stamps all logged-in teams' started_at
 * to countdown_at + 10s so everyone's clock starts at the same moment.
 */
export const POST = handler(async () => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const now = new Date();
  const startsAt = new Date(now.getTime() + COUNTDOWN_SECONDS * 1000).toISOString();

  await setSetting("countdown_at", now.toISOString());
  await setSetting("game_end_at", null);

  // Stamp all teams' started_at to countdown end time (overwrite any existing value).
  await db()
    .from("teams")
    .update({ started_at: startsAt })
    .neq("id", "__nobody__"); // update all rows

  return ok({ settings: await getAllSettings(), startsAt });
});
