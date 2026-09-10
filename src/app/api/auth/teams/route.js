import { db } from "@/lib/supabase";
import { ok, fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

// The login screen needs the list of colleges to choose from. Names only —
// never PINs, and never routes.
export const GET = handler(async () => {
  const { data, error } = await db()
    .from("teams")
    .select("id, name, short_name")
    .order("sort_order");

  if (error) return fail(error.message, 500);
  return ok({ teams: data.map((t) => ({ id: t.id, name: t.name, shortName: t.short_name })) });
});
