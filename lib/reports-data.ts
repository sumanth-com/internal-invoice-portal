import { invoiceToday, isInvoiceStatus, roundMoney } from "@/lib/invoice";
import { paymentBalance } from "@/lib/payment";
import {
  buildReport,
  emptyReport,
  normalizePaymentMode,
  resolveReportRange,
  type ReportInvoice,
  type ReportView,
} from "@/lib/reports";
import { activeOwnerId } from "@/lib/owner-scope";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

const INVOICE_COLUMNS = `
  id, invoice_number, invoice_date, status, subtotal, cgst_amount, sgst_amount, igst_amount, gst_amount, total, tds_amount, balance_due, currency, beneficiary_id, bill_to,
  beneficiaries ( legal_name ),
  invoice_payments ( amount, payment_date, payment_mode )
`;

type Embedded<T> = T | T[] | null;

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  subtotal: number | string;
  cgst_amount: number | string;
  sgst_amount: number | string;
  igst_amount: number | string;
  gst_amount: number | string;
  total: number | string;
  tds_amount: number | string;
  balance_due: number | string;
  currency: string | null;
  beneficiary_id: string;
  bill_to: string | null;
  beneficiaries: Embedded<{ legal_name: string }>;
  invoice_payments: Embedded<{
    amount: number | string;
    payment_date: string;
    payment_mode: string;
  }>;
};

function one<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? roundMoney(amount) : 0;
}

function mapInvoice(row: InvoiceRow): ReportInvoice | null {
  if (!isInvoiceStatus(row.status)) return null;
  const beneficiary = one(row.beneficiaries);
  const paymentValue = row.invoice_payments;
  const payments = (Array.isArray(paymentValue) ? paymentValue : paymentValue ? [paymentValue] : []).map(
    (payment) => ({
      amount: money(payment.amount),
      date: payment.payment_date,
      mode: normalizePaymentMode(payment.payment_mode),
    }),
  );
  const paid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const balanceDue = money(row.balance_due);
  const balance = paymentBalance(balanceDue, paid, row.status);
  return {
    id: row.id,
    number: row.invoice_number,
    date: row.invoice_date,
    beneficiaryId: row.beneficiary_id,
    beneficiaryName:
      beneficiary?.legal_name?.trim() ||
      row.bill_to?.split(/\r?\n/).map((part) => part.trim()).find((part) => part.length > 0) ||
      "—",
    status: row.status,
    subtotal: money(row.subtotal),
    cgstAmount: money(row.cgst_amount),
    sgstAmount: money(row.sgst_amount),
    igstAmount: money(row.igst_amount),
    gstAmount: money(row.gst_amount),
    total: money(row.total),
    tdsAmount: money(row.tds_amount),
    balanceDue,
    currency: row.currency?.trim() || "INR",
    amountPaid: balance.amountPaid,
    outstanding: balance.outstanding,
    payments,
  };
}

async function invoicesInRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  from: string,
  to: string,
) {
  const rows: InvoiceRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_COLUMNS)
      .eq("created_by", ownerId)
      .gte("invoice_date", from)
      .lte("invoice_date", to)
      .order("invoice_date", { ascending: false })
      .order("invoice_number", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as InvoiceRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows.flatMap((row) => {
    const invoice = mapInvoice(row);
    return invoice ? [invoice] : [];
  });
}

export async function loadReport(raw: {
  range?: string;
  from?: string;
  to?: string;
}): Promise<{ view: ReportView; invoices: ReportInvoice[] }> {
  const range = resolveReportRange(raw, invoiceToday());
  if (range.error || !range.from || !range.to) {
    return { view: emptyReport(range), invoices: [] };
  }

  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();
  const [loaded, activeResult] = await Promise.all([
    invoicesInRange(supabase, ownerId, range.from, range.to),
    supabase
      .from("beneficiaries")
      .select("id", { count: "exact", head: true })
      .eq("created_by", ownerId)
      .eq("is_active", true),
  ]);
  if (activeResult.error) throw new Error(activeResult.error.message);

  let invoices = loaded;
  if (loaded.length > 0) {
    const ids = loaded.map((invoice) => invoice.id);
    const chunks: string[][] = [];
    for (let index = 0; index < ids.length; index += 200) chunks.push(ids.slice(index, index + 200));
    const balances = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("invoice_balances")
          .select("invoice_id, amount_paid, outstanding")
          .in("invoice_id", chunk),
      ),
    );
    const failed = balances.find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
    const byId = new Map(
      balances.flatMap((result) => result.data ?? []).map((row) => [row.invoice_id, row]),
    );
    invoices = loaded.map((invoice) => {
      const balance = byId.get(invoice.id);
      if (!balance) return invoice;
      return {
        ...invoice,
        amountPaid: money(balance.amount_paid),
        outstanding: money(balance.outstanding),
      };
    });
  }

  return {
    invoices,
    view: buildReport(invoices, {
      range: range.range,
      from: range.from,
      to: range.to,
      activeBeneficiaries: activeResult.count ?? 0,
    }),
  };
}
