import { createClient } from "@/lib/supabase/server";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

export type DashboardInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  beneficiaryName: string;
};

export type DashboardData = {
  total: number;
  draft: number;
  issued: number;
  paid: number;
  beneficiaryCount: number;
  invoices: DashboardInvoice[];
  search: string;
  truncated: boolean;
};

const RECENT_LIMIT = 8;
const SEARCH_LIMIT = 25;

const STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "cancelled"];

export function normalizeInvoiceSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[%_,.()\\]/g, "")
    .slice(0, 80);
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return STATUSES.includes(value as InvoiceStatus);
}

function beneficiaryName(
  billTo: string | null,
  names: Map<string, string>,
  beneficiaryId: string,
) {
  const legalName = names.get(beneficiaryId)?.trim();
  if (legalName) return legalName;
  const billedTo = billTo?.trim();
  return billedTo || "—";
}

async function countInvoices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  status?: InvoiceStatus,
) {
  let query = supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function loadDashboard(rawSearch: string | undefined): Promise<DashboardData> {
  const search = normalizeInvoiceSearch(rawSearch);
  const supabase = await createClient();
  const listLimit = search ? SEARCH_LIMIT : RECENT_LIMIT;

  const counts = Promise.all([
    countInvoices(supabase),
    countInvoices(supabase, "draft"),
    countInvoices(supabase, "issued"),
    countInvoices(supabase, "paid"),
    supabase
      .from("beneficiaries")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) throw error;
        return count ?? 0;
      }),
  ]);

  let beneficiaryIds: string[] = [];
  if (search) {
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("id")
      .ilike("legal_name", `%${search}%`);
    if (error) throw error;
    beneficiaryIds = (data ?? []).map((row) => row.id);
  }

  let invoiceQuery = supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_date, status, total, currency, bill_to, beneficiary_id, beneficiaries(legal_name)",
    )
    .order("created_at", { ascending: false })
    .limit(listLimit + 1);

  if (search) {
    const pattern = `"%${search.replaceAll('"', "")}%"`;
    const filters = [
      `invoice_number.ilike.${pattern}`,
      `bill_to.ilike.${pattern}`,
    ];
    if (beneficiaryIds.length > 0) {
      filters.push(`beneficiary_id.in.(${beneficiaryIds.join(",")})`);
    }
    invoiceQuery = invoiceQuery.or(filters.join(","));
  }

  const [{ data, error }, [total, draft, issued, paid, beneficiaryCount]] =
    await Promise.all([invoiceQuery, counts]);

  if (error) throw error;

  const rows = data ?? [];
  const truncated = rows.length > listLimit;
  const visible = truncated ? rows.slice(0, listLimit) : rows;
  const names = new Map<string, string>();
  for (const row of visible) {
    const embedded = row.beneficiaries as
      | { legal_name: string }
      | { legal_name: string }[]
      | null;
    const record = Array.isArray(embedded) ? embedded[0] : embedded;
    if (record?.legal_name) names.set(row.beneficiary_id, record.legal_name);
  }

  return {
    total,
    draft,
    issued,
    paid,
    beneficiaryCount,
    search,
    truncated,
    invoices: visible.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date,
      status: isInvoiceStatus(row.status) ? row.status : "draft",
      total: Number(row.total),
      currency: row.currency,
      beneficiaryName: beneficiaryName(row.bill_to, names, row.beneficiary_id),
    })),
  };
}
