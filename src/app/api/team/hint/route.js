import { db } from "@/lib/supabase";
import { requireTeam } from "@/lib/session";
import { loadGame, teamViewFrom, leaderboardFrom } from "@/lib/game";
import { MAX_HINTS } from "@/lib/scoring";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Spend one of the team's three hints on their current checkpoint. */
export const POST = handler(async () => {
  const teamId = await requireTeam();
  if (!teamId) return fail("Not signed in.", 401);

  const game = await loadGame();
  const team = game.teams.find((t) => t.id === teamId);
  if (!team) return fail("Team not found.", 404);

  const nextId = team.nextCheckpointId;
  if (!nextId) return fail("There's no riddle left to hint at.");

  const already = team.hints.some((h) => h.checkpointId === nextId);
  if (!already && team.hints.length >= MAX_HINTS) {
    return fail(`You've used all ${MAX_HINTS} hints.`, 403);
  }

  if (!already) {
    const { error } = await db()
      .from("hints_used")
      .insert({ team_id: teamId, checkpoint_id: nextId });
    if (error && error.code !== "23505") return fail(error.message, 500);
  }

  const after = await loadGame();
  return ok({
    hint: game.checkpoints[nextId].hint,
    view: teamViewFrom(after, teamId),
    leaderboard: leaderboardFrom(after),
  });
});
