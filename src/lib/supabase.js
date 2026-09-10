import { createClient } from "@supabase/supabase-js";

// Service-role client. This bypasses Row Level Security, so it must only ever
// be imported from server code (API routes / server components) — never from a
// "use client" file. The key is read from a non-NEXT_PUBLIC env var precisely
// so it can never be inlined into the browser bundle.

let cached = null;

export function db() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and fill in " +
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
