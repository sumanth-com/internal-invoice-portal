import { isInvoiceId, roundMoney } from "@/lib/invoice";
import {
  isPaymentMode,
  normalizePaymentDate,
  normalizePaymentModeFilter,
  normalizePaymentSearch,
  PAYMENT_LIST_LIMIT,
  paymentBalance,
  type PayableInvoice,
  type PaymentListData,
  type PaymentRecord,
} from "@/lib/payment";
import { createClient } from "@/lib/supabase/server";

export const PAYMENT_COLUMNS = `
  id, invoice_id, amount, payment_date, payment_mode, reference, created_at,
  invoices!inner (
    invoice_number, currency,
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
    beneficiaryName: beneficiary?.legal_name?.trim() || "—",
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
  search: string,
) {
  const { data: beneficiaries, error: beneficiaryError } = await supabase
    .from("beneficiaries")
    .select("id")
    .ilike("legal_name", `%${search}%`);
  if (beneficiaryError) throw beneficiaryError;

  const beneficiaryIds = (beneficiaries ?? []).map((row) => row.id);
  const pattern = `"%${search.replaceAll('"', "")}%"`;
  const filters = [`invoice_number.ilike.${pattern}`];
  if (beneficiaryIds.length > 0) {
    filters.push(`beneficiary_id.in.(${beneficiaryIds.join(",")})`);
  }

  const { data, error } = await supabase.from("invoices").select("id").or(filters.join(","));
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

export async function loadPayments(raw: {
  q?: string;
  mode?: string;
  from?: string;
  to?: string;
}): Promise<PaymentListData> {
  const search = normalizePaymentSearch(raw.q);
  const mode = normalizePaymentModeFilter(raw.mode);
  const from = normalizePaymentDate(raw.from);
  const to = normalizePaymentDate(raw.to);
  const supabase = await createClient();

  let query = supabase
    .from("invoice_payments")
    .select(PAYMENT_COLUMNS)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(PAYMENT_LIST_LIMIT + 1);

  if (mode !== "all") query = query.eq("payment_mode", mode);
  if (from) query = query.gte("payment_date", from);
  if (to) query = query.lte("payment_date", to);

  if (search) {
    const invoiceIds = await invoiceIdsForSearch(supabase, search);
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
    mode,
    from,
    to,
    truncated,
  };
}

export async function loadInvoicePayments(invoiceId: string) {
  if (!isInvoiceId(invoiceId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_payments")
    .select(PAYMENT_COLUMNS)
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PaymentRow[]).map(mapPayment);
}

export async function loadPayableInvoices(): Promise<PayableInvoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, total, currency, beneficiaries(legal_name), invoice_payments(amount)",
    )
    .eq("status", "issued")
    .order("invoice_number", { ascending: false });
  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const beneficiary = one(
      row.beneficiaries as Embedded<{ legal_name: string }>,
    );
    const paid = roundMoney(
      ((row.invoice_payments ?? []) as { amount: number | string }[]).reduce(
        (sum, payment) => sum + money(payment.amount),
        0,
      ),
    );
    const balance = paymentBalance(money(row.total), paid, "issued");
    if (!(balance.outstanding > 0)) return [];
    return [
      {
        id: row.id,
        invoiceNumber: row.invoice_number,
        beneficiaryName: beneficiary?.legal_name?.trim() || "—",
        currency: row.currency,
        total: money(row.total),
        amountPaid: balance.amountPaid,
        outstanding: balance.outstanding,
      },
    ];
  });
}
