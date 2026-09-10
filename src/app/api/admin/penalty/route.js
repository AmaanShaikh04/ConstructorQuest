import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import { PENALTY_TYPES } from "@/lib/scoring";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Log a penalty against a team, or remove one that was logged by mistake. */
export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { teamId, penaltyId, remove } = await body(req);
  const sb = db();

  if (remove) {
    const { error } = await sb.from("penalties").delete().eq("id", remove);
    if (error) return fail(error.message, 500);
    return ok({ view: adminViewFrom(await loadGame()) });
  }

  if (!teamId) return fail("Missing team.");
  const type = PENALTY_TYPES.find((p) => p.id === penaltyId);
  if (!type) return fail("Unknown penalty type.");

  const { error } = await sb
    .from("penalties")
    .insert({ team_id: teamId, label: type.label, points: type.points });
  if (error) return fail(error.message, 500);

  return ok({ view: adminViewFrom(await loadGame()) });
});
