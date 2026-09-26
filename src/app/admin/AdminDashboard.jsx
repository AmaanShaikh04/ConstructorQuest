"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Printer, RotateCcw, Check, X, Trash2, Eye, EyeOff, Timer, Radio, Users, UserX, Rocket, ExternalLink } from "lucide-react";
import { GoldButton, GhostButton, Panel, Tabs } from "@/components/ui";
import Leaderboard from "@/components/Leaderboard";
import { formatElapsed } from "@/lib/format";
import { PENALTY_TYPES, SPIRIT_VALUES, SPEED_POINTS } from "@/lib/scoring";

const POLL_MS = 10_000;

export default function AdminDashboard({ initialView }) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [tab, setTab] = useState("control");
  const [settings, setSettings] = useState(null);
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
    // Fetch settings once on mount — EventControlTab reads from this state
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSettings(d.settings); })
      .catch(() => {});

    sync();
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
            ["control", "Event control"],
            ["teams", "Teams"],
            ["bonus", "Bonus review", pendingBonuses.length || null],
            ["final", "Final challenge", pendingFinals.length || null],
            ["penalties", "Penalties & spirit"],
            ["guests", "Guests"],
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

        {tab === "control" && <EventControlTab settings={settings} setSettings={setSettings} post={post} busy={busy} />}
        {tab === "teams" && <TeamsTab view={view} post={post} busy={busy} />}
        {tab === "bonus" && <BonusTab items={pendingBonuses} view={view} post={post} busy={busy} />}
        {tab === "final" && <FinalTab view={view} post={post} busy={busy} />}
        {tab === "penalties" && <PenaltiesTab view={view} post={post} busy={busy} />}
        {tab === "guests" && <GuestsTab />}
        {tab === "qr" && <QrTab view={view} />}
        {tab === "leaderboard" && <Leaderboard rows={view.leaderboard} />}
        {tab === "danger" && <ResetTab post={post} busy={busy} />}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Event control                                                              */
/* -------------------------------------------------------------------------- */

