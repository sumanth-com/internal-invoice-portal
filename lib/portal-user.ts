import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppRole, PortalUser } from "@/lib/portal";

export const getPortalUser = cache(async function getPortalUser(): Promise<PortalUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/auth/login");
  }

  const appMetadata = data.claims.app_metadata as { invitation_pending?: unknown } | undefined;
  if (appMetadata?.invitation_pending === true) {
    redirect("/auth/activate");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", data.claims.sub)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const role: AppRole = profile.role === "admin" ? "admin" : "internal_user";
  const email =
    profile.email ??
    (typeof data.claims.email === "string" ? data.claims.email : "");

  return {
    id: profile.id,
    email,
    fullName: profile.full_name,
    role,
    isActive: profile.is_active,
  };
});
