import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { teamId, status } = await body(req);
  if (!teamId) return fail("Missing team.");
  if (!["approved", "rejected", "pending"].includes(status)) return fail("Unknown status.");

  const { error } = await db()
    .from("final_submissions")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("team_id", teamId);

  if (error) return fail(error.message, 500);
  return ok({ view: adminViewFrom(await loadGame()) });
});
