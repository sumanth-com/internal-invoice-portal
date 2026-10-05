import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect("/auth/error");
    redirect("/auth/reset-password");
  }

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      if (type === "invite") {
        const admin = createAdminClient();
        const { data: session } = await supabase.auth.getClaims();
        const userId = session?.claims?.sub;
        if (admin && userId) {
          await admin.auth.admin.updateUserById(userId, {
            app_metadata: { invitation_pending: true },
          });
          await supabase.auth.refreshSession();
        }
        redirect("/auth/activate");
      }
      if (type === "recovery") {
        const { data: session } = await supabase.auth.getClaims();
        const pending =
          (session?.claims?.app_metadata as { invitation_pending?: unknown } | undefined)
            ?.invitation_pending === true;
        redirect(pending ? "/auth/activate" : "/auth/reset-password");
      }
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect("/auth/error");
    }
  }

  redirect("/auth/error");
}
