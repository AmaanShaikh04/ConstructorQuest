import { NextResponse } from "next/server";

export function ok(data = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function fail(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Wrap a handler so an unexpected throw becomes a clean 500 instead of HTML. */
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      console.error("[api]", e);
      return fail(e?.message || "Something went wrong.", 500);
    }
  };
}

export async function body(req) {
  try {
    return (await req.json()) || {};
  } catch {
    return {};
  }
}

/* --------------------------------------------------------------------------
 * A very small in-memory throttle for the login endpoint. Not a substitute for
 * a real rate limiter, but it stops someone brute-forcing a 4-digit PIN from a
 * laptop in the canteen. Per-process, so it resets on redeploy — fine for a
 * one-day event.
 * ------------------------------------------------------------------------ */

const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 12;

export function throttle(key) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_ATTEMPTS;
}

export function clientKey(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * True when Supabase is reporting that a table doesn't exist — almost always
 * because a migration hasn't been run yet, which is worth saying plainly
 * instead of leaking "schema cache" at someone standing on campus.
 */
export function isMissingTable(error) {
  if (!error) return false;
  return error.code === "PGRST205" || /Could not find the table/i.test(error.message || "");
}
