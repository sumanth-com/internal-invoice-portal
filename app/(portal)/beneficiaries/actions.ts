"use server";

import {
  beneficiaryErrorMessage,
  beneficiaryToRow,
  isBeneficiaryId,
  parseBeneficiaryForm,
  type Beneficiary,
  type BeneficiaryFormState,
  type BeneficiaryMutationState,
} from "@/lib/beneficiary";
import {
  beneficiaryLogoPathFromForm,
  removeBeneficiaryLogo,
} from "@/lib/beneficiary-logo";
import {
  BENEFICIARY_COLUMNS,
  beneficiaryHasInvoices,
  loadBeneficiary,
  mapBeneficiary,
  signBeneficiaryRecord,
} from "@/lib/beneficiaries";
import { recordBeneficiaryNotification } from "@/lib/portal-notifications";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

function denied(message: string): BeneficiaryFormState {
  return { error: message, fieldErrors: {} };
}

export async function createBeneficiary(
  _state: BeneficiaryFormState,
  formData: FormData,
): Promise<BeneficiaryFormState> {
  const parsed = parseBeneficiaryForm(formData);
  if (!parsed.ok) {
    return { error: null, fieldErrors: parsed.fieldErrors };
  }

  const user = await getPortalUser();
  if (!user?.isActive) {
    return denied("You do not have permission to add a beneficiary.");
  }

  const supabase = await createClient();
  const logo = beneficiaryLogoPathFromForm(user.id, formData, null);
  if ("error" in logo) return denied(logo.error);

  const { data, error } = await supabase
    .from("beneficiaries")
    .insert({ ...beneficiaryToRow(parsed.value), logo_path: logo.path })
    .select(BENEFICIARY_COLUMNS)
    .single();

  if (error || !data) {
    await removeBeneficiaryLogo(supabase, logo.path);
    return denied(
      beneficiaryErrorMessage(error, "The beneficiary could not be added."),
    );
  }

  const saved = await signBeneficiaryRecord(supabase, mapBeneficiary(data));
  await recordBeneficiaryNotification(saved.id, saved.legalName, true);
  return { error: null, fieldErrors: {}, saved };
}

export async function updateBeneficiary(
  _state: BeneficiaryFormState,
  formData: FormData,
): Promise<BeneficiaryFormState> {
  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isBeneficiaryId(id)) {
    return denied("This beneficiary was not found.");
  }

  const parsed = parseBeneficiaryForm(formData);
  if (!parsed.ok) {
    return { error: null, fieldErrors: parsed.fieldErrors };
  }

  const user = await getPortalUser();
  if (!user?.isActive) {
    return denied("You do not have permission to edit this beneficiary.");
  }

  const supabase = await createClient();
  const existing = await supabase
    .from("beneficiaries")
    .select("logo_path")
    .eq("id", id)
    .maybeSingle();
  if (existing.error) {
    return denied("The beneficiary could not be saved.");
  }
  if (!existing.data) {
    return denied("This beneficiary was not found, or you do not have permission to edit it.");
  }

  const logo = beneficiaryLogoPathFromForm(user.id, formData, existing.data.logo_path);
  if ("error" in logo) return denied(logo.error);

  const { data, error } = await supabase
    .from("beneficiaries")
    .update({ ...beneficiaryToRow(parsed.value), logo_path: logo.path })
    .eq("id", id)
    .select(BENEFICIARY_COLUMNS);

  if (error) {
    if (logo.path && logo.path !== existing.data.logo_path) {
      await removeBeneficiaryLogo(supabase, logo.path);
    }
    return denied(
      beneficiaryErrorMessage(error, "The beneficiary could not be saved."),
    );
  }
  if (!data?.length) {
    if (logo.path && logo.path !== existing.data.logo_path) {
      await removeBeneficiaryLogo(supabase, logo.path);
    }
    return denied("This beneficiary was not found, or you do not have permission to edit it.");
  }

  if (existing.data.logo_path && existing.data.logo_path !== logo.path) {
    await removeBeneficiaryLogo(supabase, existing.data.logo_path);
  }

  const saved = await signBeneficiaryRecord(supabase, mapBeneficiary(data[0]));
  await recordBeneficiaryNotification(saved.id, saved.legalName, false);
  return { error: null, fieldErrors: {}, saved };
}

export async function deleteBeneficiary(
  _state: BeneficiaryMutationState,
  formData: FormData,
): Promise<BeneficiaryMutationState> {
  const user = await getPortalUser();
  if (!user?.isActive || user.role !== "admin") {
    return { error: "Only an admin can delete a beneficiary." };
  }

  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? idValue : "";
  if (!isBeneficiaryId(id)) {
    return { error: "This beneficiary was not found." };
  }

  const supabase = await createClient();
  const existing = await supabase
    .from("beneficiaries")
    .select("id, logo_path")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) {
    return { error: "The beneficiary could not be deleted." };
  }
  if (!existing.data) {
    return { error: "This beneficiary was not found." };
  }

  try {
    if (await beneficiaryHasInvoices(id)) {
      return {
        error:
          "This beneficiary is used on invoices. Deactivate it instead of deleting.",
      };
    }
  } catch {
    return { error: "The beneficiary could not be deleted." };
  }

  const { data, error } = await supabase
    .from("beneficiaries")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      error: beneficiaryErrorMessage(
        error,
        "The beneficiary could not be deleted.",
      ),
    };
  }
  if (!data?.length) {
    return { error: "Only an admin can delete a beneficiary." };
  }

  await removeBeneficiaryLogo(supabase, existing.data.logo_path);
  revalidatePath("/beneficiaries");
  revalidatePath("/dashboard");
  redirect("/beneficiaries?notice=deleted");
}

export async function setBeneficiaryStatus(
  id: string,
  isActive: boolean,
): Promise<{ ok: true; isActive: boolean } | { ok: false; error: string }> {
  const user = await getPortalUser();
  if (!user?.isActive) {
    return { ok: false, error: "You do not have permission to edit this beneficiary." };
  }
  if (!isBeneficiaryId(id)) {
    return { ok: false, error: "This beneficiary was not found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficiaries")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id, legal_name, is_active");

  if (error) {
    return {
      ok: false,
      error: beneficiaryErrorMessage(error, "The beneficiary status could not be saved."),
    };
  }
  if (!data?.length) {
    return { ok: false, error: "This beneficiary was not found, or you do not have permission to edit it." };
  }

  const saved = data[0];
  await recordBeneficiaryNotification(saved.id, saved.legal_name, false);
  revalidatePath("/beneficiaries");
  return { ok: true, isActive: saved.is_active };
}

export async function fetchBeneficiary(
  id: string,
): Promise<{ ok: true; beneficiary: Beneficiary } | { ok: false; error: string }> {
  try {
    const user = await getPortalUser();
    if (!user?.isActive) {
      return { ok: false, error: "You do not have permission to edit this beneficiary." };
    }
    const beneficiary = await loadBeneficiary(id);
    if (!beneficiary) return { ok: false, error: "This beneficiary was not found." };
    return { ok: true, beneficiary };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "This beneficiary could not be loaded.",
    };
  }
}
