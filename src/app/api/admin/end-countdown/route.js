import { requireAdmin } from "@/lib/session";
import { setSetting } from "@/lib/settings";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);
  await setSetting("game_end_at", new Date().toISOString());
  return ok({});
});
