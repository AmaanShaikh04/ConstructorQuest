// Formatting shared by server and client components. Kept out of guest.js so
// client components can import it without dragging in `server-only`.

/** "1h 04m 12s" / "24m 08s" — the guest leaderboard's unit of comparison. */
export function formatElapsed(ms) {
  if (ms == null) return "—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
}
