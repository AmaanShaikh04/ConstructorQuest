"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Printer, RotateCcw, Check, X, Trash2 } from "lucide-react";
import { GoldButton, GhostButton, Panel, Tabs } from "@/components/ui";
import Leaderboard from "@/components/Leaderboard";
import { PENALTY_TYPES, SPIRIT_VALUES, SPEED_POINTS } from "@/lib/scoring";

const POLL_MS = 10_000;

export default function AdminDashboard({ initialView }) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [tab, setTab] = useState("teams");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const sync = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/state", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setView(data.view);
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(sync, POLL_MS);
    return () => clearInterval(id);
  }, [sync]);

  const post = useCallback(async (url, payload, key = "") => {
    setBusy(key);
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.view) setView(data.view);
      } else {
        setError(data.error || "That didn't work.");
      }
      return data;
    } catch {
      setError("No connection to the server.");
      return { ok: false };
    } finally {
      setBusy("");
    }
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const pendingBonuses = view.teams.flatMap((t) =>
    t.bonuses.filter((b) => b.status === "pending").map((b) => ({ team: t, bonus: b }))
  );
  const pendingFinals = view.teams.filter((t) => t.final?.status === "pending");

  return (
    <main className="min-h-dvh bg-ink">
      <div className="mx-auto max-w-4xl px-5 pb-20 pt-6">
        <header className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Constructor Quest</p>
            <h1 className="font-serif text-xl text-parchment">HQ Dashboard</h1>
          </div>
          <button onClick={logout} className="text-xs text-muted hover:text-parchment">
            Log out
          </button>
        </header>

        <Tabs
          tabs={[
            ["teams", "Teams"],
            ["bonus", "Bonus review", pendingBonuses.length || null],
            ["final", "Final challenge", pendingFinals.length || null],
            ["penalties", "Penalties & spirit"],
            ["qr", "QR codes"],
            ["leaderboard", "Leaderboard"],
            ["danger", "Reset"],
          ]}
          active={tab}
          onChange={setTab}
        />

        {error && (
          <p className="mb-4 rounded-md bg-rust/15 px-3 py-2 text-xs text-[#e08b78]" role="alert">
            {error}
          </p>
        )}

        {tab === "teams" && <TeamsTab view={view} post={post} busy={busy} />}
        {tab === "bonus" && <BonusTab items={pendingBonuses} view={view} post={post} busy={busy} />}
        {tab === "final" && <FinalTab view={view} post={post} busy={busy} />}
        {tab === "penalties" && <PenaltiesTab view={view} post={post} busy={busy} />}
        {tab === "qr" && <QrTab view={view} />}
        {tab === "leaderboard" && <Leaderboard rows={view.leaderboard} />}
        {tab === "danger" && <ResetTab post={post} busy={busy} />}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Teams                                                                      */
/* -------------------------------------------------------------------------- */

function TeamsTab({ view, post, busy }) {
  return (
    <div className="flex flex-col gap-3">
      {view.teams.map((t) => (
        <Panel key={t.id}>
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-parchment">{t.name}</p>
              <p className="text-xs text-muted">
                {t.completed.length}/7 · {t.hints.length} hints ·{" "}
                {t.bonuses.filter((b) => b.status === "approved").length} bonuses approved
                {t.nextCheckpointName ? ` · heading to ${t.nextCheckpointName}` : " · finished"}
              </p>
            </div>
            <span className="text-sm font-bold text-gold">{t.score} pts</span>
          </div>

          <p className="mb-2 text-[11px] text-muted">
            Started {t.startedAt ? new Date(t.startedAt).toLocaleTimeString() : "—"} · total{" "}
            {formatDuration(totalTime(t))}
          </p>

          {t.completed.length > 0 && (
            <ul className="mb-3 flex flex-col gap-0.5">
              {t.splits.map((s, i) => (
                <li key={s.checkpointId} className="flex justify-between text-xs text-[#c3c9db]">
                  <span>
                    {i + 1}. {t.completed[i]?.name ?? s.checkpointId}
                  </span>
                  <span className="text-muted">
                    {new Date(s.completedAt).toLocaleTimeString()}
                    {s.splitMs != null && (
                      <span className="ml-2 text-[#8790a8]">+{formatDuration(s.splitMs)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Speed rank:</span>
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                disabled={busy === `speed-${t.id}`}
                onClick={() =>
                  post(
                    "/api/admin/speed",
                    { teamId: t.id, rank: t.speedRank === r ? null : r },
                    `speed-${t.id}`
                  )
                }
                title={`+${SPEED_POINTS[r]} pts`}
                className={
                  "h-7 w-7 rounded-full border text-[11px] transition disabled:opacity-50 " +
                  (t.speedRank === r
                    ? "border-gold bg-gold font-semibold text-ink"
                    : "border-ink-line text-muted hover:border-gold/60")
                }
              >
                {r}
              </button>
            ))}
            {t.speedRank && <span className="text-xs text-gold">+{SPEED_POINTS[t.speedRank]}</span>}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bonus review                                                               */
/* -------------------------------------------------------------------------- */

function BonusTab({ items, view, post, busy }) {
  const decided = view.teams.flatMap((t) =>
    t.bonuses.filter((b) => b.status !== "pending").map((b) => ({ team: t, bonus: b }))
  );

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <Panel>
          <p className="text-sm text-muted">Nothing waiting for review.</p>
        </Panel>
      )}

      {items.map(({ team, bonus }) => (
        <Panel key={`${team.id}-${bonus.checkpointId}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[60%]">
              <p className="text-sm font-semibold text-parchment">
                {team.name} · {bonus.name}
              </p>
              <p className="text-xs text-muted">{bonus.challenge}</p>
              <p className="mt-1 text-[11px] text-[#8790a8]">
                Claimed {new Date(bonus.submittedAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2">
              <GoldButton
                className="px-3 py-1.5 text-xs"
                disabled={busy.startsWith("bonus")}
                onClick={() =>
                  post(
                    "/api/admin/bonus-approve",
                    { teamId: team.id, checkpointId: bonus.checkpointId, status: "approved" },
                    `bonus-${team.id}`
                  )
                }
              >
                <span className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Approve +5
                </span>
              </GoldButton>
              <button
                disabled={busy.startsWith("bonus")}
                onClick={() =>
                  post(
                    "/api/admin/bonus-approve",
                    { teamId: team.id, checkpointId: bonus.checkpointId, status: "rejected" },
                    `bonus-${team.id}`
                  )
                }
                className="rounded-md border border-rust px-3 py-1.5 text-xs text-rust disabled:opacity-50"
              >
                <span className="flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> Reject
                </span>
              </button>
            </div>
          </div>
        </Panel>
      ))}

      {decided.length > 0 && (
        <Panel>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Already decided</p>
          <ul className="flex flex-col gap-1">
            {decided.map(({ team, bonus }) => (
              <li
                key={`${team.id}-${bonus.checkpointId}`}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-[#c3c9db]">
                  {team.shortName} · {bonus.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className={bonus.status === "approved" ? "text-forest" : "text-rust"}>
                    {bonus.status}
                  </span>
                  <button
                    onClick={() =>
                      post("/api/admin/bonus-approve", {
                        teamId: team.id,
                        checkpointId: bonus.checkpointId,
                        status: bonus.status === "approved" ? "rejected" : "approved",
                      })
                    }
                    className="text-muted underline hover:text-parchment"
                  >
                    flip
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Final challenge                                                            */
/* -------------------------------------------------------------------------- */

function FinalTab({ view, post, busy }) {
  const submitted = view.teams.filter((t) => t.final);

  if (submitted.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-muted">No team has reached the final challenge yet.</p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {submitted.map((t) => (
        <Panel key={t.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[55%]">
              <p className="text-sm font-semibold text-parchment">{t.name}</p>
              <p className="font-serif text-base text-gold">“{t.final.answer}”</p>
              <p className="mt-1 text-[11px] text-muted">
                Submitted {new Date(t.final.submittedAt).toLocaleTimeString()} · words in their
                order: {t.completed.map((c) => c.name).join(" → ")}
              </p>
            </div>
            {t.final.status === "pending" ? (
              <div className="flex gap-2">
                <GoldButton
                  className="px-3 py-1.5 text-xs"
                  disabled={busy === `final-${t.id}`}
                  onClick={() =>
                    post(
                      "/api/admin/final-approve",
                      { teamId: t.id, status: "approved" },
                      `final-${t.id}`
                    )
                  }
                >
                  Confirm correct +20
                </GoldButton>
                <button
                  disabled={busy === `final-${t.id}`}
                  onClick={() =>
                    post(
                      "/api/admin/final-approve",
                      { teamId: t.id, status: "rejected" },
                      `final-${t.id}`
                    )
                  }
                  className="rounded-md border border-rust px-3 py-1.5 text-xs text-rust disabled:opacity-50"
                >
                  Send back
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-xs">
                <span className={t.final.status === "approved" ? "text-forest" : "text-rust"}>
                  {t.final.status}
                </span>
                <button
                  onClick={() =>
                    post("/api/admin/final-approve", {
                      teamId: t.id,
                      status: t.final.status === "approved" ? "rejected" : "approved",
                    })
                  }
                  className="text-muted underline hover:text-parchment"
                >
                  flip
                </button>
              </span>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Penalties & spirit                                                         */
/* -------------------------------------------------------------------------- */

function PenaltiesTab({ view, post, busy }) {
  return (
    <div className="flex flex-col gap-3">
      {view.teams.map((t) => (
        <Panel key={t.id}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-parchment">{t.name}</p>
            <span className="text-sm font-bold text-gold">{t.score} pts</span>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Team spirit:</span>
            {SPIRIT_VALUES.map((v) => (
              <button
                key={v}
                disabled={busy === `spirit-${t.id}`}
                onClick={() => post("/api/admin/spirit", { teamId: t.id, points: v }, `spirit-${t.id}`)}
                className={
                  "rounded px-2.5 py-1 text-[11px] transition disabled:opacity-50 " +
                  (t.teamSpirit === v
                    ? "border border-gold bg-gold font-semibold text-ink"
                    : "border border-ink-line text-muted hover:border-gold/60")
                }
              >
                {v}
              </button>
            ))}
          </div>

          <div className="mb-2 flex flex-wrap gap-2">
            {PENALTY_TYPES.map((pt) => (
              <button
                key={pt.id}
                disabled={busy === `pen-${t.id}`}
                onClick={() =>
                  post("/api/admin/penalty", { teamId: t.id, penaltyId: pt.id }, `pen-${t.id}`)
                }
                className="flex items-center gap-1 rounded border border-rust px-2 py-1 text-[11px] text-rust transition hover:bg-rust/10 disabled:opacity-50"
              >
                <ShieldAlert className="h-3 w-3" /> {pt.label} (−{pt.points})
              </button>
            ))}
          </div>

          {t.penalties.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {t.penalties.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-[11px] text-muted">
                  <span>
                    {p.label} · −{p.points} · {new Date(p.createdAt).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => post("/api/admin/penalty", { remove: p.id })}
                    title="Remove this penalty"
                    className="flex items-center gap-1 text-muted underline hover:text-parchment"
                  >
                    <Trash2 className="h-3 w-3" /> undo
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] text-[#8790a8]">
            QR tampering means disqualification — that&apos;s a conversation at HQ, not a button
            here.
          </p>
        </Panel>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* QR codes                                                                   */
/* -------------------------------------------------------------------------- */

function QrTab({ view }) {
  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            One QR per checkpoint. Print, laminate, and hand each one only to the volunteer
            stationed there — never leave it unattended.
          </p>
          <Link
            href="/admin/print"
            target="_blank"
            className="flex items-center gap-1.5 rounded-md border border-gold px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10"
          >
            <Printer className="h-3.5 w-3.5" /> Print sheet
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {view.checkpoints.map((cp) => (
            <div key={cp.id} className="flex items-center gap-3 rounded-md bg-parchment p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/qr/${cp.id}`}
                alt={`QR code for ${cp.name}`}
                width={72}
                height={72}
                className="h-[72px] w-[72px] shrink-0 rounded bg-white"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#14181f]">{cp.name}</p>
                <p className="truncate text-[11px] text-ink-soft">{cp.fullName}</p>
                <p className="mt-1 inline-block rounded bg-parchment-dim px-1.5 py-0.5 font-mono text-[11px] text-gold-deep">
                  {cp.qrCode}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Riddles & answers</p>
        <ul className="flex flex-col gap-3">
          {view.checkpoints.map((cp) => (
            <li key={cp.id} className="border-b border-ink-line pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-parchment">
                {cp.name} — <span className="font-normal text-muted">{cp.fullName}</span>
              </p>
              <p className="mt-1 font-serif text-sm text-[#c3c9db]">“{cp.riddle}”</p>
              <p className="mt-1 text-[11px] text-muted">Hint: {cp.hint}</p>
              <p className="text-[11px] text-muted">Bonus: {cp.bonus}</p>
              <p className="text-[11px] text-gold">Word: {cp.word}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reset                                                                      */
/* -------------------------------------------------------------------------- */

function ResetTab({ post, busy }) {
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  return (
    <Panel className="border border-rust/40">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rust">
        <RotateCcw className="h-4 w-4" /> Reset all progress
      </p>
      <p className="mb-3 text-xs text-muted">
        Clears every checkpoint time, hint, bonus, final answer, penalty, spirit award and speed
        rank for all five teams. Teams, PINs, routes and checkpoints are untouched. Meant for the
        rehearsal run — not for event day.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          className="field max-w-[200px] flex-1"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setDone(false);
          }}
          placeholder="Type RESET"
        />
        <GhostButton
          className="border-rust text-rust"
          disabled={confirm !== "RESET" || busy === "reset"}
          onClick={async () => {
            const res = await post("/api/admin/reset", { confirm }, "reset");
            if (res.ok) {
              setConfirm("");
              setDone(true);
            }
          }}
        >
          {busy === "reset" ? "Clearing…" : "Reset the game"}
        </GhostButton>
      </div>
      {done && <p className="mt-3 text-xs text-forest">Progress cleared. The game is back to zero.</p>}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

function totalTime(team) {
  if (!team.startedAt || team.completed.length === 0) return null;
  return new Date(team.completed.at(-1).completedAt) - new Date(team.startedAt);
}

function formatDuration(ms) {
  if (ms == null) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
