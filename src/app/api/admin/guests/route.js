import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Every guest run, including emails and hidden entries. HQ only. */
export const GET = handler(async () => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const sb = db();
  const [guestsRes, progressRes] = await Promise.all([
    sb.from("guests").select("*").order("started_at", { ascending: false }),
    sb.from("guest_progress").select("guest_id"),
  ]);

  if (guestsRes.error) return fail(guestsRes.error.message, 500);
  if (progressRes.error) return fail(progressRes.error.message, 500);

  const counts = {};
  for (const p of progressRes.data) counts[p.guest_id] = (counts[p.guest_id] || 0) + 1;

  return ok({
    guests: guestsRes.data.map((g) => ({
      id: g.id,
      name: g.display_name,
      email: g.email,
      hidden: g.hidden,
      startedAt: g.started_at,
      finishedAt: g.finished_at,
      solved: counts[g.id] || 0,
      elapsedMs: g.finished_at ? new Date(g.finished_at) - new Date(g.started_at) : null,
    })),
  });
});

/**
 * Hide or unhide a guest from the public hall of fame. The backstop for
 * anything the name filter let through — the run is kept, just not displayed.
 */
export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { guestId, hidden } = await body(req);
  if (!guestId) return fail("Missing guest.");
  if (typeof hidden !== "boolean") return fail("Missing hidden flag.");

  const { error } = await db().from("guests").update({ hidden }).eq("id", guestId);
  if (error) return fail(error.message, 500);

  return ok();
});
