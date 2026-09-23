#!/usr/bin/env node
/**
 * Pre-flight check: confirms the environment variables are set, the Supabase
 * project is reachable, and the schema has been run with its seed data.
 *
 *   npm run check
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const problems = [];
const notes = [];

function need(name, extra = "") {
  const value = process.env[name];
  if (!value) problems.push(`${name} is not set. ${extra}`.trim());
  return value;
}

const url = need("NEXT_PUBLIC_SUPABASE_URL", "Copy it from Supabase → Project Settings → API.");
const key = need("SUPABASE_SERVICE_ROLE_KEY", "Use the service_role key, not the anon key.");
need("ADMIN_PIN", "Pick the code HQ will type in.");
const secret = process.env.SESSION_SECRET;

if (!secret) {
  problems.push("SESSION_SECRET is not set.");
} else if (secret.length < 32) {
  problems.push(`SESSION_SECRET is only ${secret.length} characters. Use at least 32.`);
} else if (secret.includes("change-me")) {
  problems.push("SESSION_SECRET is still the placeholder from .env.example.");
}

if (key?.startsWith("eyJ") && key.includes("anon")) {
  notes.push("SUPABASE_SERVICE_ROLE_KEY looks like the anon key — writes will be blocked by RLS.");
}

if (problems.length) {
  console.error("\n✗ Configuration problems:\n");
  for (const p of problems) console.error("  · " + p);
  console.error("\nFix these in .env.local, then run npm run check again.\n");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const expected = {
  teams: 5,
  checkpoints: 7,
};

let failed = false;

for (const [table, count] of Object.entries(expected)) {
  const { data, error } = await sb.from(table).select("id");
  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    failed = true;
    continue;
  }
  if (data.length !== count) {
    console.error(`✗ ${table}: found ${data.length} rows, expected ${count}. Re-run supabase/schema.sql.`);
    failed = true;
  } else {
    console.log(`✓ ${table}: ${data.length} rows`);
  }
}

for (const table of [
  "team_progress",
  "hints_used",
  "bonus_submissions",
  "final_submissions",
  "penalties",
  "guests",
  "guest_progress",
]) {
  const { data, error } = await sb.from(table).select("id");
  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    failed = true;
  } else {
    console.log(`✓ ${table}: reachable (${data.length} rows)`);
  }
}

// Every team's route must be a permutation of the seven checkpoints, or a team
// would reach a dead end mid-hunt.
const { data: teams } = await sb.from("teams").select("id, name, route");
const { data: checkpoints } = await sb.from("checkpoints").select("id");
if (teams && checkpoints) {
  const valid = new Set(checkpoints.map((c) => c.id));
  for (const t of teams) {
    const route = t.route || [];
    const unique = new Set(route);
    const bad =
      route.length !== valid.size ||
      unique.size !== route.length ||
      route.some((id) => !valid.has(id));
    if (bad) {
      console.error(`✗ ${t.name}: route is not a valid ordering of all ${valid.size} checkpoints.`);
      failed = true;
    }
  }
  if (!failed) console.log(`✓ routes: all ${teams.length} teams have a complete, valid route`);
}

for (const n of notes) console.warn("! " + n);

if (failed) {
  console.error("\nSomething isn't ready. See above.\n");
  process.exit(1);
}

console.log("\nAll good. Run npm run dev.\n");
