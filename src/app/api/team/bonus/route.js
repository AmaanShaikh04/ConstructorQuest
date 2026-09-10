import { db } from "@/lib/supabase";
import { requireTeam } from "@/lib/session";
import { loadGame, teamViewFrom, leaderboardFrom } from "@/lib/game";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Claim the bonus challenge for the current checkpoint. HQ approves it later. */
export const POST = handler(async () => {
  const teamId = await requireTeam();
  if (!teamId) return fail("Not signed in.", 401);

  const game = await loadGame();
  const team = game.teams.find((t) => t.id === teamId);
  if (!team) return fail("Team not found.", 404);

  const nextId = team.nextCheckpointId;
  if (!nextId) return fail("No bonus challenge is open right now.");

  if (team.bonuses.some((b) => b.checkpointId === nextId)) {
    return fail("You've already submitted this bonus challenge.", 409);
  }

  const { error } = await db()
    .from("bonus_submissions")
    .insert({ team_id: teamId, checkpoint_id: nextId, status: "pending" });
  if (error && error.code !== "23505") return fail(error.message, 500);

  const after = await loadGame();
  return ok({ view: teamViewFrom(after, teamId), leaderboard: leaderboardFrom(after) });
});
