import { AuthScreen } from "@/components/auth/auth-screen";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function InvalidResetLink() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">This link has expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The password reset link is invalid or has already been used. Request a new one to continue.
        </p>
      </div>
      <Link href="/auth/forgot-password" className="text-sm underline underline-offset-4">
        Request a new reset link
      </Link>
      <Link href="/auth/login" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}

async function ResetContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return <InvalidResetLink />;

  const pending =
    (data.claims.app_metadata as { invitation_pending?: unknown } | undefined)?.invitation_pending ===
    true;
  if (pending) redirect("/auth/activate");

  return <SetPasswordForm mode="reset" />;
}

export default function Page() {
  return (
    <AuthScreen>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Checking the reset link…</p>}>
        <ResetContent />
      </Suspense>
    </AuthScreen>
  );
}
