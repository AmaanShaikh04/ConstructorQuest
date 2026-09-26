import { db } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { validateEmail } from "@/lib/guest-email";
import { generateGuestName } from "@/lib/guest-names";
import { getSetting } from "@/lib/settings";
import { ok, fail, handler, body, throttle, clientKey, isMissingTable } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_INSERT_ATTEMPTS = 5;

const GUEST_SETUP_MESSAGE =
  "Guest mode isn't switched on yet — HQ still needs to run the guest-mode database migration.";

/**
 * Guest sign-in. The email address is the whole form: no PIN, and no name —
 * the server assigns a codename. Coming back with the same email resumes the
 * same run rather than restarting the clock.
 */
export const POST = handler(async (req) => {
  if (!throttle(clientKey(req))) {
    return fail("Too many attempts. Wait a minute and try again.", 429);
  }

  const guestLoginEnabled = await getSetting("guest_login_enabled", "false");
  if (guestLoginEnabled === "false") return fail("Guest login is not open yet. Check back later.", 403);

  const email = validateEmail((await body(req)).email);
  if (!email.ok) return fail(email.error);

  const sb = db();
  const { data: existing, error: lookupError } = await sb
    .from("guests")
    .select("id, display_name")
    .eq("email", email.value)
    .maybeSingle();

  if (lookupError) {
    if (isMissingTable(lookupError)) return fail(GUEST_SETUP_MESSAGE, 503);
    return fail(lookupError.message, 500);
  }

  // Returning player: pick up where they left off, clock still running, same
  // codename as before.
  if (existing) return signIn(existing.id, { returning: true, name: existing.display_name });

  // New player. Codenames are unique so the public board stays readable, which
  // means a collision is possible when two people sign up at once — retry with
  // a fresh name rather than failing them.
  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
    const { data: usedNames, error: namesError } = await sb.from("guests").select("display_name");
    if (namesError) return fail(namesError.message, 500);

    const name = generateGuestName(new Set(usedNames.map((g) => g.display_name)));

    const { data: created, error } = await sb
      .from("guests")
      .insert({
        display_name: name,
        email: email.value,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!error) return signIn(created.id, { returning: false, name });

    if (error.code !== "23505") return fail(error.message, 500);

    // Unique violation. If it was the email, someone else's request for this
    // same address won the race — join their run. Otherwise it was the
    // codename, so loop round and draw another.
    const { data: raced } = await sb
      .from("guests")
      .select("id, display_name")
      .eq("email", email.value)
      .maybeSingle();
    if (raced) return signIn(raced.id, { returning: true, name: raced.display_name });
  }

  return fail("Couldn't start a run just now. Try again in a moment.", 503);
});

async function signIn(guestId, extra) {
  const token = await createSessionToken({ role: "guest", guestId });
  const res = ok({ redirect: "/guest", ...extra });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
