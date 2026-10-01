"use server";

import { passwordValidationMessage } from "@/lib/auth-password";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function saveAccountPassword(password: string): Promise<{ error: string | null }> {
  const nextPassword = password.trim();
  const invalid = passwordValidationMessage(nextPassword);
  if (invalid) return { error: invalid };
  if (nextPassword.length > 72) return { error: "Use 72 characters or fewer." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "Open the invitation link again." };

  const pending =
    (data.user.app_metadata as { invitation_pending?: unknown } | undefined)?.invitation_pending ===
    true;
  const updated = await supabase.auth.updateUser({ password: nextPassword });
  if (updated.error) {
    return { error: "The password could not be saved. Use at least 8 characters." };
  }

  if (!pending) return { error: null };

  const admin = createAdminClient();
  if (!admin) return { error: "The password was saved, but the account could not be activated." };
  const cleared = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { invitation_pending: false },
  });
  if (cleared.error) {
    return { error: "The password was saved, but the account could not be activated." };
  }

  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error) return { error: "The password was saved. Sign in to continue." };
  return { error: null };
}
