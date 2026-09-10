"use client";

import { Trophy } from "lucide-react";
import { Panel } from "@/components/ui";

export default function Leaderboard({ rows, highlight }) {
  return (
    <Panel>
      <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
        <Trophy className="h-3.5 w-3.5" /> Standings
      </p>
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
            <div className="flex items-center gap-3">
              <span className="w-5 text-center text-sm text-muted">{r.rank}</span>
              <span className="text-sm text-parchment">
                {r.name}
                {r.id === highlight && <span className="ml-1.5 text-[10px] text-gold">you</span>}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{r.completed}/7</span>
              <span className="w-10 text-right text-sm font-semibold text-gold">{r.score}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-muted">
        Scores update as HQ approves bonuses and awards spirit points, so the order can still move
        after a team finishes.
      </p>
    </Panel>
  );
}
