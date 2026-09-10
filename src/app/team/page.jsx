import { redirect } from "next/navigation";
import { requireTeam } from "@/lib/session";
import { loadGame, teamViewFrom, leaderboardFrom } from "@/lib/game";
import TeamDashboard from "./TeamDashboard";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const teamId = await requireTeam();
  if (!teamId) redirect("/");

  const game = await loadGame();
  const view = teamViewFrom(game, teamId);
  if (!view) redirect("/");

  return <TeamDashboard initialView={view} initialLeaderboard={leaderboardFrom(game)} />;
}
