// Scoring rules. Pure functions, no I/O — shared by server and client so the
// number a team sees is the number HQ sees.

export const POINTS_PER_CHECKPOINT = 10;
export const POINTS_PER_BONUS = 5;
export const POINTS_FINAL = 20;
export const HINT_COST = 5;
export const MAX_HINTS = 3;
export const TOTAL_CHECKPOINTS = 7;

export const SPEED_POINTS = { 1: 25, 2: 20, 3: 15, 4: 10, 5: 5 };

export const PENALTY_TYPES = [
  { id: "share", label: "Sharing answers", points: 10 },
  { id: "conduct", label: "Unsportsmanlike conduct", points: 20 },
  { id: "disrespect", label: "Disrespect toward volunteers", points: 20 },
  { id: "interfere", label: "Interfering with other teams", points: 20 },
];

export const SPIRIT_VALUES = [0, 5, 10, 15, 20];

/**
 * Compute a team's score from raw event data. Nothing is stored as a running
 * total, so retroactive HQ adjustments are always reflected immediately.
 *
 * @param {object} t a team record from buildTeamRecord()
 */
export function scoreFor(t) {
  if (!t) return 0;

  const checkpoints = t.completed.length * POINTS_PER_CHECKPOINT;
  const bonuses = t.bonuses.filter((b) => b.status === "approved").length * POINTS_PER_BONUS;
  const final = t.final?.status === "approved" ? POINTS_FINAL : 0;
  const spirit = t.teamSpirit || 0;
  const speed = t.speedRank ? SPEED_POINTS[t.speedRank] || 0 : 0;
  const hints = t.hints.length * HINT_COST;
  const penalties = t.penalties.reduce((sum, p) => sum + p.points, 0);

  return checkpoints + bonuses + final + spirit + speed - hints - penalties;
}

/** The itemised breakdown, for the team's own progress panel and HQ. */
export function scoreBreakdown(t) {
  const approvedBonuses = t.bonuses.filter((b) => b.status === "approved").length;
  return [
    { label: "Checkpoints reached", detail: `${t.completed.length} × ${POINTS_PER_CHECKPOINT}`, points: t.completed.length * POINTS_PER_CHECKPOINT },
    { label: "Bonus challenges", detail: `${approvedBonuses} × ${POINTS_PER_BONUS}`, points: approvedBonuses * POINTS_PER_BONUS },
    { label: "Final challenge", detail: t.final?.status === "approved" ? "approved" : "—", points: t.final?.status === "approved" ? POINTS_FINAL : 0 },
    { label: "Team spirit", detail: "HQ discretion", points: t.teamSpirit || 0 },
    { label: "Speed bonus", detail: t.speedRank ? `rank ${t.speedRank}` : "—", points: t.speedRank ? SPEED_POINTS[t.speedRank] || 0 : 0 },
    { label: "Hints used", detail: `${t.hints.length} × ${HINT_COST}`, points: -t.hints.length * HINT_COST },
    { label: "Penalties", detail: `${t.penalties.length} logged`, points: -t.penalties.reduce((s, p) => s + p.points, 0) },
  ];
}

/** Leaderboard order: score desc, then more checkpoints, then finished earlier. */
export function rankTeams(teams) {
  return [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.completed.length !== a.completed.length) return b.completed.length - a.completed.length;
    const aLast = a.completed.at(-1)?.completedAt ?? Infinity;
    const bLast = b.completed.at(-1)?.completedAt ?? Infinity;
    return new Date(aLast) - new Date(bLast);
  });
}
