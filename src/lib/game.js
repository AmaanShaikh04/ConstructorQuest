import "server-only";
import { db } from "./supabase";
import { scoreFor, rankTeams, MAX_HINTS, TOTAL_CHECKPOINTS } from "./scoring";

/* -------------------------------------------------------------------------- */
/* Raw loading                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Load the whole game in one pass. Five teams and seven checkpoints is small
 * enough that fetching everything and joining in memory is both simpler and
 * faster than a pile of per-team round trips.
 */
export async function loadGame() {
  const sb = db();

  const [teamsRes, cpRes, progressRes, hintsRes, bonusRes, finalRes, penaltyRes] =
    await Promise.all([
      sb.from("teams").select("*").order("sort_order"),
      sb.from("checkpoints").select("*").order("sort_order"),
      sb.from("team_progress").select("*").order("completed_at"),
      sb.from("hints_used").select("*").order("used_at"),
      sb.from("bonus_submissions").select("*").order("submitted_at"),
      sb.from("final_submissions").select("*").order("submitted_at"),
      sb.from("penalties").select("*").order("created_at"),
    ]);

  for (const res of [teamsRes, cpRes, progressRes, hintsRes, bonusRes, finalRes, penaltyRes]) {
    if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  }

  const checkpoints = {};
  for (const c of cpRes.data) {
    checkpoints[c.id] = {
      id: c.id,
      name: c.name,
      fullName: c.full_name,
      riddle: c.riddle,
      hint: c.hint,
      bonus: c.bonus_challenge,
      word: c.word,
      qrCode: c.qr_code,
      order: c.sort_order,
    };
  }

  const byTeam = (rows) => {
    const out = {};
    for (const r of rows) (out[r.team_id] ||= []).push(r);
    return out;
  };

  const progress = byTeam(progressRes.data);
  const hints = byTeam(hintsRes.data);
  const bonuses = byTeam(bonusRes.data);
  const penalties = byTeam(penaltyRes.data);
  const finals = {};
  for (const f of finalRes.data) finals[f.team_id] = f;

  const teams = teamsRes.data.map((t) => {
    const record = {
      id: t.id,
      name: t.name,
      shortName: t.short_name,
      route: t.route,
      teamSpirit: t.team_spirit,
      speedRank: t.speed_rank,
      startedAt: t.started_at,
      completed: (progress[t.id] || []).map((p) => ({
        checkpointId: p.checkpoint_id,
        completedAt: p.completed_at,
      })),
      hints: (hints[t.id] || []).map((h) => ({
        checkpointId: h.checkpoint_id,
        usedAt: h.used_at,
      })),
      bonuses: (bonuses[t.id] || []).map((b) => ({
        checkpointId: b.checkpoint_id,
        status: b.status,
        submittedAt: b.submitted_at,
        approvedAt: b.approved_at,
      })),
      penalties: (penalties[t.id] || []).map((p) => ({
        id: p.id,
        label: p.label,
        points: p.points,
        createdAt: p.created_at,
      })),
      final: finals[t.id]
        ? {
            answer: finals[t.id].answer,
            status: finals[t.id].status,
            submittedAt: finals[t.id].submitted_at,
            approvedAt: finals[t.id].approved_at,
          }
        : null,
    };
    record.score = scoreFor(record);
    record.nextCheckpointId = nextCheckpointFor(record);
    return record;
  });

  return { checkpoints, teams };
}

