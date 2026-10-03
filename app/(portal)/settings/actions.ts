"use server";

import {
  inspectLogo,
  isIncomingLogoPath,
  LOGO_BUCKET,
  logoContentType,
  storedLogoPath,
} from "@/lib/company-logo";
import { getPortalUser } from "@/lib/portal-user";
import {
  BANK_COLUMNS,
  buildSequenceRow,
  COMPANY_COLUMNS,
  emptyBankFormState,
  emptyBankMutationState,
  emptyCompanyFormState,
  emptyCurrencyFormState,
  emptyGstFormState,
  emptyLogoState,
  emptyNumberingFormState,
  isFinancialYearPeriod,
  isNumberingPeriod,
  isRecordId,
  mapBankAccount,
  mapCompanyDetails,
  numberingFloor,
  parseBankForm,
  parseCompanyForm,
  parseCurrencyForm,
  parseGstForm,
  parseNextNumber,
  sequenceSuffix,
  settingsErrorMessage,
  type BankFormState,
  type BankMutationState,
  type BankRow,
  type CompanyFormState,
  type CompanyRow,
  type CurrencyFormState,
  type GstFormState,
  type LogoState,
  type NumberingFormState,
} from "@/lib/settings";
import { signedLogoUrl } from "@/lib/settings-data";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidatePortalSettings() {
  revalidatePath("/settings");
  revalidatePath("/invoices", "layout");
}

async function adminDenied() {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    return "Only an admin can change these settings.";
  }
  return null;
}

export async function saveCompanySettings(
  _state: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyCompanyFormState, error: denied };

  const parsed = parseCompanyForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const updated = await supabase
    .from("company_settings")
    .update(parsed.value)
    .eq("id", true)
    .select(COMPANY_COLUMNS);

  if (updated.error) {
    return {
      ...emptyCompanyFormState,
      error: settingsErrorMessage(updated.error, "Company details could not be saved."),
    };
  }

  let row = (updated.data?.[0] ?? null) as CompanyRow | null;
  if (!row) {
    const inserted = await supabase
      .from("company_settings")
      .insert({
        id: true,
        ...parsed.value,
        default_currency: "INR",
      })
      .select(COMPANY_COLUMNS);
    if (inserted.error || !inserted.data?.[0]) {
      return {
        ...emptyCompanyFormState,
        error: settingsErrorMessage(
          inserted.error,
          "Company details could not be saved.",
        ),
      };
    }
    row = inserted.data[0] as CompanyRow;
  }

  revalidatePortalSettings();
  return { error: null, fieldErrors: {}, saved: mapCompanyDetails(row) };
}

export async function saveGstDefaults(
  _state: GstFormState,
  formData: FormData,
): Promise<GstFormState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyGstFormState, error: denied };

  const parsed = parseGstForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const existing = await supabase
    .from("company_settings")
    .select("id")
    .eq("id", true)
    .maybeSingle();
  if (existing.error) {
    return {
      ...emptyGstFormState,
      error: settingsErrorMessage(existing.error, "GST defaults could not be saved."),
    };
  }
  if (!existing.data) {
    return {
      ...emptyGstFormState,
      error: "Save company details before changing GST defaults.",
    };
  }

  const updated = await supabase
    .from("company_settings")
    .update(parsed.value)
    .eq("id", true)
    .select("default_gst_enabled, default_gst_rate, gstin, pan");

  if (updated.error || !updated.data?.[0]) {
    return {
      ...emptyGstFormState,
      error: settingsErrorMessage(updated.error, "GST defaults could not be saved."),
    };
  }

  revalidatePortalSettings();
  const saved = updated.data[0];
  return {
    error: null,
    fieldErrors: {},
    saved: {
      defaultGstEnabled: Boolean(saved.default_gst_enabled),
      defaultGstRate: Number(saved.default_gst_rate),
      gstin: saved.gstin?.trim() ?? "",
      pan: saved.pan?.trim() ?? "",
    },
  };
}

