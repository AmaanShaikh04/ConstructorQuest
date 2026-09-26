import { requireAdmin } from "@/lib/session";
import { getAllSettings, setSetting } from "@/lib/settings";
import { ok, fail, handler, body } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);
  return ok({ settings: await getAllSettings() });
});

export const POST = handler(async (req) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);
  const { key, value } = await body(req);
  if (!key) return fail("Missing key.");
  try {
    await setSetting(key, value);
  } catch (e) {
    return fail(e.message);
  }
  return ok({});
});
