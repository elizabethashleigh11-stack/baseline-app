import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";

export default async function DashboardPage() {
  const { user, role } = await getPortalSession();

  if (!user || !role) {
    redirect("/login");
  }

  redirect(role === "parent" ? "/parent-portal" : "/professional-portal");
}