export async function saveDefaultCurrency(
  _state: CurrencyFormState,
  formData: FormData,
): Promise<CurrencyFormState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyCurrencyFormState, error: denied };

  const parsed = parseCurrencyForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const existing = await supabase.from("company_settings").select("id").eq("id", true).maybeSingle();
  if (existing.error) {
    return {
      ...emptyCurrencyFormState,
      error: settingsErrorMessage(existing.error, "Currency could not be saved."),
    };
  }
  if (!existing.data) {
    return { ...emptyCurrencyFormState, error: "Save company details before changing the currency." };
  }

  const updated = await supabase
    .from("company_settings")
    .update({ default_currency: parsed.value })
    .eq("id", true)
    .select("default_currency");
  if (updated.error || !updated.data?.[0]) {
    return {
      ...emptyCurrencyFormState,
      error: settingsErrorMessage(updated.error, "Currency could not be saved."),
    };
  }

  revalidatePortalSettings();
  return { error: null, fieldErrors: {}, saved: updated.data[0].default_currency };
}

async function removeLogoObjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  if (paths.length === 0) return null;
  const removed = await supabase.storage.from(LOGO_BUCKET).remove(paths);
  return removed.error;
}

export async function saveCompanyLogo(
  _state: LogoState,
  formData: FormData,
): Promise<LogoState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyLogoState, error: denied };

  const pathValue = formData.get("path");
  const path = typeof pathValue === "string" ? pathValue : "";
  if (!isIncomingLogoPath(path)) {
    return { ...emptyLogoState, error: "Choose a PNG or JPEG logo." };
  }

  const supabase = await createClient();
  const downloaded = await supabase.storage.from(LOGO_BUCKET).download(path);
  if (downloaded.error || !downloaded.data) {
    return { ...emptyLogoState, error: "The logo could not be uploaded." };
  }

  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const inspected = inspectLogo(bytes);
  const expected = path === "incoming.png" ? "png" : "jpg";
  if ("error" in inspected || inspected.format !== expected) {
    await removeLogoObjects(supabase, [path]);
    return {
      ...emptyLogoState,
      error: "error" in inspected ? inspected.error : "Logo must be a PNG or JPEG image.",
    };
  }

  const existing = await supabase
    .from("company_settings")
    .select("id")
    .eq("id", true)
    .maybeSingle();
  if (existing.error) {
    await removeLogoObjects(supabase, [path]);
    return {
      ...emptyLogoState,
      error: settingsErrorMessage(existing.error, "The logo could not be saved."),
    };
  }
  if (!existing.data) {
    await removeLogoObjects(supabase, [path]);
    return { ...emptyLogoState, error: "Save company details before uploading a logo." };
  }

  const finalPath = storedLogoPath(inspected.format);
  const uploaded = await supabase.storage.from(LOGO_BUCKET).upload(
    finalPath,
    new Blob([Uint8Array.from(bytes)], { type: logoContentType(inspected.format) }),
    {
    upsert: true,
    contentType: logoContentType(inspected.format),
    cacheControl: "3600",
  });
  if (uploaded.error) {
    await removeLogoObjects(supabase, [path]);
    return {
      ...emptyLogoState,
      error: settingsErrorMessage(uploaded.error, "The logo could not be saved."),
    };
  }

  const updated = await supabase
    .from("company_settings")
    .update({ logo_url: finalPath })
    .eq("id", true)
    .select("logo_url");
  if (updated.error || !updated.data?.[0]) {
    return {
      ...emptyLogoState,
      error: settingsErrorMessage(updated.error, "The logo could not be saved."),
    };
  }

  const other = inspected.format === "png" ? "logo.jpg" : "logo.png";
  await removeLogoObjects(supabase, [path, other]);
  revalidatePortalSettings();
  return {
    error: null,
    saved: {
      logoUrl: finalPath,
      logoPreviewUrl: await signedLogoUrl(finalPath),
    },
  };
}

export async function removeCompanyLogo(
  _state: LogoState,
  formData: FormData,
): Promise<LogoState> {
  void formData;
  const denied = await adminDenied();
  if (denied) return { ...emptyLogoState, error: denied };

  const supabase = await createClient();
  const updated = await supabase
    .from("company_settings")
    .update({ logo_url: null })
    .eq("id", true)
    .select("logo_url");
  if (updated.error) {
    return {
      ...emptyLogoState,
      error: settingsErrorMessage(updated.error, "The logo could not be removed."),
    };
  }

  const removed = await removeLogoObjects(supabase, [
    "logo.png",
    "logo.jpg",
    "incoming.png",
    "incoming.jpg",
  ]);
  if (removed) {
    return { ...emptyLogoState, error: "The logo file could not be removed." };
  }

  revalidatePortalSettings();
  return { error: null, saved: { logoUrl: null, logoPreviewUrl: null } };
}

