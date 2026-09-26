import { db } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { ok, fail, handler, body, throttle, clientKey } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  if (!throttle(clientKey(req))) {
    return fail("Too many attempts. Wait a minute and try again.", 429);
  }

  const { role, teamId, pin } = await body(req);
  const submitted = String(pin ?? "").trim();

  if (!submitted) return fail("Enter your code.");

  /* ---- HQ ---- */
  if (role === "admin") {
    const adminPin = process.env.ADMIN_PIN;
    if (!adminPin) return fail("ADMIN_PIN is not configured on the server.", 500);
    if (submitted !== adminPin) return fail("Incorrect HQ code.", 401);

    const token = await createSessionToken({ role: "admin" });
    const res = ok({ redirect: "/admin" });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  }

  /* ---- Team ---- */
  const teamLoginEnabled = await getSetting("team_login_enabled", "true");
  if (teamLoginEnabled === "false") return fail("Team login is currently closed. Check with HQ.", 403);

  if (!teamId) return fail("Choose your college.");

  const sb = db();
  const { data: team, error } = await sb
    .from("teams")
    .select("id, name, pin, started_at")
    .eq("id", teamId)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!team) return fail("Choose your college.");
  if (team.pin !== submitted) return fail("That passport code doesn't match.", 401);

  // First login starts the clock. Analytics section 9: "start time".
  if (!team.started_at) {
    await sb.from("teams").update({ started_at: new Date().toISOString() }).eq("id", team.id);
  }

  const token = await createSessionToken({ role: "team", teamId: team.id });
  const res = ok({ redirect: "/team" });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
});
