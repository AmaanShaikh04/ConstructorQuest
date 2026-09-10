"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trophy, Lightbulb, Clock, PartyPopper } from "lucide-react";
import { GoldButton, Panel, Parchment, Stamp, Tabs } from "@/components/ui";
import QrScanner from "@/components/QrScanner";
import Leaderboard from "@/components/Leaderboard";
import { MAX_HINTS, HINT_COST } from "@/lib/scoring";

const POLL_MS = 15_000;

export default function TeamDashboard({ initialView, initialLeaderboard }) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [tab, setTab] = useState("quest");
  const [celebrate, setCelebrate] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [finalText, setFinalText] = useState("");

  /* The leaderboard moves while a team is out walking, so refresh it quietly
     in the background rather than making them pull to refresh. */
  const sync = useCallback(async () => {
    try {
      const res = await fetch("/api/team/state", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setView(data.view);
        setLeaderboard(data.leaderboard);
      }
    } catch {
      /* offline for a moment — the next tick will catch up */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(sync, POLL_MS);
    return () => clearInterval(id);
  }, [sync]);

  // `quiet` hands the error back to the caller instead of showing it at the top
  // of the page — the scanner renders its own message next to the code.
  async function post(url, payload, key, quiet = false) {
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
        if (data.leaderboard) setLeaderboard(data.leaderboard);
      } else if (!quiet) {
        setError(data.error || "That didn't work.");
      }
      return data;
    } catch {
      const message = "No connection. Move somewhere with signal and try again.";
      if (!quiet) setError(message);
      return { ok: false, error: message };
    } finally {
      setBusy("");
    }
  }

  async function handleScan(code) {
    const data = await post("/api/team/scan", { code }, "scan", true);
    if (data.ok && data.checkpoint) {
      setCelebrate(data.checkpoint);
      setTimeout(() => setCelebrate(null), 6000);
    }
    return data;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const { team, current, stamps, allDone, hintsLeft, words, final } = view;

  return (
    <main className="min-h-dvh bg-ink">
      <div className="mx-auto max-w-lg px-5 pb-20 pt-6">
        <header className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Team passport</p>
            <h1 className="font-serif text-xl text-parchment">{team.name}</h1>
          </div>
          <button onClick={logout} className="text-xs text-muted hover:text-parchment">
            Log out
          </button>
        </header>

        <Tabs
          tabs={[
            ["quest", "Quest"],
            ["progress", "Progress"],
            ["leaderboard", "Leaderboard"],
          ]}
          active={tab}
          onChange={setTab}
        />

        {celebrate && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-gold bg-gold/15 p-4">
            <PartyPopper className="h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="text-sm font-semibold text-parchment">
                {celebrate.name} stamped. +10 points.
              </p>
              <p className="text-xs text-muted">
                Your word for this checkpoint is{" "}
                <span className="font-semibold text-gold">{celebrate.word}</span> — write it down.
              </p>
            </div>
          </div>
        )}

        {tab === "quest" && (
          <>
            <StampRow stamps={stamps} completed={view.completedCount} score={team.score} />

            {error && (
              <p className="mb-4 rounded-md bg-rust/15 px-3 py-2 text-xs text-[#e08b78]" role="alert">
                {error}
              </p>
            )}

            {!allDone && current && (
              <Parchment>
                <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">
                  Checkpoint {current.position} of {view.totalCheckpoints}
                </p>
                <blockquote className="mb-4 font-serif text-lg leading-snug">
                  “{current.riddle}”
                </blockquote>

                <HintBlock
                  current={current}
                  hintsLeft={hintsLeft}
                  busy={busy === "hint"}
                  onUse={() => post("/api/team/hint", {}, "hint")}
                />

                <div className="mb-4 rounded-md bg-parchment-dim p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-forest">
                    <Sparkles className="h-3.5 w-3.5" /> Bonus challenge (+5)
                  </p>
                  <p className="mb-2 text-sm">{current.bonus}</p>
                  {current.bonusStatus === "approved" ? (
                    <p className="text-xs font-medium text-forest">Approved by HQ. +5 awarded.</p>
                  ) : current.bonusStatus === "rejected" ? (
                    <p className="text-xs text-rust">HQ didn&apos;t approve this one.</p>
                  ) : current.bonusStatus === "pending" ? (
                    <p className="text-xs text-forest">Submitted — waiting on HQ to approve.</p>
                  ) : (
                    <button
                      onClick={() => post("/api/team/bonus", {}, "bonus")}
                      disabled={busy === "bonus"}
                      className="rounded-md border border-forest px-2.5 py-1.5 text-xs font-medium text-forest disabled:opacity-50"
                    >
                      {busy === "bonus" ? "Sending…" : "We did it"}
                    </button>
                  )}
                </div>

                <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">
                  At the checkpoint, scan the volunteer&apos;s QR
                </p>
                <QrScanner onSubmit={handleScan} disabled={busy === "scan"} />
              </Parchment>
            )}

            {allDone && (
              <FinalChallenge
                words={words}
                final={final}
                finalText={finalText}
                setFinalText={setFinalText}
                busy={busy === "final"}
                onSubmit={() => post("/api/team/final", { answer: finalText }, "final")}
              />
            )}
          </>
        )}

        {tab === "progress" && <ProgressPanel view={view} />}
        {tab === "leaderboard" && <Leaderboard rows={leaderboard} highlight={team.id} />}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function StampRow({ stamps, completed, score }) {
  return (
    <Panel className="mb-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-[#c3c9db]">Checkpoints</span>
        <span className="text-xs font-semibold text-gold">
          {completed} / 7 · {score} pts
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {stamps.map((s) => (
          <div key={s.id} className="flex w-[44px] flex-col items-center gap-1">
            <Stamp filled={!!s.completedAt} current={s.isCurrent} />
            <span className="text-center text-[10px] leading-tight text-muted">{s.name}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HintBlock({ current, hintsLeft, busy, onUse }) {
  if (current.hintRevealed) {
    return (
      <p className="mb-4 flex items-start gap-1.5 text-xs italic text-rust">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Hint: {current.hint}</span>
      </p>
    );
  }
  if (hintsLeft <= 0) {
    return <p className="mb-4 text-xs text-[#8b8266]">No hints left — you&apos;re on your own.</p>;
  }
  return (
    <button
      onClick={onUse}
      disabled={busy}
      className="mb-4 flex items-center gap-1.5 text-xs text-rust underline disabled:opacity-50"
    >
      <Lightbulb className="h-3.5 w-3.5" />
      {busy ? "Revealing…" : `Use a hint (−${HINT_COST} pts, ${hintsLeft} of ${MAX_HINTS} left)`}
    </button>
  );
}

function FinalChallenge({ words, final, finalText, setFinalText, busy, onSubmit }) {
  return (
    <Parchment>
      <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-forest">
        <Trophy className="h-4 w-4" /> All seven checkpoints complete
      </p>
      <p className="mb-3 text-sm">Your words, in the order you found them:</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold-deep"
          >
            {w}
          </span>
        ))}
      </div>

      {(!final || final.status === "rejected") && (
        <>
          {final?.status === "rejected" && (
            <p className="mb-3 text-xs text-rust">
              HQ says that isn&apos;t it. Have another go — “{final.answer}” didn&apos;t land.
            </p>
          )}
          <label htmlFor="final" className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">
            Arrange them into your final answer
          </label>
          <input
            id="final"
            className="field mb-3"
            value={finalText}
            onChange={(e) => setFinalText(e.target.value)}
            placeholder="Your final phrase"
          />
          <GoldButton disabled={busy || !finalText.trim()} onClick={onSubmit}>
            {busy ? "Sending…" : "Submit final answer"}
          </GoldButton>
        </>
      )}

      {final?.status === "pending" && (
        <p className="text-sm text-forest">
          Submitted: “{final.answer}” — waiting on HQ to confirm.
        </p>
      )}
      {final?.status === "approved" && (
        <p className="text-sm font-semibold text-forest">
          Confirmed correct. +20 awarded — go find HQ.
        </p>
      )}
    </Parchment>
  );
}

function ProgressPanel({ view }) {
  const { stamps, team, penalties, bonuses, hintsUsed } = view;
  const approved = bonuses.filter((b) => b.status === "approved").length;
  const pending = bonuses.filter((b) => b.status === "pending").length;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
          <Clock className="h-3.5 w-3.5" /> Your route
        </p>
        <ol className="flex flex-col gap-2">
          {stamps.map((s, i) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-4 text-xs text-muted">{i + 1}</span>
                <span className={s.completedAt ? "text-parchment" : "text-muted"}>
                  {s.completedAt ? s.name : s.isCurrent ? "Current riddle" : "Locked"}
                </span>
                {s.word && <span className="text-xs text-gold">· {s.word}</span>}
              </span>
              <span className="text-xs text-muted">
                {s.completedAt ? new Date(s.completedAt).toLocaleTimeString() : "—"}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel>
        <p className="mb-3 text-xs uppercase tracking-wider text-gold">Score</p>
        <dl className="flex flex-col gap-1.5 text-sm">
          <Row label="Checkpoints reached" value={`${view.completedCount} × 10`} />
          <Row label="Bonuses approved" value={`${approved} × 5${pending ? ` (${pending} pending)` : ""}`} />
          <Row label="Final challenge" value={view.final?.status === "approved" ? "+20" : "—"} />
          <Row label="Team spirit" value={team.teamSpirit ? `+${team.teamSpirit}` : "—"} />
          <Row label="Speed bonus" value={team.speedRank ? `rank ${team.speedRank}` : "not yet"} />
          <Row label="Hints used" value={hintsUsed ? `−${hintsUsed * HINT_COST}` : "0"} />
          <Row
            label="Penalties"
            value={penalties.length ? `−${penalties.reduce((s, p) => s + p.points, 0)}` : "none"}
          />
          <div className="mt-2 flex justify-between border-t border-ink-line pt-2">
            <dt className="text-sm font-semibold text-parchment">Total</dt>
            <dd className="text-sm font-bold text-gold">{team.score}</dd>
          </div>
        </dl>
        {penalties.length > 0 && (
          <ul className="mt-3 flex flex-col gap-0.5">
            {penalties.map((p) => (
              <li key={p.id} className="text-[11px] text-rust">
                {p.label} · −{p.points} · {new Date(p.createdAt).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="text-parchment">{value}</dd>
    </div>
  );
}
