import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Wipe all progress so the game can be run again — for the rehearsal run on
 * campus wifi, mostly. Checkpoints, teams and PINs are left alone; only the
 * event data is cleared. Requires the caller to echo back the exact phrase, so
 * a stray tap on event day can't erase two hours of the hunt.
 */
export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { confirm } = await body(req);
  if (confirm !== "RESET") {
    return fail('Type RESET to confirm. Nothing was changed.', 400);
  }

  const sb = db();
  for (const table of [
    "penalties",
    "final_submissions",
    "bonus_submissions",
    "hints_used",
    "team_progress",
  ]) {
    const { error } = await sb.from(table).delete().neq("id", -1);
    if (error) return fail(`Could not clear ${table}: ${error.message}`, 500);
  }

  const { error } = await sb
    .from("teams")
    .update({ team_spirit: 0, speed_rank: null, started_at: null })
    .neq("id", "");
  if (error) return fail(error.message, 500);

  return ok({ view: adminViewFrom(await loadGame()) });
});
