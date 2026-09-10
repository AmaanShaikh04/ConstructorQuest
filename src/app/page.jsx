import { db } from "@/lib/supabase";
import LoginScreen from "./LoginScreen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let teams = [];
  let configError = null;

  try {
    const { data, error } = await db()
      .from("teams")
      .select("id, name, short_name")
      .order("sort_order");
    if (error) throw new Error(error.message);
    teams = data.map((t) => ({ id: t.id, name: t.name, shortName: t.short_name }));
  } catch (e) {
    configError = e.message;
  }

  return <LoginScreen teams={teams} configError={configError} />;
}
