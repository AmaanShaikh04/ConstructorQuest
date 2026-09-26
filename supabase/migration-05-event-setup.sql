-- Migration 05: game settings table, updated hints, new passwords, team rename

-- ---------------------------------------------------------------------------
-- Game settings table
-- ---------------------------------------------------------------------------
create table if not exists game_settings (
  key   text primary key,
  value text
);

insert into game_settings (key, value) values
  ('team_login_enabled',  'true'),
  ('guest_login_enabled', 'false'),
  ('countdown_at',        null)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Updated hints (now point to the exact spot at each location)
-- ---------------------------------------------------------------------------
update checkpoints set hint =
  'Look for us at the Coffee Bar inside the library.'
  where id = 'irc';

update checkpoints set hint =
  'Find us near the Interfaith House on the green.'
  where id = 'green';

update checkpoints set hint =
  'Meet us at the Recreation Center Entrance.'
  where id = 'scc';

update checkpoints set hint =
  'We are at the Entrance Door — you will know it when you see it.'
  where id = 'tos';

update checkpoints set hint =
  'Head to Hall 3, where the welcome party was just held yesterday.'
  where id = 'sac';

update checkpoints set hint =
  'Find us at Student Services, just inside the building.'
  where id = 'rlh';

update checkpoints set hint =
  'We are at the Canteen Door — stand right at the entrance.'
  where id = 'nord';

-- ---------------------------------------------------------------------------
-- New non-guessable team passwords  (update ADMIN_PIN in .env.local separately)
-- ---------------------------------------------------------------------------
update teams set pin = 'mk7x2p' where id = 'merc';
update teams set pin = 'kw9r4q' where id = 'krupp';
update teams set pin = 'nq5t8w' where id = 'nordcollege';
update teams set pin = 'c3r16v' where id = 'c3';
update teams set pin = 'oc8l3m' where id = 'offcampus';

-- ---------------------------------------------------------------------------
-- Rename Off-Campus Students → Off Campus United
-- ---------------------------------------------------------------------------
update teams set name = 'Off Campus United', short_name = 'Off Campus'
  where id = 'offcampus';
