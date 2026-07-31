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
    <main className="bg-crisp-white text-navy-blue flex min-h-screen items-center px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-gray/35 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-4 text-slate-gray">
          Signed in as <strong>{user.email}</strong>
        </p>
        <p className="mt-3 text-slate-gray">
          This protected workspace is ready for connections and messaging
          features.
        </p>
      </section>
    </main>
  );
}
