import { db } from "@/lib/supabase";
import { requireGuest } from "@/lib/session";
import { loadGuestRun, guestViewFrom, guestLeaderboard } from "@/lib/guest";
import { TOTAL_CHECKPOINTS } from "@/lib/scoring";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Record a checkpoint for a guest.
 *
 * Unlike the team route, there is no required order: any of the seven codes
 * counts, whichever one the guest reaches first. The only thing being measured
 * is how long all seven take, so the clock — not the sequence — is what this
 * route guards.
 */
export const POST = handler(async (req) => {
  const guestId = await requireGuest();
  if (!guestId) return fail("Not signed in.", 401);

  const { code } = await body(req);
  const submitted = String(code ?? "").trim().toUpperCase();
  if (!submitted) return fail("No code was scanned.");

  const run = await loadGuestRun(guestId);
  if (!run) return fail("Guest not found.", 404);

  const matched = Object.values(run.checkpoints).find(
    (c) => c.qrCode.toUpperCase() === submitted
  );
  if (!matched) {
    return fail(
      "That code isn't part of the quest. Ask the volunteer to hold the printed QR steady and scan again.",
      422
    );
  }

  if (run.progress.some((p) => p.checkpoint_id === matched.id)) {
    return fail("You've already found that one. Six others are still out there.", 409);
  }

  const sb = db();
  const { error } = await sb
    .from("guest_progress")
    .insert({ guest_id: guestId, checkpoint_id: matched.id });
  if (error && error.code !== "23505") return fail(error.message, 500);

  // Stop the clock on the seventh. Written once — a guest who somehow submits
  // again later doesn't get a better time.
  const solvedCount = run.progress.length + 1;
  if (solvedCount >= TOTAL_CHECKPOINTS && !run.guest.finished_at) {
    await sb
      .from("guests")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", guestId)
      .is("finished_at", null);
  }

  const after = await loadGuestRun(guestId);
  return ok({
    checkpoint: { id: matched.id, name: matched.name, word: matched.word },
    view: guestViewFrom(after),
    leaderboard: await guestLeaderboard(),
  });
});
