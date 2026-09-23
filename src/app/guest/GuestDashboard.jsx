"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer, PartyPopper, Trophy, MapPin } from "lucide-react";
import { Panel, Parchment, Stamp, Tabs } from "@/components/ui";
import QrScanner from "@/components/QrScanner";
import GuestLeaderboard from "@/components/GuestLeaderboard";
import { formatElapsed } from "@/lib/format";

const POLL_MS = 20_000;

export default function GuestDashboard({ initialView, initialLeaderboard }) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [tab, setTab] = useState("quest");
  const [celebrate, setCelebrate] = useState(null);
  const [busy, setBusy] = useState(false);

  const sync = useCallback(async () => {
    try {
      const res = await fetch("/api/guest/state", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setView(data.view);
        setLeaderboard(data.leaderboard);
      }
    } catch {
      /* the next tick will catch up */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(sync, POLL_MS);
    return () => clearInterval(id);
  }, [sync]);

  async function handleScan(code) {
    setBusy(true);
    try {
      const res = await fetch("/api/guest/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setView(data.view);
        setLeaderboard(data.leaderboard);
        if (data.checkpoint) {
          setCelebrate(data.checkpoint);
          setTimeout(() => setCelebrate(null), 6000);
        }
      }
      return data;
    } catch {
      return { ok: false, error: "No connection. Move somewhere with signal and try again." };
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const { guest, solved, open, allDone, solvedCount, totalCheckpoints, words } = view;

  return (
    <main className="min-h-dvh bg-ink">
      <div className="mx-auto max-w-lg px-5 pb-20 pt-6">
        <header className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Your codename</p>
            <h1 className="font-serif text-xl text-parchment">{guest.name}</h1>
            <p className="mt-0.5 text-[11px] text-muted">
              This is how you appear on the public board.
            </p>
          </div>
          <button onClick={logout} className="text-xs text-muted hover:text-parchment">
            Log out
          </button>
        </header>

        <RunClock guest={guest} solvedCount={solvedCount} total={totalCheckpoints} />

        <Tabs
          tabs={[
            ["quest", "Riddles"],
            ["leaderboard", "Fastest runs"],
          ]}
          active={tab}
          onChange={setTab}
        />

        {celebrate && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-gold bg-gold/15 p-4">
            <PartyPopper className="h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="text-sm font-semibold text-parchment">{celebrate.name} found.</p>
              <p className="text-xs text-muted">
                Your word here is <span className="font-semibold text-gold">{celebrate.word}</span>.
              </p>
            </div>
          </div>
        )}

        {tab === "quest" && (
          <>
            {allDone ? (
              <Parchment className="mb-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-forest">
                  <Trophy className="h-4 w-4" /> All seven found
                </p>
                <p className="mb-3 text-sm">
                  Finished in{" "}
                  <span className="font-semibold">{formatElapsed(guest.elapsedMs)}</span>. Your
                  words, in the order you found them:
                </p>
                <div className="flex flex-wrap gap-2">
                  {words.map((w, i) => (
                    <span
                      key={`${w}-${i}`}
                      className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold-deep"
                    >
                      {w}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[#8b8266]">
                  Work out what they spell and go tell HQ — guest runs score no points, but
                  bragging rights are free.
                </p>
              </Parchment>
            ) : (
              <Parchment className="mb-5">
                <p className="mb-2 text-xs uppercase tracking-wider text-ink-soft">
                  Scan any checkpoint you reach
                </p>
                <QrScanner onSubmit={handleScan} disabled={busy} />
              </Parchment>
            )}

            {open.length > 0 && (
              <Panel className="mb-4">
                <p className="mb-3 text-xs uppercase tracking-wider text-gold">
                  {open.length} riddle{open.length === 1 ? "" : "s"} left — solve them in any order
                </p>
                <ol className="flex flex-col gap-4">
                  {open.map((cp, i) => (
                    <li
                      key={cp.id}
                      className="border-b border-ink-line pb-4 last:border-0 last:pb-0"
                    >
                      <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
                        Riddle {i + 1}
                      </p>
                      <p className="font-serif text-base leading-snug text-parchment">
                        &ldquo;{cp.riddle}&rdquo;
                      </p>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}

            {solved.length > 0 && (
              <Panel>
                <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
                  <MapPin className="h-3.5 w-3.5" /> Found so far
                </p>
                <ul className="flex flex-col gap-2">
                  {solved.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Stamp filled />
                        <span className="text-parchment">{s.name}</span>
                        <span className="text-xs text-gold">· {s.word}</span>
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(s.completedAt).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}

        {tab === "leaderboard" && (
          <GuestLeaderboard
            rows={leaderboard.rows}
            stillPlaying={leaderboard.stillPlaying}
            highlight={guest.id}
          />
        )}
      </div>
    </main>
  );
}

/** A live-ticking clock, since elapsed time is the only thing being measured. */
function RunClock({ guest, solvedCount, total }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (guest.finishedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [guest.finishedAt]);

  const elapsed = guest.finishedAt ? guest.elapsedMs : now - new Date(guest.startedAt).getTime();

  return (
    <Panel className="mb-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-[#c3c9db]">
          <Timer className="h-3.5 w-3.5" />
          {guest.finishedAt ? "Final time" : "Running time"}
        </span>
        <span className="font-mono text-lg font-semibold text-gold">{formatElapsed(elapsed)}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${(solvedCount / total) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {solvedCount} of {total} checkpoints · guest runs score no points
      </p>
    </Panel>
  );
}
