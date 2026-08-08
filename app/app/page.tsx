import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal/session";

export default async function AppPage() {
  const { user, role } = await getPortalSession();

  if (!user || !role) {
    redirect("/login");
  }

  redirect(role === "parent" ? "/parent-portal" : "/professional-portal");
}