/** The team's next unvisited checkpoint in its own route, or null if finished. */
export function nextCheckpointFor(team) {
  const done = new Set(team.completed.map((c) => c.checkpointId));
  return team.route.find((id) => !done.has(id)) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Views                                                                      */
/* -------------------------------------------------------------------------- */

/** Leaderboard rows — safe for anyone logged in to see. */
export function leaderboardFrom({ teams }) {
  return rankTeams(teams).map((t, i) => ({
    rank: i + 1,
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    score: t.score,
    completed: t.completed.length,
    finished: t.completed.length === TOTAL_CHECKPOINTS,
  }));
}

/**
 * Everything one team is allowed to know. Deliberately excludes other teams'
 * detail, every checkpoint they haven't reached yet, and — crucially — the QR
 * codes and the hints they haven't paid for.
 */
export function teamViewFrom({ checkpoints, teams }, teamId) {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return null;

  const doneAt = new Map(team.completed.map((c) => [c.checkpointId, c.completedAt]));
  const hintedFor = new Set(team.hints.map((h) => h.checkpointId));
  const bonusByCp = new Map(team.bonuses.map((b) => [b.checkpointId, b]));

  const nextId = team.nextCheckpointId;
  const current = nextId ? checkpoints[nextId] : null;

  // Words appear in the order the team actually found them, not route order.
  const words = team.completed.map((c) => checkpoints[c.checkpointId]?.word).filter(Boolean);

  return {
    team: {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      score: team.score,
      teamSpirit: team.teamSpirit,
      speedRank: team.speedRank,
      startedAt: team.startedAt,
    },
    stamps: team.route.map((id) => ({
      id,
      name: checkpoints[id]?.name ?? id,
      completedAt: doneAt.get(id) ?? null,
      isCurrent: id === nextId,
      word: doneAt.has(id) ? checkpoints[id]?.word : null,
    })),
    completedCount: team.completed.length,
    totalCheckpoints: TOTAL_CHECKPOINTS,
    hintsUsed: team.hints.length,
    hintsLeft: Math.max(0, MAX_HINTS - team.hints.length),
    penalties: team.penalties,
    bonuses: team.bonuses,
    words,
    allDone: nextId === null,
    current: current
      ? {
          id: current.id,
          name: current.name,
          position: team.route.indexOf(current.id) + 1,
          riddle: current.riddle,
          bonus: current.bonus,
          // The hint is only sent to the browser once it has been paid for.
          hint: hintedFor.has(current.id) ? current.hint : null,
          hintRevealed: hintedFor.has(current.id),
          bonusStatus: bonusByCp.get(current.id)?.status ?? null,
        }
      : null,
    final: team.final,
  };
}

/** Full detail for HQ, including QR codes and every team's timings. */
export function adminViewFrom(game) {
  const { checkpoints, teams } = game;
  return {
    checkpoints: Object.values(checkpoints).sort((a, b) => a.order - b.order),
    teams: teams.map((t) => ({
      ...t,
      nextCheckpointName: t.nextCheckpointId ? checkpoints[t.nextCheckpointId]?.name : null,
      completed: t.completed.map((c) => ({
        ...c,
        name: checkpoints[c.checkpointId]?.name ?? c.checkpointId,
      })),
      hints: t.hints.map((h) => ({
        ...h,
        name: checkpoints[h.checkpointId]?.name ?? h.checkpointId,
      })),
      bonuses: t.bonuses.map((b) => ({
        ...b,
        name: checkpoints[b.checkpointId]?.name ?? b.checkpointId,
        challenge: checkpoints[b.checkpointId]?.bonus ?? "",
      })),
      splits: splitsFor(t),
    })),
    leaderboard: leaderboardFrom(game),
  };
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

/** Time taken between consecutive checkpoints, in milliseconds. */
export function splitsFor(team) {
  const out = [];
  let prev = team.startedAt ? new Date(team.startedAt) : null;
  for (const c of team.completed) {
    const at = new Date(c.completedAt);
    out.push({
      checkpointId: c.checkpointId,
      completedAt: c.completedAt,
      splitMs: prev ? at - prev : null,
    });
    prev = at;
  }
  return out;
}

export function totalTimeMs(team) {
  if (!team.startedAt || team.completed.length === 0) return null;
  const last = team.completed.at(-1).completedAt;
  return new Date(last) - new Date(team.startedAt);
}