function EventControlTab({ settings, setSettings, post, busy }) {
  const [countdown, setCountdown] = useState(null);
  const [cdBusy, setCdBusy] = useState(false);
  const [endCdBusy, setEndCdBusy] = useState(false);
  const [toast, setToast] = useState("");

  if (!settings) {
    return <Panel><p className="text-sm text-muted">Loading…</p></Panel>;
  }

  const teamLoginOn = settings.team_login_enabled !== "false";
  const guestLoginOn = settings.guest_login_enabled === "true";
  const liveVisible = settings.live_leaderboard_visible === "true";

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function setSetting(key, value, label) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(label);
      } else {
        setSettings((prev) => ({ ...prev, [key]: value === "true" ? "false" : "true" }));
        showToast("Save failed: " + (data.error ?? "unknown error"));
      }
    } catch {
      setSettings((prev) => ({ ...prev, [key]: value === "true" ? "false" : "true" }));
      showToast("No connection — change not saved.");
    }
  }

  async function startEndCountdown() {
    setEndCdBusy(true);
    await fetch("/api/admin/end-countdown", { method: "POST" });
    setEndCdBusy(false);
    showToast("End countdown started");
  }

  async function startCountdown() {
    setCdBusy(true);
    const res = await fetch("/api/admin/countdown", { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      let s = 10;
      setCountdown(s);
      const id = setInterval(() => {
        s -= 1;
        setCountdown(s);
        if (s <= 0) clearInterval(id);
      }, 1000);
    }
    setCdBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Toast confirmation */}
      {toast && (
        <div className="rounded-lg border border-forest bg-forest/15 px-4 py-2.5 text-sm font-medium text-forest">
          ✓ {toast}
        </div>
      )}

      {/* Login gates */}
      <Panel>
        <p className="mb-4 text-xs uppercase tracking-wider text-gold">Login gates</p>
        <div className="flex flex-col gap-3">
          <GateRow
            icon={<Users className="h-4 w-4" />}
            label="Team login"
            on={teamLoginOn}
            onEnable={() => setSetting("team_login_enabled", "true", "Team login enabled")}
            onDisable={() => setSetting("team_login_enabled", "false", "Team login disabled")}
          />
          <GateRow
            icon={<UserX className="h-4 w-4" />}
            label="Guest login"
            on={guestLoginOn}
            onEnable={() => setSetting("guest_login_enabled", "true", "Guest login enabled")}
            onDisable={() => setSetting("guest_login_enabled", "false", "Guest login disabled")}
          />
          <GateRow
            icon={<Radio className="h-4 w-4" />}
            label="Live leaderboard button"
            on={liveVisible}
            onEnable={() => setSetting("live_leaderboard_visible", "true", "Leaderboard button shown")}
            onDisable={() => setSetting("live_leaderboard_visible", "false", "Leaderboard button hidden")}
          />
        </div>
      </Panel>

      {/* Game control */}
      <Panel>
        <p className="mb-4 text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
          <Rocket className="h-3.5 w-3.5" /> Game control
        </p>
        <div className="flex flex-col gap-3">
          {/* Start */}
          <div className="rounded-lg border border-ink-line p-3">
            <p className="mb-0.5 text-sm font-semibold text-parchment">Start game</p>
            <p className="mb-3 text-xs text-muted">Triggers a 10-second countdown on every team screen simultaneously. Press once all teams are logged in and waiting.</p>
            {countdown !== null ? (
              <div className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-center">
                <p className="text-xs text-muted mb-1">Countdown in progress — teams see:</p>
                <p className="text-4xl font-bold text-gold">{countdown}</p>
              </div>
            ) : (
              <button
                onClick={startCountdown}
                disabled={cdBusy}
                className="w-full rounded-lg border border-gold bg-gold/10 py-2.5 text-sm font-semibold text-gold hover:bg-gold/20 disabled:opacity-50 transition"
              >
                {cdBusy ? "Sending…" : "🚀 Start Game"}
              </button>
            )}
          </div>

          {/* End */}
          <div className="rounded-lg border border-ink-line p-3">
            <p className="mb-0.5 text-sm font-semibold text-parchment">End game</p>
            <p className="mb-3 text-xs text-muted">Triggers a 10-second countdown on all team screens, then shows the game-over screen. Use when the event is over.</p>
            <div className="flex gap-2">
              <button
                onClick={startEndCountdown}
                disabled={endCdBusy}
                className="flex-1 rounded-lg border border-rust bg-rust/10 py-2.5 text-sm font-semibold text-rust hover:bg-rust/20 disabled:opacity-50 transition"
              >
                {endCdBusy ? "Sending…" : "🏁 End Game"}
              </button>
              <button
                onClick={() => setSetting("game_end_at", null, "End countdown cancelled")}
                className="rounded-lg border border-ink-line px-3 py-2.5 text-xs text-muted hover:text-parchment transition"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {/* Live leaderboard link */}
      <Panel>
        <p className="mb-2 text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5" /> Live leaderboard
        </p>
        <p className="mb-3 text-xs text-muted">
          Project this on the big screen — no login needed, updates every 5 seconds.
        </p>
        <a
          href="/live"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md border border-gold/40 px-3 py-2 text-sm text-gold hover:bg-gold/10 transition w-fit"
        >
          <ExternalLink className="h-4 w-4" /> Open live leaderboard ↗
        </a>
      </Panel>
    </div>
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
          <p className="mb-0.5 text-sm font-semibold text-parchment">
            {team.name} · {bonus.name}
          </p>
          <p className="text-xs text-muted">{bonus.challenge}</p>
          <p className="mb-3 mt-1 text-[11px] text-[#8790a8]">
            Submitted {new Date(bonus.submittedAt).toLocaleTimeString()}
          </p>

          {bonus.photoUrl && (
            <a href={bonus.photoUrl} target="_blank" rel="noopener noreferrer" className="mb-3 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bonus.photoUrl}
                alt="Bonus photo"
                className="max-h-64 w-full rounded-md object-contain bg-black/20"
              />
              <p className="mt-1 text-[11px] text-muted underline">Open full size ↗</p>
            </a>
          )}
          {!bonus.photoUrl && (
            <p className="mb-3 text-[11px] italic text-muted">No photo submitted.</p>
          )}

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
/* Guests                                                                     */
/* -------------------------------------------------------------------------- */

function GuestsTab() {
  const [guests, setGuests] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/guests", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setGuests(data.guests);
      else setError(data.error);
    } catch {
      setError("Could not load guest runs.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setHidden(guestId, hidden) {
    // Optimistic: the toggle should feel instant while HQ works through a list.
    setGuests((gs) => gs.map((g) => (g.id === guestId ? { ...g, hidden } : g)));
    const res = await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, hidden }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || "Could not update that guest.");
      load();
    }
  }

  if (error) {
    return (
      <Panel>
        <p className="text-sm text-rust">{error}</p>
      </Panel>
    );
  }

  if (!guests) {
    return (
      <Panel>
        <p className="text-sm text-muted">Loading guest runs…</p>
      </Panel>
    );
  }

  const finished = guests.filter((g) => g.finishedAt).sort((a, b) => a.elapsedMs - b.elapsedMs);
  const playing = guests.filter((g) => !g.finishedAt);

  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">About guest runs</p>
        <p className="text-xs text-muted">
          Guests play solo in any order and score no points — they only appear on the public
          hall of fame at <span className="font-mono text-gold">/leaderboard</span>, ranked by
          time. Names are filtered on sign-up, but if something slips through, hide it here and it
          comes off the public board immediately.
        </p>
      </Panel>

      <GuestGroup
        title={`Finished (${finished.length})`}
        guests={finished}
        onToggle={setHidden}
        showTime
      />
      <GuestGroup
        title={`Still playing (${playing.length})`}
        guests={playing}
        onToggle={setHidden}
      />
    </div>
  );
}

