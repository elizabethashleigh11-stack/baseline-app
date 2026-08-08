"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type PortalType = "parent" | "professional";

function isPortalType(value: unknown): value is PortalType {
  return value === "parent" || value === "professional";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<
    "info" | "error" | "success" | null
  >(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusMessage("Signing in...");
    setStatusType("info");
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        setStatusMessage(`Error: ${authError.message}`);
        setStatusType("error");
        return;
      }

      if (!authData.user) {
        setStatusMessage("Error: No user returned from sign-in.");
        setStatusType("error");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      let role: PortalType | null = null;

      if (!profileError && isPortalType(profileData?.role)) {
        role = profileData.role;
      }

      if (!role) {
        const roleFromMetadata = authData.user.user_metadata?.portal_preference;
        if (isPortalType(roleFromMetadata)) {
          role = roleFromMetadata;
        }
      }

      if (!role) {
        setStatusMessage("Error: Unrecognized role.");
        setStatusType("error");
        return;
      }

      setStatusMessage("Success! Redirecting...");
      setStatusType("success");

      if (role === "parent") {
        router.push("/parent-portal");
      } else {
        router.push("/professional-portal");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatusMessage(`Error: ${message}`);
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gray-50 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="bg-crisp-white w-full max-w-md rounded-2xl border border-slate-gray/25 p-6 shadow-sm sm:p-8">
        <h1 className="text-navy-blue text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Sign in to Baseline
        </h1>
        <p className="text-slate-gray mt-2 text-center text-sm">
          Sign in to continue.
        </p>

        <div className="mt-6">
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="focus:border-navy-blue focus:ring-navy-blue w-full rounded-lg border border-slate-gray/40 px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </div>

            {statusMessage && (
              <p
                className={`text-sm ${
                  statusType === "error"
                    ? "text-red-700"
                    : statusType === "success"
                      ? "text-green-700"
                      : "text-slate-gray"
                }`}
              >
                {statusMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-navy-blue text-crisp-white w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="#" className="text-slate-gray hover:text-navy-blue">
              Forgot Password?
            </Link>
            <Link href="/signup" className="text-slate-gray hover:text-navy-blue">
              Create an Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
