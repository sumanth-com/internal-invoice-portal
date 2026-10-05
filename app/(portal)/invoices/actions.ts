"use server";

import {
  invoiceErrorMessage,
  invoiceToRow,
  isInvoiceId,
  isInvoiceStatus,
  parseInvoiceForm,
  type InvoiceDetail,
  type InvoiceFormState,
  type InvoiceMutationState,
  type InvoiceStatus,
} from "@/lib/invoice";
import { loadInvoice, loadInvoiceFormOptions } from "@/lib/invoices";
import { recordInvoiceNotification } from "@/lib/portal-notifications";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function denied(message: string): InvoiceFormState {
  return { error: message, fieldErrors: {} };
}

export type InvoiceFormOptionsResult =
  | { ok: true; data: Awaited<ReturnType<typeof loadInvoiceFormOptions>> }
  | { ok: false; error: string };

export type InvoiceDraftResult =
  | {
      ok: true;
      invoice: InvoiceDetail;
      options: Awaited<ReturnType<typeof loadInvoiceFormOptions>>;
    }
  | { ok: false; error: string };

export async function fetchInvoiceDraft(id: string): Promise<InvoiceDraftResult> {
  const user = await getPortalUser();
  if (!user?.isActive) {
    return { ok: false, error: "You do not have permission to edit an invoice." };
  }
  if (!isInvoiceId(id)) return { ok: false, error: "This invoice was not found." };

  try {
    const invoice = await loadInvoice(id);
    if (!invoice) return { ok: false, error: "This invoice was not found." };
    if (invoice.status !== "draft") {
      return { ok: false, error: "Only a draft invoice can be edited." };
    }
    const options = await loadInvoiceFormOptions({
      beneficiaryId: invoice.beneficiaryId,
      bankAccountId: invoice.bankAccountId,
    });
    return { ok: true, invoice, options };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "This invoice could not be loaded.",
    };
  }
}

export async function fetchInvoiceFormOptions(): Promise<InvoiceFormOptionsResult> {
  try {
    const [user, data] = await Promise.all([getPortalUser(), loadInvoiceFormOptions()]);
    if (!user?.isActive) {
      return { ok: false, error: "You do not have permission to create an invoice." };
    }
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The invoice form could not be loaded.",
    };
  }
}

async function saveTds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
  tdsAmount: number,
) {
  if (!(tdsAmount > 0)) return null;
  const updated = await supabase
    .from("invoices")
    .update({ tds_amount: tdsAmount })
    .eq("id", invoiceId)
    .eq("status", "draft");
  return updated.error;
}

async function replaceItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
  items: { description: string; hsn: string | null; quantity: number; rate: number }[],
) {
  const removed = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);
  if (removed.error) return removed.error;
  if (items.length === 0) return null;

  const inserted = await supabase.from("invoice_items").insert(
    items.map((item, index) => ({
      invoice_id: invoiceId,
      position: index + 1,
      hsn: item.hsn,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
    })),
  );
  return inserted.error;
}

