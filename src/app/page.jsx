import { db } from "@/lib/supabase";
import { getSetting } from "@/lib/settings";
import LoginScreen from "./LoginScreen";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let teams = [];
  let configError = null;
  let showLiveLeaderboard = false;

  try {
    const [teamsRes, liveVisible] = await Promise.all([
      db().from("teams").select("id, name, short_name").order("sort_order"),
      getSetting("live_leaderboard_visible", "false"),
    ]);
    if (teamsRes.error) throw new Error(teamsRes.error.message);
    teams = teamsRes.data.map((t) => ({ id: t.id, name: t.name, shortName: t.short_name }));
    showLiveLeaderboard = liveVisible === "true";
  } catch (e) {
    configError = e.message;
  }

  return <LoginScreen teams={teams} configError={configError} showLiveLeaderboard={showLiveLeaderboard} />;
}
