import { guestLeaderboard } from "@/lib/guest";
import { ok, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Public — no session required. Names and times only, never emails. */
export const GET = handler(async () => ok(await guestLeaderboard()));
