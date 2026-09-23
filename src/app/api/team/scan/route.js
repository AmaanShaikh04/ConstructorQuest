import { db } from "@/lib/supabase";
import { requireTeam } from "@/lib/session";
import { loadGame, teamViewFrom, leaderboardFrom } from "@/lib/game";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Record a checkpoint completion.
 *
 * The QR code alone is not enough: the server independently works out which
 * checkpoint is this team's next unfinished stop, and only accepts the code
 * belonging to that one. A team that photographs another checkpoint's code, or
 * sees it over someone's shoulder, still can't skip ahead.
 */
export const POST = handler(async (req) => {
  const teamId = await requireTeam();
  if (!teamId) return fail("Not signed in.", 401);

  const { code } = await body(req);
  const submitted = String(code ?? "").trim().toUpperCase();
  if (!submitted) return fail("No code was scanned.");

  const game = await loadGame();
  const team = game.teams.find((t) => t.id === teamId);
  if (!team) return fail("Team not found.", 404);

  const nextId = team.nextCheckpointId;
  if (!nextId) return fail("You've already completed all seven checkpoints.");

  const expected = game.checkpoints[nextId];

  if (submitted !== expected.qrCode.toUpperCase()) {
    // Deliberately vague. Naming the checkpoint a wrong code belongs to would
    // hand teams a free map of the campus: scan anything, learn what it was.
    // They get told it's wrong and nothing more.
    const isOneOfOurs = Object.values(game.checkpoints).some(
      (c) => c.qrCode.toUpperCase() === submitted
    );
    if (isOneOfOurs) {
      return fail(
        "That isn't the code for your next checkpoint. Keep exploring — this one may well be useful to you later.",
        409
      );
    }
    return fail(
      "That code isn't part of the quest. Ask the volunteer to hold the printed QR steady and scan again.",
      422
    );
  }

  const { error } = await db()
    .from("team_progress")
    .insert({ team_id: teamId, checkpoint_id: nextId });

  // 23505 = unique violation: two taps of Confirm, or two phones at once.
  if (error && error.code !== "23505") return fail(error.message, 500);

  const after = await loadGame();
  return ok({
    checkpoint: { id: expected.id, name: expected.name, word: expected.word },
    view: teamViewFrom(after, teamId),
    leaderboard: leaderboardFrom(after),
  });
});
