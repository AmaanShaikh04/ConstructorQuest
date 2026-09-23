import Link from "next/link";
import { Timer, ArrowLeft } from "lucide-react";
import { guestLeaderboard } from "@/lib/guest";
import { formatElapsed } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hall of Fame — Constructor Quest",
  description: "The fastest solo runs through all seven Constructor Quest checkpoints.",
};

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Public, no login. This is the page to put on a projector at the event, so it
 * carries names and times and nothing else.
 */
export default async function PublicLeaderboardPage() {
  let rows = [];
  let stillPlaying = 0;
  let unavailable = false;

  try {
    const data = await guestLeaderboard(100);
    rows = data.rows;
    stillPlaying = data.stillPlaying;
  } catch {
    unavailable = true;
  }

  return (
    <main className="min-h-dvh bg-ink px-5 py-10">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-xs text-muted hover:text-parchment"
        >
          <ArrowLeft className="h-3 w-3" /> Constructor Quest
        </Link>

        <header className="mb-8">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
            <Timer className="h-3.5 w-3.5" /> Guest hall of fame
          </p>
          <h1 className="mt-1 font-serif text-3xl text-parchment">Fastest full runs</h1>
          <p className="mt-2 text-sm text-muted">
            All seven checkpoints, solo, in any order. Ranked purely on time. These runs are
            separate from the college competition and score no points towards it.
          </p>
        </header>

        {unavailable ? (
          <p className="rounded-lg bg-ink-soft p-4 text-sm text-muted">
            The leaderboard is unavailable right now.
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg bg-ink-soft p-6 text-center">
            <p className="text-sm text-parchment">Nobody has finished yet.</p>
            <p className="mt-1 text-xs text-muted">
              {stillPlaying > 0
                ? `${stillPlaying} ${stillPlaying === 1 ? "person is" : "people are"} out on campus right now.`
                : "Be the first name on the board."}
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-ink-soft px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="w-7 shrink-0 text-center text-lg text-muted">
                    {MEDALS[r.rank - 1] ?? <span className="text-sm">{r.rank}</span>}
                  </span>
                  <span className="truncate text-base text-parchment">{r.name}</span>
                </div>
                <span className="shrink-0 font-mono text-base font-semibold text-gold">
                  {formatElapsed(r.elapsedMs)}
                </span>
              </li>
            ))}
          </ol>
        )}

        {rows.length > 0 && stillPlaying > 0 && (
          <p className="mt-4 text-center text-xs text-muted">
            {stillPlaying} {stillPlaying === 1 ? "run" : "runs"} still in progress.
          </p>
        )}
      </div>
    </main>
  );
}
