import { requireTeam } from "@/lib/session";
import { loadGame, teamViewFrom, leaderboardFrom } from "@/lib/game";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const teamId = await requireTeam();
  if (!teamId) return fail("Not signed in.", 401);

  const game = await loadGame();
  const view = teamViewFrom(game, teamId);
  if (!view) return fail("Team not found.", 404);

  return ok({ view, leaderboard: leaderboardFrom(game) });
});
