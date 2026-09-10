import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { loadGame, adminViewFrom } from "@/lib/game";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect("/");
  return <AdminDashboard initialView={adminViewFrom(await loadGame())} />;
}
