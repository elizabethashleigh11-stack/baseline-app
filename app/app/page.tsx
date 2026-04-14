import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function AppPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>
      <p>
        This is your protected Baseline dashboard. Co-parenting features will
        be built here.
      </p>
    </main>
  );
}
