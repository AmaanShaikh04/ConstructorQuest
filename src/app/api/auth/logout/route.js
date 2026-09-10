import { SESSION_COOKIE } from "@/lib/session";
import { ok, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  const res = ok({ redirect: "/" });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
});
