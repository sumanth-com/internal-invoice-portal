"use server";

import {
  beneficiaryErrorMessage,
  beneficiaryToRow,
  isBeneficiaryId,
  parseBeneficiaryForm,
  type BeneficiaryFormState,
  type BeneficiaryMutationState,
} from "@/lib/beneficiary";
import {
  BENEFICIARY_COLUMNS,
  beneficiaryHasInvoices,
  mapBeneficiary,
} from "@/lib/beneficiaries";
import { getPortalUser } from "@/lib/portal-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const { data, error } = await supabase
    .from("beneficiaries")
    .insert(beneficiaryToRow(parsed.value))
    .select(BENEFICIARY_COLUMNS)
    .single();

  if (error || !data) {
    return denied(
      beneficiaryErrorMessage(error, "The beneficiary could not be added."),
    );
  }

  return { error: null, fieldErrors: {}, saved: mapBeneficiary(data) };
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
  const { data, error } = await supabase
    .from("beneficiaries")
    .update(beneficiaryToRow(parsed.value))
    .eq("id", id)
    .select(BENEFICIARY_COLUMNS);

  if (error) {
    return denied(
      beneficiaryErrorMessage(error, "The beneficiary could not be saved."),
    );
  }
  if (!data?.length) {
    return denied("This beneficiary was not found, or you do not have permission to edit it.");
  }

  return { error: null, fieldErrors: {}, saved: mapBeneficiary(data[0]) };
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
    .select("id")
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

  revalidatePath("/beneficiaries");
  revalidatePath("/dashboard");
  redirect("/beneficiaries?notice=deleted");
}
