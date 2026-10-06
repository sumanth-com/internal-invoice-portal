"use server";

import { auditDeleteBounds } from "@/lib/audit";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function clearAuditLog(from: string, to: string): Promise<{ error: string | null }> {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    return { error: "Only an administrator can clear the audit log." };
  }

  const bounds = auditDeleteBounds(from, to);
  if (!bounds) return { error: "Choose a date range before deleting activity." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_invoice_audit_log", {
    from_at: bounds.fromAt,
    to_at: bounds.toAt,
  });
  if (error) return { error: "Activity could not be deleted." };
  revalidatePath("/audit");
  return { error: null };
}
