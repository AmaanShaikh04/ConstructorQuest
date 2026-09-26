import { loadGame, leaderboardFrom } from "@/lib/game";
import { ok, handler } from "@/lib/api";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Public leaderboard — no auth needed, safe for projection. */
export const GET = handler(async () => {
  const game = await loadGame();

  const rows = leaderboardFrom(game).map((row) => {
    const team = game.teams.find((t) => t.id === row.id);
    const nextId = team?.nextCheckpointId ?? null;
    const riddleNum = nextId ? (team?.route.indexOf(nextId) ?? -1) + 1 : null;
    // Freeze clock as soon as the final answer is submitted (or fall back to last checkpoint)
    const finishedAt = team?.final?.submittedAt
      ?? (row.finished ? (team?.completed.at(-1)?.completedAt ?? null) : null);
    return {
      rank: row.rank,
      name: row.name,
      shortName: row.shortName,
      score: row.score,
      completed: row.completed,
      finished: row.finished,
      riddleNum,
      startedAt: team?.startedAt ?? null,
      finishedAt,
    };
  });

  const [countdownAt, gameEndAt] = await Promise.all([
    getSetting("countdown_at"),
    getSetting("game_end_at"),
  ]);
  return ok({ rows, countdownAt, gameEndAt });
});
