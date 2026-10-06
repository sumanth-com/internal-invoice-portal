"use server";

import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function clearAuditLog(): Promise<{ error: string | null }> {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    return { error: "Only an administrator can clear the audit log." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_invoice_audit_log");
  if (error) return { error: "Activity could not be deleted." };
  revalidatePath("/audit");
  return { error: null };
}
