import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

type AccessRow = {
  connection_id: string;
  role: string;
  granted_at: string;
  expires_at: string | null;
  connections: {
    id: string;
    parent_a: string;
    parent_b: string;
  } | null;
};

export default async function CourtPortalIndexPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/court-portal/login");
  }

  const { data: accessRows } = await supabase
    .from("professional_access")
    .select(
      "connection_id, role, granted_at, expires_at, connections(id, parent_a, parent_b)"
    )
    .eq("user_id", user.id)
    .order("granted_at", { ascending: false });

  const rows = (accessRows ?? []) as unknown as AccessRow[];
  const now = new Date();
  const activeRows = rows.filter(
    (r) => r.expires_at === null || new Date(r.expires_at) > now
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-navy-blue text-2xl font-semibold tracking-tight">
          Your Cases
        </h1>
        <p className="text-slate-gray mt-1 text-sm">
          Signed in as <strong>{user.email}</strong>
        </p>
      </div>

      {activeRows.length === 0 ? (
        <div className="bg-crisp-white rounded-2xl border border-slate-gray/25 p-8 text-center">
          <p className="text-slate-gray">
            No active case access found. Contact the case administrator to be
            granted access.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activeRows.map((row) => (
            <li key={row.connection_id}>
              <Link
                href={`/court-portal/${row.connection_id}`}
                className="bg-crisp-white flex items-center justify-between rounded-2xl border border-slate-gray/25 p-5 shadow-sm transition hover:border-navy-blue/40 hover:shadow-md"
              >
                <div>
                  <p className="text-navy-blue font-semibold">
                    Case:{" "}
                    <span className="font-mono text-sm">
                      {row.connection_id}
                    </span>
                  </p>
                  <p className="text-slate-gray mt-1 text-sm">
                    Role: <span className="capitalize">{row.role.replace("_", " ")}</span>
                    {" · "}
                    Granted:{" "}
                    {new Date(row.granted_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {row.expires_at
                      ? ` · Expires: ${new Date(row.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
                      : ""}
                  </p>
                </div>
                <span className="text-slate-gray text-lg" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