async function clearOtherDefault(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exceptId: string,
) {
  const current = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  if (current.error) {
    return {
      error: settingsErrorMessage(current.error, "The current default account could not be changed."),
      clearedId: null as string | null,
    };
  }
  if (!current.data || current.data.id === exceptId) {
    return { error: null as string | null, clearedId: null as string | null };
  }
  const cleared = await supabase
    .from("bank_accounts")
    .update({ is_default: false })
    .eq("id", current.data.id)
    .select("id");
  if (cleared.error || !cleared.data?.length) {
    return {
      error: settingsErrorMessage(
        cleared.error,
        "The current default account could not be changed.",
      ),
      clearedId: null,
    };
  }
  return { error: null, clearedId: current.data.id };
}

export async function saveBankAccount(
  _state: BankFormState,
  formData: FormData,
): Promise<BankFormState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyBankFormState, error: denied };

  const parsed = parseBankForm(formData);
  if (!parsed.ok) return { error: null, fieldErrors: parsed.fieldErrors };

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (id && !isRecordId(id)) {
    return { ...emptyBankFormState, error: "This bank account was not found." };
  }

  const supabase = await createClient();
  let clearedDefaultId: string | null = null;
  if (parsed.value.is_default) {
    const cleared = await clearOtherDefault(supabase, id);
    if (cleared.error) return { ...emptyBankFormState, error: cleared.error };
    clearedDefaultId = cleared.clearedId;
  }

  const result = id
    ? await supabase.from("bank_accounts").update(parsed.value).eq("id", id).select(BANK_COLUMNS)
    : await supabase.from("bank_accounts").insert(parsed.value).select(BANK_COLUMNS);

  if (result.error || !result.data?.[0]) {
    if (clearedDefaultId) {
      await supabase.from("bank_accounts").update({ is_default: true }).eq("id", clearedDefaultId);
    }
    return {
      ...emptyBankFormState,
      error: settingsErrorMessage(result.error, "The bank account could not be saved."),
    };
  }

  revalidatePortalSettings();
  return {
    error: null,
    fieldErrors: {},
    saved: mapBankAccount(result.data[0] as BankRow),
    clearedDefaultId,
  };
}

export async function setBankAccountActive(
  _state: BankMutationState,
  formData: FormData,
): Promise<BankMutationState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyBankMutationState, error: denied };

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isRecordId(id)) return { ...emptyBankMutationState, error: "This bank account was not found." };

  const active = formData.get("is_active") === "true";
  const supabase = await createClient();
  const patch = active
    ? { is_active: true }
    : { is_active: false, is_default: false };
  const updated = await supabase
    .from("bank_accounts")
    .update(patch)
    .eq("id", id)
    .select(BANK_COLUMNS);

  if (updated.error || !updated.data?.[0]) {
    return {
      ...emptyBankMutationState,
      error: settingsErrorMessage(updated.error, "The bank account could not be updated."),
    };
  }

  revalidatePortalSettings();
  return { error: null, saved: mapBankAccount(updated.data[0] as BankRow) };
}

export async function deleteBankAccount(
  _state: BankMutationState,
  formData: FormData,
): Promise<BankMutationState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyBankMutationState, error: denied };

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isRecordId(id)) return { ...emptyBankMutationState, error: "This bank account was not found." };

  const supabase = await createClient();
  const usage = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("bank_account_id", id);
  if (usage.error) {
    return { ...emptyBankMutationState, error: "The bank account could not be deleted." };
  }
  if ((usage.count ?? 0) > 0) {
    return {
      ...emptyBankMutationState,
      error: "This bank account is used on an invoice and cannot be deleted. Deactivate it instead.",
    };
  }

  const deleted = await supabase.from("bank_accounts").delete().eq("id", id).select("id");
  if (deleted.error) {
    return {
      ...emptyBankMutationState,
      error: settingsErrorMessage(deleted.error, "The bank account could not be deleted."),
    };
  }
  if (!deleted.data?.length) {
    return {
      ...emptyBankMutationState,
      error: "This bank account was not found, or you do not have permission to delete it.",
    };
  }

  revalidatePortalSettings();
  return { error: null, deletedId: id };
}

