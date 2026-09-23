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
| `/` | Login — team (college + PIN), guest (name + Constructor email), or HQ (admin PIN) |
| `/team` | Riddle, hint, bonus claim, camera QR scanner, progress, leaderboard |
| `/guest` | Solo free-order play: all remaining riddles, scanner, live run clock |
| `/leaderboard` | **Public** guest hall of fame — fastest full runs. No login |
| `/admin` | Teams & timings, bonus review, final review, penalties & spirit, guests, QR codes, leaderboard, reset |
| `/admin/print` | One printable A4 page per checkpoint with its QR and volunteer briefing |

API routes (all writes go through these, server-side, with the service-role key —
the browser never touches the database directly):

```
POST /api/auth/login          POST /api/team/scan      POST /api/admin/bonus-approve
POST /api/auth/logout         POST /api/team/hint      POST /api/admin/final-approve
POST /api/auth/guest          POST /api/team/bonus     POST /api/admin/penalty
GET  /api/auth/teams          POST /api/team/final     POST /api/admin/spirit
GET  /api/team/state          GET  /api/admin/qr/[id]  POST /api/admin/speed
GET  /api/admin/state         GET  /api/admin/guests   POST /api/admin/guests
GET  /api/guest/state         POST /api/guest/scan     POST /api/admin/reset
GET  /api/leaderboard/guests  (public)
```

---

## Setting it up

You need Node.js 18.18+ (nodejs.org, LTS) and a free Supabase account.

**1. Create the database**

In [supabase.com](https://supabase.com) create a project, open **SQL Editor →
New query**, paste the whole of `supabase/schema.sql`, and run it. That creates
the nine tables, turns on Row Level Security, and seeds the 7 checkpoints and
5 teams with their routes.

> **Already running an older version?** `schema.sql` drops and recreates
> everything, so don't re-run it on a database with real progress in it. Run
> the `supabase/migration-*.sql` files in order instead — `01` adds the guest
> tables and updates the riddles, `02` makes guest codenames unique. Neither
> touches existing team progress.

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

## Guest mode

Anyone with a Constructor email can play solo alongside the college teams.

- **No fixed route.** Guests see every unsolved riddle at once and scan the
  checkpoints in whatever order they reach them.
- **No points, no hints, no bonuses.** The only thing measured is elapsed time
  from sign-up to the seventh scan. Guest runs never touch the team scores.
- **Resumable.** The email address is the identity, so closing the tab or
  switching phones picks the same run back up — the clock keeps running.
- **Assigned codenames.** Guests are given a name like *Swift Heron* rather
  than typing one, so nothing unprintable can reach the public board.
- **Public hall of fame** at `/leaderboard`, ranked by time. Codenames and
  times only; email addresses never leave the server. This is the page to put
  on a projector.

### Codenames, not typed names

Guests never type a name. On sign-up the server assigns one from two curated
word lists in `src/lib/guest-names.js` — *Swift Heron*, *Amber Otter*, *Midnight
Compass* — 64 adjectives x 48 nouns, so 3072 possibilities.

This is deliberate: because no user-supplied text ever reaches the public board,
there is nothing to moderate. A blocklist can be evaded and misfires on real
surnames (*Cuntz*, *Shitole*, *Draper* are all real names); a closed vocabulary
cannot produce anything unprintable at all.

Codenames are **unique** — `guests.display_name` has a unique constraint, and
sign-up retries with a fresh draw on collision. That matters because the public
board shows the codename alone: emails stay on the server, so two identical rows
would be impossible to tell apart. The email is still the real identity
underneath, which is what makes a run resumable and what distinguishes two
people regardless of what they're called.

HQ can still hide any run from the public board via the *Guests* tab, which
lists every codename next to its email address.

Set `GUEST_EMAIL_DOMAINS` to change which domains may play (comma-separated, or
`*` to open it to anyone). Unset, it allows `constructor.university` and
`jacobs-university.de`.

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
- **Rejections give nothing away.** Scanning a valid code that isn't your next
  stop says only that it's wrong and may be useful later — never which
  checkpoint it belongs to, which would otherwise turn wrong scans into a free
  map of the campus.

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
