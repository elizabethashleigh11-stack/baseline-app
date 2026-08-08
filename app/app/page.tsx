import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import ReflectionInput from "./ReflectionInput";
import MoodHeatmap from "./MoodHeatmap";
import LogEntryForm from "./LogEntryForm";
import ContextNav from "./ContextNav";

export default async function AppPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29);

  const { data: reflectionsData } = await supabase
    .from("reflections")
    .select("entry_date, tags, text")
    .eq("user_id", user.id)
    .gte("entry_date", startDate.toISOString().slice(0, 10))
    .lte("entry_date", today.toISOString().slice(0, 10))
    .order("entry_date", { ascending: true });

  const reflections = (reflectionsData ?? []).map((reflection) => ({
    entry_date: reflection.entry_date,
    text: typeof reflection.text === "string" ? reflection.text : "",
    tags: Array.isArray(reflection.tags)
      ? reflection.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  }));

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
        <ContextNav />
        <LogEntryForm />
        <ReflectionInput />
        <MoodHeatmap reflections={reflections} />
      </section>
    </main>
  );
}
