-- Constructor Quest — database schema
-- Run this in the Supabase SQL editor (project → SQL → New query → Run).
-- Safe to re-run: it drops and recreates everything.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

drop table if exists guest_progress cascade;
drop table if exists guests cascade;
drop table if exists penalties cascade;
drop table if exists final_submissions cascade;
drop table if exists bonus_submissions cascade;
drop table if exists hints_used cascade;
drop table if exists team_progress cascade;
drop table if exists checkpoints cascade;
drop table if exists teams cascade;
drop table if exists game_settings cascade;

create table teams (
  id          text primary key,
  name        text not null,
  short_name  text not null,
  pin         text not null,
  route       jsonb not null,              -- ordered array of checkpoint ids
  team_spirit int  not null default 0,     -- 0-20, HQ discretion
  speed_rank  int,                         -- 1-5, HQ assigned
  started_at  timestamptz,                 -- set on the team's first login
  sort_order  int  not null default 0
);

create table checkpoints (
  id              text primary key,
  name            text not null,
  full_name       text not null,
  riddle          text not null,
  hint            text not null,
  bonus_challenge text not null,
  word            text not null,
  qr_code         text not null unique,
  spot            text,
  sort_order      int  not null default 0
);

create table team_progress (
  id           bigserial primary key,
  team_id      text not null references teams(id) on delete cascade,
  checkpoint_id text not null references checkpoints(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (team_id, checkpoint_id)
);

create table hints_used (
  id           bigserial primary key,
  team_id      text not null references teams(id) on delete cascade,
  checkpoint_id text not null references checkpoints(id) on delete cascade,
  used_at      timestamptz not null default now(),
  unique (team_id, checkpoint_id)
);

create table bonus_submissions (
  id           bigserial primary key,
  team_id      text not null references teams(id) on delete cascade,
  checkpoint_id text not null references checkpoints(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  approved_at  timestamptz,
  photo_url    text,
  unique (team_id, checkpoint_id)
);

create table final_submissions (
  id           bigserial primary key,
  team_id      text not null references teams(id) on delete cascade,
  answer       text not null,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  approved_at  timestamptz,
  unique (team_id)
);

create table penalties (
  id         bigserial primary key,
  team_id    text not null references teams(id) on delete cascade,
  label      text not null,
  points     int  not null,               -- positive number, subtracted from score
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Guest mode
--
-- Anyone with a Constructor email can play solo, in whatever order they happen
-- to find the checkpoints. Guests score no points and never touch the team
-- game; they are ranked purely on how long the full seven took them.
--
-- Guests never type a name: the server assigns a codename, so no user text ever
-- reaches the public board. display_name is unique because the board shows
-- codenames alone (emails stay private), and two identical rows would be
-- impossible to tell apart.
-- ---------------------------------------------------------------------------

create table guests (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null unique,       -- server-assigned codename, e.g. "Swift Heron"
  email        text not null unique,        -- stored lowercased; never shown publicly
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,                 -- set when the 7th checkpoint lands
  hidden       boolean not null default false,  -- HQ can pull a name off the board
  created_at   timestamptz not null default now()
);

create table guest_progress (
  id            bigserial primary key,
  guest_id      uuid not null references guests(id) on delete cascade,
  checkpoint_id text not null references checkpoints(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (guest_id, checkpoint_id)
);

create index on guest_progress (guest_id);
create index on guests (finished_at);

create table game_settings (
  key   text primary key,
  value text
);

insert into game_settings (key, value) values
  ('team_login_enabled',       'true'),
  ('guest_login_enabled',      'false'),
  ('live_leaderboard_visible', 'false'),
  ('countdown_at',              null);

create index on team_progress (team_id);
create index on hints_used (team_id);
create index on bonus_submissions (team_id);
create index on penalties (team_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Every write in this app goes through a server-side API route using the
-- service-role key, which bypasses RLS. The anon key therefore needs no write
-- access at all, and only enough read access for the public leaderboard.
--
-- `teams` (holds PINs) and `checkpoints` (holds riddles, hints and QR codes)
-- get NO public policy — nothing readable with the anon key.
-- ---------------------------------------------------------------------------

alter table teams             enable row level security;
alter table checkpoints       enable row level security;
alter table team_progress     enable row level security;
alter table hints_used        enable row level security;
alter table bonus_submissions enable row level security;
alter table final_submissions enable row level security;
alter table penalties         enable row level security;
alter table guests            enable row level security;
alter table guest_progress    enable row level security;

create policy "public read" on team_progress     for select using (true);
create policy "public read" on hints_used        for select using (true);
create policy "public read" on bonus_submissions for select using (true);
create policy "public read" on penalties         for select using (true);
-- final_submissions stays private: the answers are the answers.
-- `guests` holds email addresses, so it gets no public policy either. The
-- public hall of fame is served by a route handler that returns names and
-- times only.

-- ---------------------------------------------------------------------------
-- Seed data — 7 checkpoints
-- ---------------------------------------------------------------------------

insert into checkpoints (id, name, full_name, riddle, hint, bonus_challenge, word, qr_code, sort_order) values
('irc', 'IRC', 'Information Resource Center (Library)',
 'I am filled with voices that have never spoken, and I punish anyone who does. Take a piece of me away and I will count every single day until it comes back.',
 'Look for us at the Coffee Bar inside the library.',
 'Pretend everyone in your team is studying for finals.',
 'It', 'CQ-X7K2M4P9', 1),

('green', 'Campus Green', 'The diamond-shaped lawn at the heart of campus',
 'I have four corners and not one wall. Every path here is a polite detour around my middle, and the shortest way across campus is straight through me.',
 'Find us near the Interfaith House on the green.',
 'Form a human diamond shape with your whole team.',
 'always', 'CQ-Q3R8T5W1', 2),

('nord', 'Nord Canteen', 'Nordmetall Canteen',
 'Three times a day I say the same thing, and it is always a queue. You arrive with a plan and leave with whatever was left. Everyone complains about me; everyone comes back tomorrow.',
 'We are at the Canteen Door — stand right at the entrance.',
 'Recreate a food advertisement as a team.',
 'seems', 'CQ-B6N1Y4H7', 3),

('scc', 'SCC', 'Sports & Convention Center',
 'I am measured in laps, in points, and in excuses. My floor squeaks under everyone who walks in certain they will win. Come to beat someone and you will leave tired either way.',
 'Meet us at the Recreation Center Entrance.',
 'Do 20 synchronized jumping jacks.',
 'impossible', 'CQ-F2J9L6D3', 4),

('sac', 'SAC', 'Student Activity Center',
 'My walls wear paper like armour, and every sheet of it is asking you to join something. I am where “we should start a club” stops being a joke and becomes a Tuesday evening.',
 'Head to Hall 3, where the welcome party was just held yesterday.',
 'Name 3 student clubs, out loud, as a team.',
 'until', 'CQ-C5V8Z2G4', 5),

('tos', 'TOS', 'The Other Side',
 'I sleep through the week and wake the moment it surrenders. My best stories are the ones nobody can reconstruct in the morning. My name is simply where you go when you have had enough of everywhere else.',
 'We are at the Entrance Door — you will know it when you see it.',
 'Strike a team dance pose for the camera.',
 'it''s', 'CQ-M1A7E3S6', 6),

('rlh', 'RLH', 'Reimar Lüst Hall',
 'Hundreds enter me in silence and leave arguing about question four. I seat far more people than I ever comfort. I am named for a man who spent his life looking up; you will spend two hours looking at my ceiling.',
 'Find us at Student Services, just inside the building.',
 'Take a “survived the exam” group photo.',
 'done', 'CQ-U9W4K8P2', 7);

-- ---------------------------------------------------------------------------
-- Seed data — 5 teams, each with its own route through the same 7 checkpoints
--
-- ROTATE THESE PINS BEFORE THE EVENT if this file has ever been shared.
-- ---------------------------------------------------------------------------

insert into teams (id, name, short_name, pin, route, sort_order) values
('merc',        'Mercator College',    'Merc',        'mk7x2p',
 '["irc","scc","rlh","sac","green","nord","tos"]', 1),
('krupp',       'Krupp College',       'Krupp',       'kw9r4q',
 '["scc","rlh","nord","tos","irc","sac","green"]', 2),
('nordcollege', 'Nordmetall College',  'Nord',        'nq5t8w',
 '["green","irc","sac","scc","tos","rlh","nord"]', 3),
('c3',          'College 3',           'C3',          'c3r16v',
 '["nord","green","rlh","irc","scc","tos","sac"]', 4),
('offcampus',   'Off Campus United',   'Off Campus',  'oc8l3m',
 '["tos","sac","green","nord","irc","scc","rlh"]', 5);