export async function saveInvoice(
  _state: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const user = await getPortalUser();
  if (!user?.isActive) {
    return denied("You do not have permission to save an invoice.");
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  const editing = id.length > 0;
  if (editing && !isInvoiceId(id)) {
    return denied("This invoice was not found.");
  }

  const supabase = await createClient();
  let invoiceNumber: string | undefined;
  if (editing) {
    const existing = await supabase
      .from("invoices")
      .select("id, status, invoice_number")
      .eq("id", id)
      .maybeSingle();
    if (existing.error) return denied("The invoice could not be saved.");
    if (!existing.data) return denied("This invoice was not found.");
    if (existing.data.status !== "draft") {
      return denied("Only a draft invoice can be edited.");
    }
    invoiceNumber = existing.data.invoice_number;
  }

  const parsed = parseInvoiceForm(formData, { invoiceNumber });
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  if (!editing) {
    const created = await supabase
      .from("invoices")
      .insert(invoiceToRow(parsed.value))
      .select("id")
      .single();
    if (created.error || !created.data) {
      return denied(
        invoiceErrorMessage(created.error, "The invoice could not be saved."),
      );
    }

    const itemError = await replaceItems(
      supabase,
      created.data.id,
      parsed.value.items,
    );
    if (itemError) {
      await supabase.from("invoices").delete().eq("id", created.data.id);
      return denied(
        invoiceErrorMessage(itemError, "The invoice lines could not be saved."),
      );
    }

    const tdsError = await saveTds(supabase, created.data.id, parsed.value.tdsAmount);
    if (tdsError) {
      await supabase.from("invoices").delete().eq("id", created.data.id);
      return denied(invoiceErrorMessage(tdsError, "TDS could not be saved."));
    }

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    await recordInvoiceNotification(created.data.id, "invoice_draft");
    redirect(`/invoices/${created.data.id}?notice=saved`);
  }

  const updated = await supabase
    .from("invoices")
    .update({ ...invoiceToRow(parsed.value), tds_amount: 0 })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (updated.error) {
    return denied(invoiceErrorMessage(updated.error, "The invoice could not be saved."));
  }
  if (!updated.data?.length) {
    return denied("Only a draft invoice can be edited.");
  }

  const itemError = await replaceItems(supabase, id, parsed.value.items);
  if (itemError) {
    return denied(invoiceErrorMessage(itemError, "The invoice lines could not be saved."));
  }

  const tdsError = await saveTds(supabase, id, parsed.value.tdsAmount);
  if (tdsError) {
    return denied(invoiceErrorMessage(tdsError, "TDS could not be saved."));
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
  await recordInvoiceNotification(id, "invoice_draft");
  redirect(`/invoices/${id}?notice=saved`);
}

export async function issueInvoice(
  _state: InvoiceMutationState,
  formData: FormData,
): Promise<InvoiceMutationState> {
  const user = await getPortalUser();
  if (!user?.isActive) {
    return { error: "You do not have permission to issue this invoice." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isInvoiceId(id)) return { error: "This invoice was not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "issued" })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");

  if (error) {
    return { error: invoiceErrorMessage(error, "The invoice could not be issued.") };
  }
  if (!data?.length) return { error: "Only a draft invoice can be issued." };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
  await recordInvoiceNotification(id, "invoice_issued");
  redirect(`/invoices/${id}?notice=issued`);
}

export async function cancelInvoice(
  _state: InvoiceMutationState,
  formData: FormData,
): Promise<InvoiceMutationState> {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    return { error: "Only an admin can cancel an invoice." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isInvoiceId(id)) return { error: "This invoice was not found." };

  const supabase = await createClient();
  const existing = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) return { error: "The invoice could not be cancelled." };
  if (!existing.data) return { error: "This invoice was not found." };
  if (existing.data.status === "cancelled") {
    return { error: "This invoice is already cancelled." };
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("id");

  if (error) {
    return { error: invoiceErrorMessage(error, "The invoice could not be cancelled.") };
  }
  if (!data?.length) return { error: "Only an admin can cancel an invoice." };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
  await recordInvoiceNotification(id, "invoice_cancelled");
  redirect(`/invoices/${id}?notice=cancelled`);
}

export async function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<{ ok: true; status: InvoiceStatus } | { ok: false; error: string }> {
  const user = await getPortalUser();
  if (!user?.isActive) {
    return { ok: false, error: "You do not have permission to change this invoice." };
  }
  if (!isInvoiceId(id) || !isInvoiceStatus(status)) {
    return { ok: false, error: "This invoice was not found." };
  }

  const supabase = await createClient();
  const existing = await supabase.from("invoices").select("status").eq("id", id).maybeSingle();
  if (existing.error) return { ok: false, error: "The invoice status could not be changed." };
  if (!existing.data || !isInvoiceStatus(existing.data.status)) {
    return { ok: false, error: "This invoice was not found." };
  }

  const current = existing.data.status;
  if (current === status) return { ok: true, status };

  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", id)
    .eq("status", current)
    .select("id");
  if (error) return { ok: false, error: invoiceErrorMessage(error, "The invoice status could not be changed.") };
  if (!data?.length) return { ok: false, error: "The invoice status could not be changed." };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/dashboard");
  if (status === "issued" || status === "paid" || status === "cancelled") {
    await recordInvoiceNotification(
      id,
      status === "issued" ? "invoice_issued" : status === "paid" ? "invoice_paid" : "invoice_cancelled",
    );
  }
  return { ok: true, status };
}

export async function deleteDraftInvoice(
  _state: InvoiceMutationState,
  formData: FormData,
): Promise<InvoiceMutationState> {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    return { error: "Only an admin can delete a draft invoice." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isInvoiceId(id)) return { error: "This invoice was not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("status", "draft")
    .select("id");

  if (error) {
    return { error: invoiceErrorMessage(error, "The draft could not be deleted.") };
  }
  if (!data?.length) {
    return { error: "Only an admin can delete a draft invoice." };
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices?notice=deleted");
}
