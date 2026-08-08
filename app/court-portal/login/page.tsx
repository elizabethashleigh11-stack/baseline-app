"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function CourtPortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{
    message: string;
    type: "info" | "error" | "success";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus({ message: "Signing in…", type: "info" });

    try {
      const supabase = getSupabaseClient();
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        setStatus({
          message: authError?.message ?? "Sign-in failed.",
          type: "error",
        });
        return;
      }

      // Verify professional access exists.
      const { count } = await supabase
        .from("professional_access")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authData.user.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (!count || count === 0) {
        await supabase.auth.signOut();
        setStatus({
          message:
            "Your account does not have professional portal access. Contact the case administrator.",
          type: "error",
        });
        return;
      }

      setStatus({ message: "Access verified. Redirecting…", type: "success" });
      router.push("/court-portal");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setStatus({ message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gray-50 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="bg-crisp-white w-full max-w-md rounded-2xl border border-slate-gray/25 p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-slate-gray text-xs font-semibold uppercase tracking-widest">
            Baseline
          </p>
          <h1 className="text-navy-blue mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Professional Portal
          </h1>
          <p className="text-slate-gray mt-2 text-sm">
            Attorneys, GALs &amp; Judges — sign in to access case data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-slate-gray mb-1 block text-sm font-medium"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lawfirm.com"
              className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-slate-gray mb-1 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>

          {status && (
            <p
              className={`text-sm ${
                status.type === "error"
                  ? "text-red-700"
                  : status.type === "success"
                    ? "text-green-700"
                    : "text-slate-gray"
              }`}
            >
              {status.message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-navy-blue text-crisp-white w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-70"
          >
            {loading ? "Verifying…" : "Sign In"}
          </button>
        </form>

        <p className="text-slate-gray mt-6 text-center text-xs">
          Parent portal?{" "}
          <Link href="/login" className="text-navy-blue underline">
            Sign in here
          </Link>
        </p>
      </section>
    </main>
  );
}
