"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type PortalRole = "parent" | "professional";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PortalRole>("parent");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("Creating account...");

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
        },
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus("Success! Profile created. Check your email to confirm.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gray-50 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="bg-crisp-white w-full max-w-md rounded-2xl border border-slate-gray/25 p-6 shadow-sm sm:p-8">
        <h1 className="text-navy-blue text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Create your Baseline account
        </h1>
        <p className="text-slate-gray mt-2 text-center text-sm">
          Choose your portal type and set your login credentials.
        </p>

        <form onSubmit={handleSignUp} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="role"
              className="text-slate-gray mb-1 block text-sm font-medium"
            >
              Portal
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as PortalRole)}
              className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
            >
              <option value="parent">Parent Portal</option>
              <option value="professional">Professional Portal</option>
            </select>
          </div>

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
              placeholder="you@example.com"
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
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </div>

          {status && (
            <p
              className={`text-sm ${
                status.startsWith("Error:") ? "text-red-700" : "text-green-700"
              }`}
            >
              {status}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-navy-blue text-crisp-white w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-70"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-slate-gray mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-navy-blue font-medium">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
