import { createServerClient } from "@/lib/supabase/server";

export type PortalRole = "parent" | "professional";

function isPortalRole(value: unknown): value is PortalRole {
  return value === "parent" || value === "professional";
}

export async function getPortalSession() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, role: null as PortalRole | null };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (isPortalRole(profileData?.role)) {
    return { supabase, user, role: profileData.role };
  }

  const metadataRole = user.user_metadata?.portal_preference;

  return {
    supabase,
    user,
    role: isPortalRole(metadataRole) ? metadataRole : null,
  };
}
