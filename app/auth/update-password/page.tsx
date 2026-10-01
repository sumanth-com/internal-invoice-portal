import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function RedirectForSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/auth/login");

  const pending =
    (data.claims.app_metadata as { invitation_pending?: unknown } | undefined)?.invitation_pending ===
    true;
  redirect(pending ? "/auth/activate" : "/auth/reset-password");
  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RedirectForSession />
    </Suspense>
  );
}
