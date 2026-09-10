import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
} from "./jwt";

export { SESSION_COOKIE, createSessionToken, verifySessionToken, sessionCookieOptions };

/** Read the current session in a server component or route handler. */
export async function getSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Returns the team id, or null if the caller isn't a logged-in team. */
export async function requireTeam() {
  const s = await getSession();
  return s && s.role === "team" && s.teamId ? s.teamId : null;
}

/** Returns true if the caller is logged in as HQ. */
export async function requireAdmin() {
  const s = await getSession();
  return !!(s && s.role === "admin");
}
