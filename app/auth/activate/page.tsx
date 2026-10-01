import { AuthScreen } from "@/components/auth/auth-screen";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { roleLabel } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function ActivateContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const pending =
    (data.claims.app_metadata as { invitation_pending?: unknown } | undefined)?.invitation_pending ===
    true;
  if (!pending) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) redirect("/auth/login");

  const role = profile.role === "admin" ? "admin" : "internal_user";
  const email =
    profile.email ?? (typeof data.claims.email === "string" ? data.claims.email : "");

  return (
    <SetPasswordForm
      mode="activate"
      name={profile.full_name}
      email={email}
      roleLabel={roleLabel(role)}
    />
  );
}

export default function Page() {
  return (
    <AuthScreen>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading your invitation…</p>}>
        <ActivateContent />
      </Suspense>
    </AuthScreen>
  );
}
