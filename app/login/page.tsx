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
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 400 }}>
      <h1>Sign in to Baseline</h1>

      {sent ? (
        <p>
          ✅ Magic link sent to <strong>{email}</strong>. Check your inbox and
          click the link to sign in.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" style={{ display: "block", marginBottom: 4 }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem",
              marginBottom: "1rem",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}
    </main>
  );
}
