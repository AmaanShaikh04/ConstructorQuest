import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Assign a finishing rank (1–5), or pass null to clear it. A rank is exclusive:
 * giving 1st place to a second team takes it away from the first, so HQ can't
 * accidentally award two teams the same +25.
 */
export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { teamId, rank } = await body(req);
  if (!teamId) return fail("Missing team.");

  const value = rank === null || rank === undefined ? null : Number(rank);
  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 5)) {
    return fail("Speed rank must be between 1 and 5.");
  }

  const sb = db();
  if (value !== null) {
    const { error: clearError } = await sb
      .from("teams")
      .update({ speed_rank: null })
      .eq("speed_rank", value);
    if (clearError) return fail(clearError.message, 500);
  }

  const { error } = await sb.from("teams").update({ speed_rank: value }).eq("id", teamId);
  if (error) return fail(error.message, 500);

  return ok({ view: adminViewFrom(await loadGame()) });
});
