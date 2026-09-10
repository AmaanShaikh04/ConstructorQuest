-- Constructor Quest — database schema
-- Run this in the Supabase SQL editor (project → SQL → New query → Run).
-- Safe to re-run: it drops and recreates everything.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

drop table if exists penalties cascade;
drop table if exists final_submissions cascade;
drop table if exists bonus_submissions cascade;
drop table if exists hints_used cascade;
drop table if exists team_progress cascade;
drop table if exists checkpoints cascade;
drop table if exists teams cascade;

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

create policy "public read" on team_progress     for select using (true);
create policy "public read" on hints_used        for select using (true);
create policy "public read" on bonus_submissions for select using (true);
create policy "public read" on penalties         for select using (true);
-- final_submissions stays private: the answers are the answers.

-- ---------------------------------------------------------------------------
-- Seed data — 7 checkpoints
-- ---------------------------------------------------------------------------

insert into checkpoints (id, name, full_name, riddle, hint, bonus_challenge, word, qr_code, sort_order) values
('irc', 'IRC', 'Information Resource Center (Library)',
 'Thousands of stories live within me, yet I never speak a word. Before exams, I become everyone''s best friend.',
 'Where silence is loudest right before finals.',
 'Pretend everyone in your team is studying for finals.',
 'Learn', 'CQ-IRC-26', 1),

('green', 'Campus Green', 'The diamond-shaped lawn at the heart of campus',
 'I have four corners but no walls. Every student crosses me, yet nobody lives inside me.',
 'The diamond at the heart of campus.',
 'Form a human diamond shape with your whole team.',
 'Belong', 'CQ-GRN-26', 2),

('nord', 'Nord Canteen', 'Nordmetall Canteen',
 'Three times a day I welcome hungry minds. Some come for food, others come because they smell the food.',
 'Follow the smell of lunch trays.',
 'Recreate a food advertisement as a team.',
 'Share', 'CQ-NRD-26', 3),

('scc', 'SCC', 'Sports & Convention Center',
 'Champions train beneath my roof. Sweat, competition and victory are common visitors.',
 'Where sneakers squeak and weights clang.',
 'Do 20 synchronized jumping jacks.',
 'Compete', 'CQ-SCC-26', 4),

('sac', 'SAC', 'Student Activity Center',
 'Clubs gather here, friendships begin here, and boredom rarely survives here.',
 'Where club flyers cover every wall.',
 'Name 3 student clubs, out loud, as a team.',
 'Connect', 'CQ-SAC-26', 5),

('tos', 'TOS', 'The Other Side',
 'When lectures end and weekends begin, music, laughter and memories often find a home here.',
 'Where the music starts after dark.',
 'Strike a team dance pose for the camera.',
 'Celebrate', 'CQ-TOS-26', 6),

('rlh', 'RLH', 'Reimar Lüst Hall',
 'Hundreds gather within my halls. Some arrive confident, most arrive before an exam slightly terrified.',
 'Where lecture halls fill and empty on the hour.',
 'Take a "survived the exam" group photo.',
 'Think', 'CQ-RLH-26', 7);

-- ---------------------------------------------------------------------------
-- Seed data — 5 teams, each with its own route through the same 7 checkpoints
--
-- ROTATE THESE PINS BEFORE THE EVENT if this file has ever been shared.
-- ---------------------------------------------------------------------------

insert into teams (id, name, short_name, pin, route, sort_order) values
('merc',        'Mercator College',    'Merc',       '1234',
 '["irc","scc","rlh","sac","green","nord","tos"]', 1),
('krupp',       'Krupp College',       'Krupp',      '2345',
 '["scc","rlh","nord","tos","irc","sac","green"]', 2),
('nordcollege', 'Nordmetall College',  'Nord',       '3456',
 '["green","irc","sac","scc","tos","rlh","nord"]', 3),
('c3',          'College 3',           'C3',         '4567',
 '["nord","green","rlh","irc","scc","tos","sac"]', 4),
('offcampus',   'Off-Campus Students', 'Off-Campus', '5678',
 '["tos","sac","green","nord","irc","scc","rlh"]', 5);