function GuestGroup({ title, guests, onToggle, showTime }) {
  if (guests.length === 0) return null;

  return (
    <Panel>
      <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
        <Timer className="h-3.5 w-3.5" /> {title}
      </p>
      <ul className="flex flex-col gap-2">
        {guests.map((g) => (
          <li
            key={g.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2"
          >
            <div className="min-w-0">
              <p className={"text-sm " + (g.hidden ? "text-muted line-through" : "text-parchment")}>
                {g.name}
              </p>
              <p className="truncate text-[11px] text-muted">{g.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{g.solved}/7</span>
              {showTime && (
                <span className="font-mono text-sm font-semibold text-gold">
                  {formatElapsed(g.elapsedMs)}
                </span>
              )}
              <button
                onClick={() => onToggle(g.id, !g.hidden)}
                title={g.hidden ? "Show on the public board" : "Hide from the public board"}
                className={
                  "flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition " +
                  (g.hidden
                    ? "border-ink-line text-muted hover:border-gold/60"
                    : "border-rust text-rust hover:bg-rust/10")
                }
              >
                {g.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {g.hidden ? "Unhide" : "Hide"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
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
/* Gate row — explicit Open / Close buttons                                  */
/* -------------------------------------------------------------------------- */

function GateRow({ icon, label, on, onEnable, onDisable }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-line p-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-parchment">
          {icon} {label}
        </p>
        <p className={"mt-0.5 text-xs font-medium " + (on ? "text-forest" : "text-rust")}>
          {on ? "● Open" : "● Closed"}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEnable}
          disabled={on}
          className="rounded-md border border-forest px-3 py-1.5 text-xs font-medium text-forest disabled:opacity-30 hover:bg-forest/10 transition"
        >
          Open
        </button>
        <button
          type="button"
          onClick={onDisable}
          disabled={!on}
          className="rounded-md border border-rust px-3 py-1.5 text-xs font-medium text-rust disabled:opacity-30 hover:bg-rust/10 transition"
        >
          Close
        </button>
      </div>
    </div>
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
