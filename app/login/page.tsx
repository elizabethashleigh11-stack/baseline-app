"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After clicking the magic link, users land on /app
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="bg-crisp-white text-navy-blue flex min-h-screen items-center px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-gray/35 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to Baseline</h1>

        {sent ? (
          <p className="mt-4 text-sm text-slate-gray">
            ✅ Magic link sent to <strong>{email}</strong>. Check your inbox and
            click the link to sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/50 px-3 py-2 text-base outline-none focus:ring-2"
            />

            {error && <p className="text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-navy-blue text-crisp-white w-full rounded-lg px-4 py-2 font-medium disabled:opacity-70"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
