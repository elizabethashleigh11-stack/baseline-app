import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";

export default async function DashboardPage() {
  const { user, role } = await getPortalSession();

  if (!user || !role) {
    redirect("/login");
  }

  if (role === "parent") {
    redirect("/parent-portal");
  }

  redirect("/professional-portal");
}
