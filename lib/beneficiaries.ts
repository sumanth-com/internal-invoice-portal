import {
  BENEFICIARY_LIST_LIMIT,
  isBeneficiaryId,
  normalizeBeneficiaryCompany,
  normalizeBeneficiaryContact,
  normalizeBeneficiarySearch,
  normalizeBeneficiaryStatus,
  type Beneficiary,
  type BeneficiaryListData,
  type BeneficiaryStatusFilter,
  type BeneficiarySummary,
} from "@/lib/beneficiary";
import { signBeneficiaryLogoMap } from "@/lib/beneficiary-logo";
import { activeOwnerId } from "@/lib/owner-scope";
import { createClient } from "@/lib/supabase/server";

type BeneficiaryRow = {
  id: string;
  legal_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  gstin: string | null;
  pan: string | null;
  notes: string | null;
  is_active: boolean;
  logo_path: string | null;
  created_at: string;
  updated_at: string;
};

function mapSummary(row: Pick<
  BeneficiaryRow,
  | "id"
  | "legal_name"
  | "contact_name"
  | "email"
  | "phone"
  | "gstin"
  | "city"
  | "is_active"
  | "logo_path"
>): BeneficiarySummary {
  return {
    id: row.id,
    legalName: row.legal_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    gstin: row.gstin,
    city: row.city,
    isActive: row.is_active,
    logoUrl: null,
  };
}

export const BENEFICIARY_COLUMNS =
  "id, legal_name, contact_name, email, phone, address_line1, address_line2, city, state, postal_code, country, gstin, pan, notes, is_active, logo_path, created_at, updated_at";

export function mapBeneficiary(row: BeneficiaryRow): Beneficiary {
  return {
    ...mapSummary(row),
    logoPath: row.logo_path,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    pan: row.pan,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function countBeneficiaries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  active: boolean,
) {
  const { count, error } = await supabase
    .from("beneficiaries")
    .select("id", { count: "exact", head: true })
    .eq("created_by", ownerId)
    .eq("is_active", active);
  if (error) throw error;
  return count ?? 0;
}

export async function loadBeneficiaries(
  rawSearch: string | undefined,
  rawStatus: string | undefined,
  rawContact: string | undefined,
  rawCompany: string | undefined,
): Promise<BeneficiaryListData> {
  const search = normalizeBeneficiarySearch(rawSearch);
  const status: BeneficiaryStatusFilter = normalizeBeneficiaryStatus(rawStatus);
  const contact = normalizeBeneficiaryContact(rawContact);
  const company = normalizeBeneficiaryCompany(rawCompany);
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();

  let listQuery = supabase
    .from("beneficiaries")
    .select("id, legal_name, contact_name, email, phone, gstin, city, is_active, logo_path")
    .eq("created_by", ownerId)
    .order("legal_name", { ascending: true })
    .limit(BENEFICIARY_LIST_LIMIT + 1);

  if (status === "active") listQuery = listQuery.eq("is_active", true);
  if (status === "inactive") listQuery = listQuery.eq("is_active", false);
  if (contact) listQuery = listQuery.eq("contact_name", contact);
  if (company) listQuery = listQuery.eq("legal_name", company);

  const namesQuery = supabase
    .from("beneficiaries")
    .select("legal_name, contact_name")
    .eq("created_by", ownerId)
    .order("legal_name", { ascending: true });

  if (search) {
    const pattern = `"%${search.replaceAll('"', "")}%"`;
    listQuery = listQuery.or(
      [
        `legal_name.ilike.${pattern}`,
        `contact_name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
        `gstin.ilike.${pattern}`,
        `pan.ilike.${pattern}`,
        `city.ilike.${pattern}`,
      ].join(","),
    );
  }

  const [{ data, error }, namesResult, active, inactive] = await Promise.all([
    listQuery,
    namesQuery,
    countBeneficiaries(supabase, ownerId, true),
    countBeneficiaries(supabase, ownerId, false),
  ]);

  if (error) throw error;
  if (namesResult.error) throw namesResult.error;
  const total = active + inactive;

  const rows = data ?? [];
  const truncated = rows.length > BENEFICIARY_LIST_LIMIT;
  const nameRows = namesResult.data ?? [];
  const contactNames = [
    ...new Set(
      nameRows
        .map((row) => row.contact_name?.trim() ?? "")
        .filter((name) => name.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const companyNames = [
    ...new Set(
      nameRows
        .map((row) => row.legal_name?.trim() ?? "")
        .filter((name) => name.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));

  const visible = truncated ? rows.slice(0, BENEFICIARY_LIST_LIMIT) : rows;
  const logos = await signBeneficiaryLogoMap(
    supabase,
    visible.map((row) => row.logo_path),
  );

  return {
    beneficiaries: visible.map((row) => ({
      ...mapSummary(row),
      logoUrl: row.logo_path ? logos.get(row.logo_path) ?? null : null,
    })),
    total,
    active,
    inactive,
    search,
    status,
    contact,
    company,
    contactNames,
    companyNames,
    truncated,
  };
}

export async function loadBeneficiary(id: string): Promise<Beneficiary | null> {
  if (!isBeneficiaryId(id)) return null;

  const ownerId = await activeOwnerId();
  if (!ownerId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficiaries")
    .select(BENEFICIARY_COLUMNS)
    .eq("id", id)
    .eq("created_by", ownerId)
    .maybeSingle();

  if (error) throw error;
  return data ? signBeneficiaryRecord(supabase, mapBeneficiary(data)) : null;
}

export async function signBeneficiaryRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  beneficiary: Beneficiary,
): Promise<Beneficiary> {
  if (!beneficiary.logoPath) return { ...beneficiary, logoUrl: null };
  const logos = await signBeneficiaryLogoMap(supabase, [beneficiary.logoPath]);
  return { ...beneficiary, logoUrl: logos.get(beneficiary.logoPath) ?? null };
}

export async function beneficiaryLogoUrls(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => id.length > 0))];
  const urls = new Map<string, string | null>();
  if (unique.length === 0) return urls;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficiaries")
    .select("id, logo_path")
    .in("id", unique);
  if (error) throw error;
  const signed = await signBeneficiaryLogoMap(
    supabase,
    (data ?? []).map((row) => row.logo_path),
  );
  for (const row of data ?? []) {
    urls.set(row.id, row.logo_path ? signed.get(row.logo_path) ?? null : null);
  }
  return urls;
}

export async function invoiceBeneficiaryIds() {
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("beneficiary_id")
    .eq("created_by", ownerId);
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((row) => row.beneficiary_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
}

export async function beneficiaryIdsOnInvoices(ids: string[]) {
  const unique = [...new Set(ids.filter(isBeneficiaryId))];
  if (unique.length === 0) return new Set<string>();
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("beneficiary_id")
    .eq("created_by", ownerId)
    .in("beneficiary_id", unique);
  if (error) throw error;
  return new Set(
    (data ?? [])
      .map((row) => row.beneficiary_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );
}

export async function beneficiaryHasInvoices(id: string) {
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("created_by", ownerId)
    .eq("beneficiary_id", id);

  if (error) throw error;
  return (count ?? 0) > 0;
}
