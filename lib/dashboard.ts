import { createClient } from "@/lib/supabase/server";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

export type DashboardInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: InvoiceStatus;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  total: number;
  tdsAmount: number;
  balanceDue: number;
  amountPaid: number;
  outstanding: number;
  currency: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryEmail: string | null;
};

export type DashboardData = {
  total: number;
  draft: number;
  issued: number;
  paid: number;
  cancelled: number;
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

function embeddedBeneficiary(
  value: { legal_name: string; email: string | null } | { legal_name: string; email: string | null }[] | null,
) {
  return Array.isArray(value) ? value[0] : value;
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
    countInvoices(supabase, "cancelled"),
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
      "id, invoice_number, invoice_date, status, subtotal, cgst_amount, sgst_amount, igst_amount, gst_amount, total, tds_amount, balance_due, currency, bill_to, beneficiary_id, beneficiaries(legal_name, email)",
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

  const [{ data, error }, [total, draft, issued, paid, cancelled, beneficiaryCount]] =
    await Promise.all([invoiceQuery, counts]);

  if (error) throw error;

  const rows = data ?? [];
  const truncated = rows.length > listLimit;
  const visible = truncated ? rows.slice(0, listLimit) : rows;
  const names = new Map<string, string>();
  const emails = new Map<string, string | null>();
  for (const row of visible) {
    const record = embeddedBeneficiary(row.beneficiaries);
    if (record?.legal_name) names.set(row.beneficiary_id, record.legal_name);
    emails.set(row.beneficiary_id, record?.email?.trim() || null);
  }

  const balances = new Map<string, { amountPaid: number; outstanding: number }>();
  if (visible.length > 0) {
    const balanceResult = await supabase
      .from("invoice_balances")
      .select("invoice_id, amount_paid, outstanding")
      .in(
        "invoice_id",
        visible.map((row) => row.id),
      );
    if (balanceResult.error) throw balanceResult.error;
    for (const row of balanceResult.data ?? []) {
      balances.set(row.invoice_id, {
        amountPaid: Number(row.amount_paid),
        outstanding: Number(row.outstanding),
      });
    }
  }

  return {
    total,
    draft,
    issued,
    paid,
    cancelled,
    beneficiaryCount,
    search,
    truncated,
    invoices: visible.map((row) => {
      const status = isInvoiceStatus(row.status) ? row.status : "draft";
      const totalAmount = Number(row.total);
      const balance = balances.get(row.id);
      const amountPaid = balance?.amountPaid ?? 0;
      const outstanding =
        balance?.outstanding ??
        (status === "draft" || status === "cancelled"
          ? 0
          : Math.max(Number(row.balance_due) - amountPaid, 0));
      return {
        id: row.id,
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        status,
        subtotal: Number(row.subtotal),
        cgstAmount: Number(row.cgst_amount),
        sgstAmount: Number(row.sgst_amount),
        igstAmount: Number(row.igst_amount),
        gstAmount: Number(row.gst_amount),
        total: totalAmount,
        tdsAmount: Number(row.tds_amount),
        balanceDue: Number(row.balance_due),
        amountPaid,
        outstanding,
        currency: row.currency,
        beneficiaryId: row.beneficiary_id,
        beneficiaryName: beneficiaryName(row.bill_to, names, row.beneficiary_id),
        beneficiaryEmail: emails.get(row.beneficiary_id) ?? null,
      };
    }),
  };
}
