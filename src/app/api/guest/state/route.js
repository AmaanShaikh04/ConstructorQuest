import { requireGuest } from "@/lib/session";
import { loadGuestRun, guestViewFrom, guestLeaderboard } from "@/lib/guest";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const guestId = await requireGuest();
  if (!guestId) return fail("Not signed in.", 401);

  const run = await loadGuestRun(guestId);
  if (!run) return fail("Guest not found.", 404);

  return ok({ view: guestViewFrom(run), leaderboard: await guestLeaderboard() });
});
