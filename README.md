# Constructor Quest

The real website for the Constructor University Uni Games 2026 campus scavenger
hunt, built to `../constructor-quest-website-plan.md`.

Next.js 15 (App Router) · TailwindCSS · Supabase (Postgres) · deployed on Vercel.

Unlike the `campus-quest-standalone` prototype in the parent folder, this one has
a real shared database — five phones out on campus all see the same live game.

---

## What's here

| Route | What it is |
|---|---|
| `/` | Login — team (college + PIN) or HQ (admin PIN) |
| `/team` | Riddle, hint, bonus claim, camera QR scanner, progress, leaderboard |
| `/admin` | Teams & timings, bonus review, final review, penalties & spirit, QR codes, leaderboard, reset |
| `/admin/print` | One printable A4 page per checkpoint with its QR and volunteer briefing |

API routes (all writes go through these, server-side, with the service-role key —
the browser never touches the database directly):

```
POST /api/auth/login          POST /api/team/scan     POST /api/admin/bonus-approve
POST /api/auth/logout         POST /api/team/hint     POST /api/admin/final-approve
GET  /api/auth/teams          POST /api/team/bonus    POST /api/admin/penalty
GET  /api/team/state          POST /api/team/final    POST /api/admin/spirit
GET  /api/admin/state         GET  /api/admin/qr/[id] POST /api/admin/speed
                                                      POST /api/admin/reset
```

---

## Setting it up

You need Node.js 18.18+ (nodejs.org, LTS) and a free Supabase account.

**1. Create the database**

In [supabase.com](https://supabase.com) create a project, open **SQL Editor →
New query**, paste the whole of `supabase/schema.sql`, and run it. That creates
the seven tables, turns on Row Level Security, and seeds the 7 checkpoints and
5 teams with their routes.

**2. Configure the app**

```bash
cd constructor-quest
copy .env.example .env.local      # macOS/Linux: cp .env.example .env.local
```

Fill in `.env.local` from Supabase → **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — the project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** key (not `anon`)
- `ADMIN_PIN` — the HQ code. Lives only here, never in the database.
- `SESSION_SECRET` — a long random string:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**3. Run it**

```bash
npm install
npm run check
npm run dev
```

`npm run check` confirms the env vars are sane, the database is reachable, all
seven checkpoints and five teams exist, and every team's route is a complete
ordering of the seven checkpoints. Then open http://localhost:3000.

---

## Logins

Seeded team codes: Merc `1234` · Krupp `2345` · Nordmetall College `3456` ·
C3 `4567` · Off-Campus `5678`. HQ uses whatever you set as `ADMIN_PIN`.

**Rotate all six before the event**, since these are written down in the plan
and the schema file. Team PINs live in the `teams` table:

```sql
update teams set pin = '8241' where id = 'merc';
```

---

## Deploying to Vercel

1. Push this folder to GitHub.
2. In Vercel, **New Project** → import the repo. If `constructor-quest` is a
   subfolder, set **Root Directory** to it.
3. Add all four environment variables under **Settings → Environment Variables**
   (Production *and* Preview).
4. Deploy.

The camera scanner only works over HTTPS — which Vercel gives you, but plain
`http://<laptop-ip>:3000` on a phone will not. To test the camera on a real
phone before deploying, use a preview deployment rather than the dev server.

---

## How the game is protected

- **Routing is enforced server-side.** `/api/team/scan` works out the team's own
  next unfinished checkpoint and only accepts that checkpoint's code. Scanning a
  QR you saw on another team's phone gets a clear rejection, not a skip ahead.
- **Hints are not in the page source.** A checkpoint's hint is only sent to the
  browser after the team has spent one of its three hints on it.
- **QR codes are HQ-only.** `/api/admin/qr/[id]` requires an HQ session, so the
  images can't be fetched by a team poking at the network tab.
- **PINs are never public.** RLS is on for every table; `teams` and `checkpoints`
  have no public read policy at all, and the anon key has no write access
  anywhere. Every write goes through a route handler using the service-role key.
- **Sessions are signed cookies** (`jose`, HS256, httpOnly, 12-hour expiry) — no
  email, no passwords, nothing to reset on event day.
- **Scan → confirm → submit.** The scanner shows the decoded value and waits. A
  team standing at the wrong checkpoint notices before anything is recorded.

## Scoring

Computed live from raw event rows on every read — never stored as a running
total — so retroactive HQ adjustments are always reflected immediately.

| Source | Points |
|---|---|
| Each checkpoint reached | +10 (max 70) |
| Bonus challenge, HQ-approved | +5 each (max 35) |
| Final challenge, HQ-approved | +20 |
| Team spirit (HQ discretion) | 0–20 |
| Speed bonus, 1st–5th | +25 / +20 / +15 / +10 / +5 |
| Hint used | −5 each (3 max per team) |
| Sharing answers | −10 |
| Unsportsmanlike conduct / disrespect / interference | −20 each |
| QR tampering | Disqualification (handled at HQ, not in the app) |

Speed ranks are exclusive: giving 1st place to a second team clears it from the
first, so the same +25 can't be awarded twice by accident.

---

## Event-day checklist

- [ ] Rotate the five team PINs and `ADMIN_PIN`.
- [ ] `/admin/print` → print and laminate the seven QR sheets.
- [ ] Assign a volunteer per checkpoint; they hold the sheet, never hand it over.
- [ ] Rehearsal run on campus wifi with a few phones, then **Reset** tab → type
      `RESET` to clear it.
- [ ] Confirm the camera prompt on both iOS Safari and Android Chrome, on the
      deployed HTTPS address.
- [ ] Give each team a phone with the deployed URL already open.

## Still open from the plan

These were listed as open items and are deliberately not built:

- Pre-event team registration flow (teams are seeded directly in the database).
- The actual event date, registration deadline and team-size limits.
- The final-challenge answer key — HQ judges submissions by eye in the
  **Final challenge** tab, which is what the plan describes.
