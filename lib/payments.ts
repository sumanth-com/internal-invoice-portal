import { isBeneficiaryId } from "@/lib/beneficiary";
import { currentMonthRange, isInvoiceId, roundMoney } from "@/lib/invoice";
import {
  isPaymentMode,
  normalizePaymentDate,
  normalizePaymentModeFilter,
  normalizePaymentSearch,
  PAYMENT_LIST_LIMIT,
  type PayableInvoice,
  type PaymentBeneficiaryOption,
  type PaymentListData,
  type PaymentRecord,
} from "@/lib/payment";
import { activeOwnerId } from "@/lib/owner-scope";
import { createClient } from "@/lib/supabase/server";

export const PAYMENT_COLUMNS = `
  id, invoice_id, amount, payment_date, payment_mode, reference, created_at,
  invoices!inner (
    invoice_number, currency, beneficiary_id, bill_to, created_by,
    beneficiaries ( legal_name )
  ),
  profiles ( full_name, email )
`;

type Embedded<T> = T | T[] | null;

export type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number | string;
  payment_date: string;
  payment_mode: string;
  reference: string | null;
  created_at: string;
  invoices: Embedded<{
    invoice_number: string;
    currency: string;
    beneficiary_id: string;
    bill_to: string | null;
    created_by: string;
    beneficiaries: Embedded<{ legal_name: string }>;
  }>;
  profiles: Embedded<{ full_name: string | null; email: string | null }>;
};

function one<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function money(value: number | string) {
  return Number(value);
}

export function mapPayment(row: PaymentRow): PaymentRecord {
  const invoice = one(row.invoices);
  const beneficiary = one(invoice?.beneficiaries ?? null);
  const profile = one(row.profiles);
  const createdByName = profile?.full_name?.trim() || profile?.email?.trim() || "—";
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    invoiceNumber: invoice?.invoice_number ?? "—",
    beneficiaryId: invoice?.beneficiary_id ?? "",
    beneficiaryName:
      beneficiary?.legal_name?.trim() ||
      invoice?.bill_to?.split(/\r?\n/).map((part) => part.trim()).find((part) => part.length > 0) ||
      "—",
    paymentDate: row.payment_date,
    paymentMode: isPaymentMode(row.payment_mode) ? row.payment_mode : "other",
    reference: row.reference,
    amount: money(row.amount),
    currency: invoice?.currency ?? "INR",
    createdByName,
    createdAt: row.created_at,
  };
}

async function invoiceIdsForSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  search: string,
) {
  const { data: beneficiaries, error: beneficiaryError } = await supabase
    .from("beneficiaries")
    .select("id")
    .eq("created_by", ownerId)
    .ilike("legal_name", `%${search}%`);
  if (beneficiaryError) throw beneficiaryError;

  const beneficiaryIds = (beneficiaries ?? []).map((row) => row.id);
  const pattern = `"%${search.replaceAll('"', "")}%"`;
  const filters = [`invoice_number.ilike.${pattern}`];
  if (beneficiaryIds.length > 0) {
    filters.push(`beneficiary_id.in.(${beneficiaryIds.join(",")})`);
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("created_by", ownerId)
    .or(filters.join(","));
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

export async function loadPaymentBeneficiaries(): Promise<PaymentBeneficiaryOption[]> {
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();
  const pageSize = 1000;
  const rows: PaymentBeneficiaryOption[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("id, legal_name")
      .eq("created_by", ownerId)
      .order("legal_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    for (const row of page) {
      rows.push({ id: row.id, name: row.legal_name?.trim() || "—" });
    }
    if (page.length < pageSize) break;
  }

  return rows;
}

export async function loadPayments(raw: {
  q?: string;
  beneficiary?: string;
  mode?: string;
  from?: string;
  to?: string;
}): Promise<PaymentListData> {
  const search = normalizePaymentSearch(raw.q);
  const beneficiary = isBeneficiaryId((raw.beneficiary ?? "").trim()) ? raw.beneficiary!.trim() : "all";
  const mode = normalizePaymentModeFilter(raw.mode);
  const month = currentMonthRange();
  const from = normalizePaymentDate(raw.from) || month.from;
  const to = normalizePaymentDate(raw.to) || month.to;
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();

  let query = supabase
    .from("invoice_payments")
    .select(PAYMENT_COLUMNS)
    .eq("invoices.created_by", ownerId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAYMENT_LIST_LIMIT + 1);

  if (beneficiary !== "all") query = query.eq("invoices.beneficiary_id", beneficiary);
  if (mode !== "all") query = query.eq("payment_mode", mode);
  if (from) query = query.gte("payment_date", from);
  if (to) query = query.lte("payment_date", to);

  if (search) {
    const invoiceIds = await invoiceIdsForSearch(supabase, ownerId, search);
    const pattern = `"%${search.replaceAll('"', "")}%"`;
    const filters = [`reference.ilike.${pattern}`];
    if (invoiceIds.length > 0) filters.push(`invoice_id.in.(${invoiceIds.join(",")})`);
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as PaymentRow[];
  const truncated = rows.length > PAYMENT_LIST_LIMIT;
  return {
    payments: (truncated ? rows.slice(0, PAYMENT_LIST_LIMIT) : rows).map(mapPayment),
    search,
    beneficiary,
    mode,
    from,
    to,
    truncated,
  };
}

export async function loadInvoicePayments(invoiceId: string) {
  if (!isInvoiceId(invoiceId)) return [];
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_payments")
    .select(PAYMENT_COLUMNS)
    .eq("invoice_id", invoiceId)
    .eq("invoices.created_by", ownerId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PaymentRow[]).map(mapPayment);
}

export async function loadPayableInvoices(): Promise<PayableInvoice[]> {
  const ownerId = (await activeOwnerId()) ?? "";
  if (!ownerId) return [];
  const supabase = await createClient();
  const { data: balances, error: balanceError } = await supabase
    .from("invoice_balances")
    .select("invoice_id, amount_paid, outstanding, status")
    .eq("status", "issued")
    .gt("outstanding", 0);
  if (balanceError) throw balanceError;

  const eligible = (balances ?? []).filter(
    (row) => row.status === "issued" && Number(row.outstanding) > 0,
  );
  if (eligible.length === 0) return [];

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, currency, bill_to, beneficiaries(legal_name)")
    .eq("created_by", ownerId)
    .eq("status", "issued")
    .in(
      "id",
      eligible.map((row) => row.invoice_id),
    )
    .order("invoice_number", { ascending: false });
  if (error) throw error;

  const byId = new Map(eligible.map((row) => [row.invoice_id, row]));
  return (data ?? []).flatMap((row) => {
    const balance = byId.get(row.id);
    const outstanding = roundMoney(Number(balance?.outstanding ?? 0));
    if (!(outstanding > 0)) return [];
    const beneficiary = one(row.beneficiaries as Embedded<{ legal_name: string }>);
    return [
      {
        id: row.id,
        invoiceNumber: row.invoice_number,
        beneficiaryName:
          beneficiary?.legal_name?.trim() ||
          (typeof row.bill_to === "string"
            ? row.bill_to
                .split(/\r?\n/)
                .map((part) => part.trim())
                .find((part) => part.length > 0)
            : "") ||
          "—",
        currency: row.currency,
        total: money(row.total),
        amountPaid: roundMoney(Number(balance?.amount_paid ?? 0)),
        outstanding,
      },
    ];
  });
}
