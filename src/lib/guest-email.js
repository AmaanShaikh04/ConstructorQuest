// Email validation for guest sign-in.
//
// The email is a guest's identity: it's what makes two runs distinct, and what
// lets someone resume after closing the tab or swapping phones. It is stored
// lowercased, kept out of every public response, and shown only to HQ.
//
// There is no display-name validation here any more. Guests are assigned a
// codename from `guest-names.js` instead of typing one, so no user-supplied
// text ever reaches the public board and there is nothing to moderate.

/**
 * Which email domains may play as a guest. Defaults to Constructor addresses
 * (plus the legacy Jacobs ones). Set GUEST_EMAIL_DOMAINS to a comma-separated
 * list to change it, or to `*` to let anyone in.
 */
function allowedDomains() {
  const raw = process.env.GUEST_EMAIL_DOMAINS?.trim();
  if (!raw) return ["constructor.university", "jacobs-university.de"];
  if (raw === "*") return "*";
  return raw.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

/**
 * @returns {{ok: true, value: string} | {ok: false, error: string}}
 */
export function validateEmail(raw) {
  const value = String(raw ?? "").trim().toLowerCase();

  if (!value) return bad("Enter your Constructor email address.");
  if (value.length > 120) return bad("That email is too long.");
  if (!/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(value)) {
    return bad("That isn't a valid email address.");
  }

  const domains = allowedDomains();
  if (domains !== "*") {
    const domain = value.split("@")[1];
    const allowed = domains.some((d) => domain === d || domain.endsWith("." + d));
    if (!allowed) {
      return bad(`Guest play is for ${domains.join(" or ")} addresses.`);
    }
  }

  return { ok: true, value };
}

function bad(error) {
  return { ok: false, error };
}
