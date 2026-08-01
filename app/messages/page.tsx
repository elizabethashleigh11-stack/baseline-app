import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import MessageComposer from "./message-composer";

export default async function MessagesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="bg-gray-50 min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="bg-crisp-white mx-auto w-full max-w-3xl rounded-2xl border border-slate-gray/25 p-5 shadow-sm sm:p-6">
        <h1 className="text-navy-blue text-2xl font-semibold tracking-tight">
          New Message
        </h1>
        <p className="text-slate-gray mt-2 text-sm">
          Draft your message freely, then use Review/Send. Flagged drafts cannot
          be sent as-is.
        </p>
        <MessageComposer />
      </section>
    </main>
  );
}
