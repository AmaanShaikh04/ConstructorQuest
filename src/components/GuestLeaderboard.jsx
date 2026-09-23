"use client";

import { Timer } from "lucide-react";
import { Panel } from "@/components/ui";
import { formatElapsed } from "@/lib/format";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * The guest hall of fame: who finished all seven fastest. Names and times only
 * — no emails, and nothing HQ has hidden.
 */
export default function GuestLeaderboard({ rows, stillPlaying, highlight }) {
  return (
    <Panel>
      <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
        <Timer className="h-3.5 w-3.5" /> Fastest full runs
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          Nobody has finished all seven yet. Be the first name on the board.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={
                "flex items-center justify-between rounded-md px-3 py-2.5 " +
                (r.id === highlight
                  ? "border border-gold bg-gold/15"
                  : "border border-transparent bg-white/5")
              }
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-center text-sm text-muted">
                  {MEDALS[r.rank - 1] ?? r.rank}
                </span>
                <span className="truncate text-sm text-parchment">
                  {r.name}
                  {r.id === highlight && <span className="ml-1.5 text-[10px] text-gold">you</span>}
                </span>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-gold">
                {formatElapsed(r.elapsedMs)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-3 text-[11px] text-muted">
        {stillPlaying > 0
          ? `${stillPlaying} other ${stillPlaying === 1 ? "person is" : "people are"} out there right now. `
          : ""}
        Everyone gets an assigned codename. Guest runs are for fun — they score no points and
        don&apos;t affect the college standings.
      </p>
    </Panel>
  );
}
