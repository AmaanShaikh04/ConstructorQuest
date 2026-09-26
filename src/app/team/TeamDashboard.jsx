"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trophy, Lightbulb, Clock, PartyPopper, ChevronDown, ChevronUp, Camera, X as XIcon, Timer } from "lucide-react";
import { GoldButton, Panel, Parchment, Stamp, Tabs } from "@/components/ui";
import QrScanner from "@/components/QrScanner";
import Leaderboard from "@/components/Leaderboard";
import { MAX_HINTS, HINT_COST } from "@/lib/scoring";

const POLL_MS = 15_000;
const POLL_WAITING_MS = 3_000;

const COUNTDOWN_S = 10;

export default function TeamDashboard({ initialView, initialLeaderboard, initialCountdownAt, initialGameEndAt }) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [countdownAt, setCountdownAt] = useState(initialCountdownAt ?? null);
  const [gameEndAt, setGameEndAt] = useState(initialGameEndAt ?? null);
  const [now, setNow] = useState(Date.now());
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
        if (data.countdownAt !== undefined) setCountdownAt(data.countdownAt);
        if (data.gameEndAt !== undefined) setGameEndAt(data.gameEndAt ?? null);
      }
    } catch {
      /* offline for a moment — the next tick will catch up */
    }
  }, []);

  useEffect(() => {
    sync(); // fetch fresh state immediately on mount
    const id = setInterval(sync, POLL_MS);
    return () => clearInterval(id);
  }, [sync]);

  // Tick every second for the countdown display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  // Poll faster while waiting for HQ to start so the countdown appears quickly
  const gameStarted = !!(countdownAt || team.startedAt);
  useEffect(() => {
    if (gameStarted) return;
    const id = setInterval(sync, POLL_WAITING_MS);
    return () => clearInterval(id);
  }, [sync, gameStarted]);  // mount sync already handled above

  const countdownSec = countdownAt
    ? Math.max(0, COUNTDOWN_S - Math.floor((now - new Date(countdownAt).getTime()) / 1000))
    : null;
  const showCountdown = countdownSec !== null && countdownSec > 0;

  // Waiting for HQ to start — no countdown has fired yet
  if (!countdownAt) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink text-center px-6">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/40">
          <Timer className="h-7 w-7 text-gold" />
        </div>
        <p className="mb-2 font-serif text-2xl text-parchment">{team.name}</p>
        <p className="mb-1 text-sm text-muted">You are checked in.</p>
        <p className="text-sm text-muted">Waiting for HQ to start the game&hellip;</p>
        <p className="mt-8 text-xs text-muted">This screen updates automatically</p>
        <div className="mt-6 flex gap-4">
          <button onClick={sync} className="text-xs text-muted underline hover:text-parchment">
            Refresh
          </button>
          <button onClick={logout} className="text-xs text-muted underline hover:text-parchment">
            Log out
          </button>
        </div>
      </main>
    );
  }

  if (gameEndAt) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink text-center px-6">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/40">
          <Timer className="h-7 w-7 text-gold" />
        </div>
        <p className="mb-2 font-serif text-2xl text-parchment">{team.name}</p>
        <p className="text-sm text-muted">Waiting for HQ to start the game&hellip;</p>
        <p className="mt-8 text-xs text-muted/50">This screen will update automatically</p>
      </main>
    );
  }

  if (showCountdown) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink text-center px-6">
        <p className="text-xs uppercase tracking-widest text-muted mb-4">Get ready!</p>
        <p className="font-serif text-2xl text-parchment mb-6">{team.name}</p>
        <div className="text-[120px] font-bold leading-none text-gold" style={{ textShadow: "0 0 40px rgba(212,175,55,0.4)" }}>
          {countdownSec}
        </div>
        <p className="mt-6 text-sm text-muted">The quest begins when the timer hits zero</p>
      </main>
    );
  }

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
                  &ldquo;{current.riddle}&rdquo;
                </blockquote>

                <HintBlock
                  current={current}
                  hintsLeft={hintsLeft}
                  busy={busy === "hint"}
                  onUse={() => post("/api/team/hint", {}, "hint")}
                />

                <BonusBlock
                  current={current}
                  busy={busy}
                  onSubmit={(photoUrl) => post("/api/team/bonus", { photoUrl }, "bonus")}
                />

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
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BonusBlock({ current, busy, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(null);   // { file, previewUrl }
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
    setUploadError("");
  }

  function clearPhoto() {
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    setUploadError("");
    let photoUrl = null;

    if (photo) {
      setUploading(true);
      const form = new FormData();
      form.append("photo", photo.file);
      try {
        const res = await fetch("/api/team/bonus-photo", { method: "POST", body: form });
        const data = await res.json();
        if (!data.ok) { setUploadError(data.error || "Upload failed."); setUploading(false); return; }
        photoUrl = data.url;
      } catch {
        setUploadError("Upload failed — check your connection.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    await onSubmit(photoUrl);
  }

  const isBusy = busy === "bonus" || uploading;

  return (
    <div className="mb-4 rounded-md bg-parchment-dim overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button
        className="flex w-full items-center justify-between p-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold text-forest">
          <Sparkles className="h-3.5 w-3.5" /> Bonus challenge (+5)
        </p>
        {current.bonusStatus === "approved" ? (
          <span className="text-xs font-medium text-forest">+5 approved ✓</span>
        ) : current.bonusStatus === "rejected" ? (
          <span className="text-xs text-rust">Rejected</span>
        ) : current.bonusStatus === "pending" ? (
          <span className="text-xs text-forest">Pending HQ…</span>
        ) : open ? (
          <ChevronUp className="h-4 w-4 text-forest" />
        ) : (
          <ChevronDown className="h-4 w-4 text-forest" />
        )}
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-parchment/20 p-3 pt-2">
          <p className="mb-3 text-sm">{current.bonus}</p>

          {current.bonusStatus === "approved" && (
            <p className="text-xs font-medium text-forest">Approved by HQ. +5 awarded.</p>
          )}
          {current.bonusStatus === "rejected" && (
            <p className="text-xs text-rust">HQ didn&apos;t approve this one.</p>
          )}
          {current.bonusStatus === "pending" && (
            <p className="text-xs text-forest">Submitted — waiting on HQ to approve.</p>
          )}

          {!current.bonusStatus && (
            <>
              {/* Photo picker */}
              <div className="mb-3">
                {photo ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt="Bonus photo preview"
                      className="max-h-48 rounded-md object-cover"
                    />
                    <button
                      onClick={clearPhoto}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 rounded-md border border-dashed border-forest/60 px-3 py-2 text-xs text-forest"
                  >
                    <Camera className="h-4 w-4" /> Attach a photo (optional)
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={pickPhoto}
                />
              </div>

              {uploadError && (
                <p className="mb-2 text-xs text-rust">{uploadError}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isBusy}
                className="rounded-md border border-forest px-2.5 py-1.5 text-xs font-medium text-forest disabled:opacity-50"
              >
                {uploading ? "Uploading…" : busy === "bonus" ? "Sending…" : "We did it — submit"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
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

      {!final && (
        <>
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
        <div>
          <p className="mb-1 text-sm text-forest">
            Submitted: &ldquo;{final.answer}&rdquo;
          </p>
          <p className="mt-2 text-sm text-forest">
            Please make your way to the <span className="font-medium text-forest">SCC</span> and wait there. HQ will process and confirm your answer shortly.
          </p>
        </div>
      )}
      {final?.status === "rejected" && (
        <p className="text-sm text-rust">
          Your answer &ldquo;{final.answer}&rdquo; was not accepted. Please speak to HQ at the SCC.
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
