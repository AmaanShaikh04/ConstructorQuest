// Codename generator for guest runs.
//
// Guests don't choose a name — the server assigns one. That removes the whole
// problem of moderating free text before it goes on a projector: every possible
// output is drawn from these two curated lists, so nothing unprintable can be
// produced in the first place.
//
// The email address remains the real identity (unique in the database); the
// codename is only what the public board displays.

const ADJECTIVES = [
  "Amber", "Ancient", "Arctic", "Autumn", "Bold", "Brave", "Bright", "Brisk",
  "Calm", "Clever", "Copper", "Cosmic", "Crimson", "Curious", "Daring", "Dusky",
  "Eager", "Early", "Electric", "Emerald", "Fearless", "Fleet", "Frosty",
  "Gentle", "Gilded", "Golden", "Grand", "Hidden", "Humble", "Indigo", "Iron",
  "Jolly", "Keen", "Lively", "Lucky", "Lunar", "Merry", "Midnight", "Mighty",
  "Nimble", "Noble", "Northern", "Patient", "Quiet", "Radiant", "Rapid",
  "Restless", "Rusty", "Sage", "Scarlet", "Silent", "Silver", "Solar",
  "Steady", "Stellar", "Sunny", "Swift", "Tidal", "Valiant", "Velvet",
  "Wandering", "Whistling", "Wild", "Winter",
];

const NOUNS = [
  "Otter", "Heron", "Falcon", "Badger", "Lantern", "Compass", "Comet",
  "Harbour", "Beacon", "Sparrow", "Marten", "Osprey", "Raven", "Fox", "Hare",
  "Lynx", "Ibis", "Kestrel", "Meadow", "Willow", "Cedar", "Aspen", "Birch",
  "Harrier", "Puffin", "Seal", "Dolphin", "Crane", "Finch", "Wren", "Dune",
  "Tide", "Anchor", "Quill", "Ember", "Prism", "Atlas", "Orbit", "Nova",
  "Delta", "Summit", "Canyon", "Glacier", "Lagoon", "Pinnacle", "Voyager",
  "Pioneer", "Mariner",
];

/** 64 × 48 = 3072 codenames, which is plenty for a one-day event. */
export const TOTAL_CODENAMES = ADJECTIVES.length * NOUNS.length;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Pick a codename nobody is already using.
 *
 * Uniqueness is what keeps the public board readable — two identical rows would
 * be indistinguishable to anyone looking at it, since emails are never shown
 * there. With 3072 combinations and a handful of players, a free one is found
 * almost immediately; the numbered fallback only matters if the event somehow
 * outgrows the list.
 *
 * @param {Set<string>} taken codenames already in use
 */
export function generateGuestName(taken = new Set()) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const name = `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
    if (!taken.has(name)) return name;
  }

  // Every random pick collided — the pool is nearly exhausted. Walk it in order
  // and, failing that, start numbering.
  for (const adjective of ADJECTIVES) {
    for (const noun of NOUNS) {
      const name = `${adjective} ${noun}`;
      if (!taken.has(name)) return name;
    }
  }

  for (let n = 2; ; n++) {
    const name = `${pick(ADJECTIVES)} ${pick(NOUNS)} ${n}`;
    if (!taken.has(name)) return name;
  }
}
