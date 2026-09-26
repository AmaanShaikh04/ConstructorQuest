-- Migration 07: final riddles and hints

-- IRC -> Coffee Bar (queue is always long)
update checkpoints set riddle =
  'I am filled with voices that have never spoken, and I punish anyone who does. Take a piece of me away and I will count every single day until it comes back. Inside me there is a corner that never stops moving, where the line forms before you arrive and is still there when you leave.'
  where id = 'irc';

update checkpoints set hint =
  'Follow your nose past the shelves, toward the only noise in here that is allowed.'
  where id = 'irc';

-- Campus Green -> Interfaith House
update checkpoints set riddle =
  'Every path on this campus bends around my edges rather than cross my middle, yet I am the heart everyone walks around. In my shadow sits a house that answers to every name at once, where every faith finds the same door, and none have to knock twice.'
  where id = 'green';

update checkpoints set hint =
  'A building that takes no sides stands at the edge of the green.'
  where id = 'green';

-- Nord Canteen -> Canteen Door (keep original, add door clue, no em dash)
update checkpoints set riddle =
  'Three times a day I say the same thing, and it is always a queue. You arrive with a plan and leave with whatever was left. Everyone complains about me; everyone comes back tomorrow. We are not at the table. We are at the moment before the decision, where you have not yet committed but the smell has already convinced you.'
  where id = 'nord';

update checkpoints set hint =
  'Arrive before it opens. You will not be the first in line.'
  where id = 'nord';

-- SCC -> Recreation Center Entrance (less obvious)
update checkpoints set riddle =
  'I keep count of everything but feelings. My walls remember every personal best and every excuse, and they keep neither. Seek the first step that is not yet a decision, the frame that stands between wanting to and actually doing it.'
  where id = 'scc';

update checkpoints set hint =
  'The hardest part of any workout is the moment just before it begins.'
  where id = 'scc';

-- SAC -> Hall 3 (Thursday night party)
update checkpoints set riddle =
  'My walls wear paper like armour, and every sheet of it is asking you to join something. I am where "we should start a club" stops being a joke and becomes a Tuesday evening. Somewhere inside, a room is still recovering from Thursday night, when everyone arrived as a stranger and left with at least one name they will forget by Sunday.'
  where id = 'sac';

update checkpoints set hint =
  'Find the room that hosted the most introductions this week.'
  where id = 'sac';

-- TOS -> Entrance Door (no em dash)
update checkpoints set riddle =
  'I sleep through the week and wake the moment it surrenders. My best stories are the ones nobody can reconstruct in the morning. My name is simply where you go when you have had enough of everywhere else. Find us before you find anything else here, at the boundary between outside and everything inside.'
  where id = 'tos';

update checkpoints set hint =
  'You walked past us to get in here.'
  where id = 'tos';

-- RLH -> Student Services (RLH 102-104, drop-in hours)
update checkpoints set riddle =
  'Hundreds enter me in silence to prove something, and leave arguing about question four. I am named for a man who spent his life looking up; you will spend two hours looking at my ceiling. But we are not in the hall of reckoning. We are in the corridor that comes before the verdict, in the rooms where the first question is always yours to ask, and the door opens at half past nine.'
  where id = 'rlh';

update checkpoints set hint =
  'Not where the exam happens. Where you go when you have a question that is not on any paper.'
  where id = 'rlh';
