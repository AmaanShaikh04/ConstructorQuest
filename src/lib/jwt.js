import { SignJWT, jwtVerify } from "jose";

// Kept free of `next/headers` so this module can also be used from middleware,
// which runs on the edge runtime and cannot import the headers API.

export const SESSION_COOKIE = "cq_session";
export const MAX_AGE_SECONDS = 60 * 60 * 12; // one very long event day

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set it in .env.local (32+ random characters)."
    );
  }
  return new TextEncoder().encode(s);
}

/** payload = { role: 'team', teamId } | { role: 'admin' } */
export async function createSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

/** Returns the payload, or null if the token is missing, forged or expired. */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
