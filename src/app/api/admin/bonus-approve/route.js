import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Approve or reject a team's bonus-challenge claim. Reversible either way. */
export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { teamId, checkpointId, status } = await body(req);
  if (!teamId || !checkpointId) return fail("Missing team or checkpoint.");
  if (!["approved", "rejected", "pending"].includes(status)) return fail("Unknown status.");

  const { error } = await db()
    .from("bonus_submissions")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("team_id", teamId)
    .eq("checkpoint_id", checkpointId);

  if (error) return fail(error.message, 500);
  return ok({ view: adminViewFrom(await loadGame()) });
});
