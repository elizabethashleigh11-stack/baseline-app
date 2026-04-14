import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Baseline</h1>
      <p>Co-parenting communication &amp; expense tracking.</p>
      <nav style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
        <Link href="/login">Sign in</Link>
        <Link href="/app">Dashboard</Link>
      </nav>
    </main>
  );
}
