import { db } from "@/lib/supabase";
import { requireTeam } from "@/lib/session";
import { loadGame, teamViewFrom, leaderboardFrom } from "@/lib/game";
import { TOTAL_CHECKPOINTS } from "@/lib/scoring";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Submit the final-challenge phrase, once all seven stamps are collected. */
export const POST = handler(async (req) => {
  const teamId = await requireTeam();
  if (!teamId) return fail("Not signed in.", 401);

  const { answer } = await body(req);
  const text = String(answer ?? "").trim();
  if (!text) return fail("Write your final answer first.");
  if (text.length > 500) return fail("That's longer than the final answer needs to be.");

  const game = await loadGame();
  const team = game.teams.find((t) => t.id === teamId);
  if (!team) return fail("Team not found.", 404);

  if (team.completed.length < TOTAL_CHECKPOINTS) {
    return fail("Finish all seven checkpoints before submitting the final challenge.", 403);
  }
  if (team.final && team.final.status !== "rejected") {
    return fail("Your final answer is already with HQ.", 409);
  }

  const { error } = await db()
    .from("final_submissions")
    .upsert(
      {
        team_id: teamId,
        answer: text,
        status: "pending",
        submitted_at: new Date().toISOString(),
        approved_at: null,
      },
      { onConflict: "team_id" }
    );
  if (error) return fail(error.message, 500);

  const after = await loadGame();
  return ok({ view: teamViewFrom(after, teamId), leaderboard: leaderboardFrom(after) });
});
