import {
  BENEFICIARY_LIST_LIMIT,
  isBeneficiaryId,
  normalizeBeneficiarySearch,
  normalizeBeneficiaryStatus,
  type Beneficiary,
  type BeneficiaryListData,
  type BeneficiaryStatusFilter,
  type BeneficiarySummary,
} from "@/lib/beneficiary";
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
  };
}

export const BENEFICIARY_COLUMNS =
  "id, legal_name, contact_name, email, phone, address_line1, address_line2, city, state, postal_code, country, gstin, pan, notes, is_active, created_at, updated_at";

export function mapBeneficiary(row: BeneficiaryRow): Beneficiary {
  return {
    ...mapSummary(row),
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
  active: boolean,
) {
  const { count, error } = await supabase
    .from("beneficiaries")
    .select("id", { count: "exact", head: true })
    .eq("is_active", active);
  if (error) throw error;
  return count ?? 0;
}

export async function loadBeneficiaries(
  rawSearch: string | undefined,
  rawStatus: string | undefined,
): Promise<BeneficiaryListData> {
  const search = normalizeBeneficiarySearch(rawSearch);
  const status: BeneficiaryStatusFilter = normalizeBeneficiaryStatus(rawStatus);
  const supabase = await createClient();

  let listQuery = supabase
    .from("beneficiaries")
    .select("id, legal_name, contact_name, email, phone, gstin, city, is_active")
    .order("legal_name", { ascending: true })
    .limit(BENEFICIARY_LIST_LIMIT + 1);

  if (status === "active") listQuery = listQuery.eq("is_active", true);
  if (status === "inactive") listQuery = listQuery.eq("is_active", false);

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

  const [{ data, error }, active, inactive] = await Promise.all([
    listQuery,
    countBeneficiaries(supabase, true),
    countBeneficiaries(supabase, false),
  ]);

  if (error) throw error;
  const total = active + inactive;

  const rows = data ?? [];
  const truncated = rows.length > BENEFICIARY_LIST_LIMIT;

  return {
    beneficiaries: (truncated ? rows.slice(0, BENEFICIARY_LIST_LIMIT) : rows).map(
      mapSummary,
    ),
    total,
    active,
    inactive,
    search,
    status,
    truncated,
  };
}

export async function loadBeneficiary(id: string): Promise<Beneficiary | null> {
  if (!isBeneficiaryId(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficiaries")
    .select(BENEFICIARY_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapBeneficiary(data) : null;
}

export async function beneficiaryHasInvoices(id: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("beneficiary_id", id);

  if (error) throw error;
  return (count ?? 0) > 0;
}