async function suffixesForPeriod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  period: string,
) {
  const numbers = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", isFinancialYearPeriod(period) ? `IF/${period}/%` : `${period}%`);
  if (numbers.error) return { error: numbers.error.message, suffixes: [] as number[] };
  const suffixes: number[] = [];
  for (const row of numbers.data ?? []) {
    const suffix = sequenceSuffix(row.invoice_number, period);
    if (suffix !== null) suffixes.push(suffix);
  }
  return { error: null, suffixes };
}

export async function updateInvoiceSequence(
  _state: NumberingFormState,
  formData: FormData,
): Promise<NumberingFormState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyNumberingFormState, error: denied };

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isRecordId(id)) {
    return { ...emptyNumberingFormState, error: "This numbering period was not found." };
  }

  const supabase = await createClient();
  const existing = await supabase
    .from("invoice_sequences")
    .select("id, period, next_number, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return {
      ...emptyNumberingFormState,
      error: existing.error
        ? settingsErrorMessage(existing.error, "This numbering period was not found.")
        : "This numbering period was not found.",
    };
  }

  const counted = await suffixesForPeriod(supabase, existing.data.period);
  if (counted.error) {
    return { ...emptyNumberingFormState, error: "The numbering counter could not be saved." };
  }
  const floor = numberingFloor(counted.suffixes);
  const parsed = parseNextNumber(String(formData.get("next_number") ?? ""), floor);
  if (!parsed.ok) {
    return { error: null, fieldErrors: { next_number: parsed.error } };
  }

  const updated = await supabase
    .from("invoice_sequences")
    .update({ next_number: parsed.nextNumber })
    .eq("id", id)
    .select("id, period, next_number, updated_at");
  if (updated.error || !updated.data?.[0]) {
    return {
      ...emptyNumberingFormState,
      error: settingsErrorMessage(updated.error, "The numbering counter could not be saved."),
    };
  }

  const row = updated.data[0];
  revalidatePortalSettings();
  return {
    error: null,
    fieldErrors: {},
    saved: buildSequenceRow({
      id: row.id,
      period: row.period,
      nextNumber: row.next_number,
      updatedAt: row.updated_at,
      suffixes: counted.suffixes,
    }),
  };
}

export async function restoreInvoiceSequence(
  _state: NumberingFormState,
  formData: FormData,
): Promise<NumberingFormState> {
  const denied = await adminDenied();
  if (denied) return { ...emptyNumberingFormState, error: denied };

  const periodValue = formData.get("period");
  const period = typeof periodValue === "string" ? periodValue : "";
  if (!isNumberingPeriod(period)) {
    return { ...emptyNumberingFormState, error: "This numbering period is not valid." };
  }

  const supabase = await createClient();
  const existing = await supabase
    .from("invoice_sequences")
    .select("id")
    .eq("period", period)
    .maybeSingle();
  if (existing.error) {
    return {
      ...emptyNumberingFormState,
      error: settingsErrorMessage(existing.error, "The numbering counter could not be restored."),
    };
  }
  if (existing.data) {
    return { ...emptyNumberingFormState, error: "This financial year already has a numbering counter." };
  }

  const counted = await suffixesForPeriod(supabase, period);
  if (counted.error) {
    return { ...emptyNumberingFormState, error: "The numbering counter could not be restored." };
  }
  if (counted.suffixes.length === 0) {
    return {
      ...emptyNumberingFormState,
      error: "This period does not need a counter yet. The first invoice will start at 0001.",
    };
  }

  const floor = numberingFloor(counted.suffixes);
  const inserted = await supabase
    .from("invoice_sequences")
    .insert({ period, next_number: floor })
    .select("id, period, next_number, updated_at");
  if (inserted.error || !inserted.data?.[0]) {
    return {
      ...emptyNumberingFormState,
      error: settingsErrorMessage(inserted.error, "The numbering counter could not be restored."),
    };
  }

  const row = inserted.data[0];
  revalidatePortalSettings();
  return {
    error: null,
    fieldErrors: {},
    saved: buildSequenceRow({
      id: row.id,
      period: row.period,
      nextNumber: row.next_number,
      updatedAt: row.updated_at,
      suffixes: counted.suffixes,
    }),
  };
}
