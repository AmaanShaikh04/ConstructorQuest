import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);
  return ok({ view: adminViewFrom(await loadGame()) });
});
