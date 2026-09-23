import { redirect } from "next/navigation";
import { requireGuest } from "@/lib/session";
import { loadGuestRun, guestViewFrom, guestLeaderboard } from "@/lib/guest";
import GuestDashboard from "./GuestDashboard";

export const dynamic = "force-dynamic";

export default async function GuestPage() {
  const guestId = await requireGuest();
  if (!guestId) redirect("/");

  const run = await loadGuestRun(guestId);
  if (!run) redirect("/");

  return (
    <GuestDashboard
      initialView={guestViewFrom(run)}
      initialLeaderboard={await guestLeaderboard()}
    />
  );
}
