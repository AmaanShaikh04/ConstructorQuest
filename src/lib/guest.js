import "server-only";
import { db } from "./supabase";
import { TOTAL_CHECKPOINTS } from "./scoring";

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

export async function loadCheckpoints() {
  const { data, error } = await db().from("checkpoints").select("*").order("sort_order");
  if (error) throw new Error(`Supabase: ${error.message}`);

  const map = {};
  for (const c of data) {
    map[c.id] = {
      id: c.id,
      name: c.name,
      fullName: c.full_name,
      riddle: c.riddle,
      word: c.word,
      qrCode: c.qr_code,
      order: c.sort_order,
    };
  }
  return map;
}

/**
 * One guest's run: who they are, which checkpoints they've found, and the
 * riddles for the ones they haven't.
 *
 * Guests walk no fixed route — they solve whichever checkpoint they reach
 * first — so every unsolved riddle is shown at once and any valid code is
 * accepted. Ranking is on elapsed time alone.
 */
export async function loadGuestRun(guestId) {
  const sb = db();

  const [guestRes, progressRes, checkpoints] = await Promise.all([
    sb.from("guests").select("*").eq("id", guestId).maybeSingle(),
    sb.from("guest_progress").select("*").eq("guest_id", guestId).order("completed_at"),
    loadCheckpoints(),
  ]);

  if (guestRes.error) throw new Error(`Supabase: ${guestRes.error.message}`);
  if (progressRes.error) throw new Error(`Supabase: ${progressRes.error.message}`);
  if (!guestRes.data) return null;

  return { guest: guestRes.data, progress: progressRes.data, checkpoints };
}

/* -------------------------------------------------------------------------- */
/* View                                                                       */
/* -------------------------------------------------------------------------- */

export function guestViewFrom({ guest, progress, checkpoints }) {
  const solvedAt = new Map(progress.map((p) => [p.checkpoint_id, p.completed_at]));
  const all = Object.values(checkpoints).sort((a, b) => a.order - b.order);

  const elapsed = guest.finished_at
    ? new Date(guest.finished_at) - new Date(guest.started_at)
    : null;

  return {
    guest: {
      id: guest.id,
      name: guest.display_name,
      startedAt: guest.started_at,
      finishedAt: guest.finished_at,
      elapsedMs: elapsed,
    },
    solvedCount: progress.length,
    totalCheckpoints: TOTAL_CHECKPOINTS,
    allDone: progress.length >= TOTAL_CHECKPOINTS,
    // Solved first, in the order they were found — that's the guest's own trail.
    solved: progress.map((p) => ({
      id: p.checkpoint_id,
      name: checkpoints[p.checkpoint_id]?.name ?? p.checkpoint_id,
      word: checkpoints[p.checkpoint_id]?.word ?? "",
      completedAt: p.completed_at,
    })),
    // Every riddle still outstanding. No ordering is implied or enforced.
    open: all
      .filter((c) => !solvedAt.has(c.id))
      .map((c) => ({ id: c.id, riddle: c.riddle })),
    words: progress.map((p) => checkpoints[p.checkpoint_id]?.word).filter(Boolean),
  };
}

/* -------------------------------------------------------------------------- */
/* Public hall of fame                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Finished guests, fastest first. Names and times only — the email addresses
 * never leave the server, and anything HQ has hidden is left out.
 */
export async function guestLeaderboard(limit = 50) {
  const sb = db();

  const [finishedRes, playingRes] = await Promise.all([
    sb
      .from("guests")
      .select("id, display_name, started_at, finished_at")
      .eq("hidden", false)
      .not("finished_at", "is", null)
      .order("finished_at"),
    sb.from("guests").select("id").eq("hidden", false).is("finished_at", null),
  ]);

  if (finishedRes.error) throw new Error(`Supabase: ${finishedRes.error.message}`);

  const rows = finishedRes.data
    .map((g) => ({
      id: g.id,
      name: g.display_name,
      elapsedMs: new Date(g.finished_at) - new Date(g.started_at),
      finishedAt: g.finished_at,
    }))
    .sort((a, b) => a.elapsedMs - b.elapsedMs)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return { rows, stillPlaying: playingRes.data?.length ?? 0 };
}
