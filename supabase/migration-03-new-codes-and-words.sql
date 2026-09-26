-- Migration 03: update QR codes to non-guessable tokens and words to
-- spell "It always seems impossible until it's done"
-- Run in Supabase SQL editor if the event database already exists.

update checkpoints set qr_code = 'X7K2M4P9', word = 'It'         where id = 'irc';
update checkpoints set qr_code = 'Q3R8T5W1', word = 'always'     where id = 'green';
update checkpoints set qr_code = 'B6N1Y4H7', word = 'seems'      where id = 'nord';
update checkpoints set qr_code = 'F2J9L6D3', word = 'impossible' where id = 'scc';
update checkpoints set qr_code = 'C5V8Z2G4', word = 'until'      where id = 'sac';
update checkpoints set qr_code = 'M1A7E3S6', word = 'it''s'      where id = 'tos';
update checkpoints set qr_code = 'U9W4K8P2', word = 'done'       where id = 'rlh';
