-- Constructor Quest — migration 01: guest mode + rewritten riddles
--
-- Run this ONLY if you already ran schema.sql and have a database with real
-- progress in it that you don't want to lose. A fresh setup should just run
-- the updated schema.sql instead — it already contains everything here.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Guest mode tables
-- ---------------------------------------------------------------------------

create table if not exists guests (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  email        text not null unique,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists guest_progress (
  id            bigserial primary key,
  guest_id      uuid not null references guests(id) on delete cascade,
  checkpoint_id text not null references checkpoints(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (guest_id, checkpoint_id)
);

create index if not exists guest_progress_guest_id_idx on guest_progress (guest_id);
create index if not exists guests_finished_at_idx on guests (finished_at);

alter table guests         enable row level security;
alter table guest_progress enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Rewritten riddles and hints
-- ---------------------------------------------------------------------------

update checkpoints set riddle = 'I am filled with voices that have never spoken, and I punish anyone who does. Take a piece of me away and I will count every single day until it comes back.',
       hint = 'Silence is the rule, and everything here is borrowed.'
 where id = 'irc';

update checkpoints set riddle = 'I have four corners and not one wall. Every path here is a polite detour around my middle, and the shortest way across campus is straight through me.',
       hint = 'The diamond of grass that everyone crosses and nobody owns.'
 where id = 'green';

update checkpoints set riddle = 'Three times a day I say the same thing, and it is always a queue. You arrive with a plan and leave with whatever was left. Everyone complains about me; everyone comes back tomorrow.',
       hint = 'Trays, queues, and an opinion from everyone who eats here.'
 where id = 'nord';

update checkpoints set riddle = 'I am measured in laps, in points, and in excuses. My floor squeaks under everyone who walks in certain they will win. Come to beat someone and you will leave tired either way.',
       hint = 'Where the floor squeaks and the scoreboard argues back.'
 where id = 'scc';

update checkpoints set riddle = 'My walls wear paper like armour, and every sheet of it is asking you to join something. I am where “we should start a club” stops being a joke and becomes a Tuesday evening.',
       hint = 'Every wall is a noticeboard, and every noticeboard wants your name.'
 where id = 'sac';

update checkpoints set riddle = 'I sleep through the week and wake the moment it surrenders. My best stories are the ones nobody can reconstruct in the morning. My name is simply where you go when you have had enough of everywhere else.',
       hint = 'Late, loud, and named for not being here.'
 where id = 'tos';

update checkpoints set riddle = 'Hundreds enter me in silence and leave arguing about question four. I seat far more people than I ever comfort. I am named for a man who spent his life looking up; you will spend two hours looking at my ceiling.',
       hint = 'The big lecture hall named after an astrophysicist — where exams happen.'
 where id = 'rlh';
