-- Migration 06: add spot column, populate spots, add live_leaderboard_visible setting,
--               fix guests table being excluded from RESET

-- Spot column (always-visible location pointer on the riddle card)
alter table checkpoints add column if not exists spot text;

update checkpoints set spot = 'Find us at the Coffee Bar'                               where id = 'irc';
update checkpoints set spot = 'Find us near the Interfaith House'                       where id = 'green';
update checkpoints set spot = 'Find us at the Canteen Door'                             where id = 'nord';
update checkpoints set spot = 'Find us at the Recreation Center Entrance'               where id = 'scc';
update checkpoints set spot = 'Find us in Hall 3 — where the welcome party was held'   where id = 'sac';
update checkpoints set spot = 'Find us at the Entrance Door'                            where id = 'tos';
update checkpoints set spot = 'Find us at Student Services'                             where id = 'rlh';

-- Live leaderboard visibility toggle (off by default)
insert into game_settings (key, value) values ('live_leaderboard_visible', 'false')
on conflict (key) do nothing;

-- Rename Off-Campus Students → Off Campus United (idempotent)
update teams set name = 'Off Campus United', short_name = 'Off Campus' where id = 'offcampus';
