import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Set a team's spirit award (0–20, HQ discretion). */
export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { teamId, points } = await body(req);
  const value = Number(points);
  if (!teamId) return fail("Missing team.");
  if (!Number.isInteger(value) || value < 0 || value > 20) {
    return fail("Team spirit must be a whole number between 0 and 20.");
  }

  const { error } = await db().from("teams").update({ team_spirit: value }).eq("id", teamId);
  if (error) return fail(error.message, 500);

  return ok({ view: adminViewFrom(await loadGame()) });
});
