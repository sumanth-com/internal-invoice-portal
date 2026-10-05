import {
  formatInvoiceDate,
  formatMoney,
  isInvoiceStatus,
  roundMoney,
  statusLabel,
  type InvoiceStatus,
} from "@/lib/invoice";
import {
  PAYMENT_MODES,
  isPaymentMode,
  paymentModeLabel,
  type PaymentMode,
} from "@/lib/payment";

export const REPORT_RANGES = ["month", "last_month", "quarter", "year", "custom"] as const;

export type ReportRange = (typeof REPORT_RANGES)[number];

export const REPORT_STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "cancelled"];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MONTHS = 36;

export type ReportInvoice = {
  id: string;
  number: string;
  date: string;
  beneficiaryId: string;
  beneficiaryName: string;
  status: InvoiceStatus;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  total: number;
  tdsAmount: number;
  balanceDue: number;
  currency: string;
  amountPaid: number;
  outstanding: number;
  payments: { amount: number; date: string; mode: PaymentMode }[];
};

export type ReportMonth = {
  key: string;
  label: string;
  count: number;
  value: number;
  valueLabel: string;
};

export type ReportView = {
  range: ReportRange;
  from: string;
  to: string;
  error: string | null;
  currency: string;
  totalInvoices: number;
  totalValue: string;
  totalGst: string;
  amountPaid: string;
  outstanding: string;
  statuses: { status: InvoiceStatus; label: string; count: number; amount: string }[];
  months: ReportMonth[];
  hasInvoices: boolean;
  payments: {
    received: string;
    count: number;
    average: string;
    outstanding: string;
    modes: { mode: PaymentMode; label: string; count: number; amount: string }[];
  };
  gst: {
    subtotal: string;
    cgst: string;
    sgst: string;
    igst: string;
    gst: string;
    total: string;
    tds: string;
    balanceDue: string;
  };
  beneficiaries: {
    active: number;
    withInvoices: number;
    top: { id: string; name: string; count: number; value: string }[];
  };
  recent: {
    id: string;
    number: string;
    beneficiary: string;
    date: string;
    total: string;
    status: InvoiceStatus;
  }[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function lastDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function monthSpan(from: string, to: string) {
  const start = parts(from);
  const end = parts(to);
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

export function eachReportMonth(from: string, to: string) {
  const months: string[] = [];
  const end = parts(to);
  let cursor = { year: parts(from).year, month: parts(from).month };
  while (cursor.year < end.year || (cursor.year === end.year && cursor.month <= end.month)) {
    months.push(`${cursor.year}-${pad(cursor.month)}`);
    cursor = shiftMonth(cursor.year, cursor.month, 1);
  }
  return months;
}

function monthLabel(key: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${key}-01T00:00:00+05:30`));
}

export function isReportRange(value: string): value is ReportRange {
  return (REPORT_RANGES as readonly string[]).includes(value);
}

export function reportPreset(range: Exclude<ReportRange, "custom">, today: string) {
  const { year, month } = parts(today);
  if (range === "month") {
    return { from: isoDate(year, month, 1), to: isoDate(year, month, lastDay(year, month)) };
  }
  if (range === "last_month") {
    const previous = shiftMonth(year, month, -1);
    return {
      from: isoDate(previous.year, previous.month, 1),
      to: isoDate(previous.year, previous.month, lastDay(previous.year, previous.month)),
    };
  }
  if (range === "quarter") {
    const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const end = shiftMonth(year, startMonth, 2);
    return {
      from: isoDate(year, startMonth, 1),
      to: isoDate(end.year, end.month, lastDay(end.year, end.month)),
    };
  }
  return { from: isoDate(year, 1, 1), to: isoDate(year, 12, 31) };
}

export function resolveReportRange(
  raw: { range?: string; from?: string; to?: string },
  today: string,
): { range: ReportRange; from: string; to: string; error: string | null } {
  const range = raw.range && isReportRange(raw.range) ? raw.range : "month";
  if (range !== "custom") {
    const preset = reportPreset(range, today);
    return { range, ...preset, error: null };
  }

  const from = DATE_PATTERN.test(raw.from ?? "") ? (raw.from as string) : "";
  const to = DATE_PATTERN.test(raw.to ?? "") ? (raw.to as string) : "";
  if (!from || !to) {
    return { range, from, to, error: "Choose a start and end date." };
  }
  if (from > to) {
    return { range, from, to, error: "The start date must be on or before the end date." };
  }
  if (monthSpan(from, to) > MAX_MONTHS) {
    return { range, from, to, error: "Choose a range of 36 months or less." };
  }
  return { range, from, to, error: null };
}

export const REPORT_TYPES = ["all", "invoices", "gst", "payments", "outstanding", "beneficiaries"] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  all: "All reports",
  invoices: "Invoices",
  gst: "GST",
  payments: "Payments / Collections",
  outstanding: "Outstanding",
  beneficiaries: "Beneficiaries",
};

export type ReportCard = "invoices" | "value" | "gst" | "paid" | "outstanding";

export function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

export function reportTypeFromParam(value: string | undefined): ReportType {
  if (value === "collections") return "payments";
  return value && isReportType(value) ? value : "all";
}

export function reportCardFromParams(type: ReportType, card: string | undefined): ReportCard | null {
  if (type === "invoices" && card === "value") return "value";
  if (type === "invoices") return "invoices";
  if (type === "gst") return "gst";
  if (type === "payments") return "paid";
  if (type === "outstanding") return "outstanding";
  return null;
}

const BENEFICIARY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function beneficiaryIdFromParam(value: string | undefined) {
  const id = value?.trim() ?? "";
  return BENEFICIARY_ID.test(id) ? id : "";
}

export function reportBeneficiaryOptions(invoices: ReportInvoice[]) {
  const names = new Map<string, string>();
  for (const invoice of invoices) {
    if (!names.has(invoice.beneficiaryId)) names.set(invoice.beneficiaryId, invoice.beneficiaryName);
  }
  return [...names.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function filterReportInvoices(
  invoices: ReportInvoice[],
  options: { type: ReportType; query: string; beneficiaryId?: string },
) {
  const query = options.query.trim().toLowerCase();
  const beneficiaryId = options.beneficiaryId ?? "";
  return invoices.filter((invoice) => {
    if (beneficiaryId && invoice.beneficiaryId !== beneficiaryId) return false;
    if (query) {
      const haystack = [
        invoice.number,
        invoice.beneficiaryName,
        statusLabel(invoice.status),
        ...invoice.payments.map((payment) => paymentModeLabel(payment.mode)),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (options.type === "outstanding") return invoice.outstanding > 0;
    if (options.type === "payments") return invoice.amountPaid > 0 || invoice.payments.length > 0;
    return true;
  });
}

export function reportBeneficiaryRows(invoices: ReportInvoice[]) {
  const currency = invoices.every((invoice) => invoice.currency === invoices[0]?.currency)
    ? (invoices[0]?.currency ?? "INR")
    : "INR";
  const rows = new Map<string, { id: string; name: string; count: number; value: number }>();
  for (const invoice of invoices) {
    const current = rows.get(invoice.beneficiaryId) ?? {
      id: invoice.beneficiaryId,
      name: invoice.beneficiaryName,
      count: 0,
      value: 0,
    };
    current.count += 1;
    current.value += invoice.total;
    rows.set(invoice.beneficiaryId, current);
  }
  return [...rows.values()]
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name))
    .map((row) => ({
      ...row,
      valueLabel: formatMoney(roundMoney(row.value), currency),
    }));
}

export function reportPageHref(options: {
  type?: ReportType;
  card?: ReportCard | null;
  from?: string;
  to?: string;
  query?: string;
  beneficiary?: string;
}) {
  const params = new URLSearchParams();
  const type = options.type ?? "all";
  if (type !== "all") params.set("type", type);
  if (options.card === "value") params.set("card", "value");
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.from || options.to) params.set("range", "custom");
  const query = options.query?.trim();
  if (query) params.set("q", query);
  const beneficiary = beneficiaryIdFromParam(options.beneficiary);
  if (beneficiary) params.set("beneficiary", beneficiary);
  const search = params.toString();
  return search ? `/reports?${search}` : "/reports";
}

export function reportExportHref(
  format: "xlsx" | "pdf",
  options: { from: string; to: string; type: ReportType; query: string; beneficiary?: string },
) {
  const params = new URLSearchParams({
    format,
    range: "custom",
    from: options.from,
    to: options.to,
    type: options.type,
  });
  const query = options.query.trim();
  if (query) params.set("q", query);
  const beneficiary = beneficiaryIdFromParam(options.beneficiary);
  if (beneficiary) params.set("beneficiary", beneficiary);
  return `/reports/export?${params.toString()}`;
}

export function reportHref(range: ReportRange, from = "", to = "") {
  const params = new URLSearchParams({ range });
  if (range === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return `/reports?${params.toString()}`;
}

function moneyLabel(amount: number, currency: string) {
  return formatMoney(roundMoney(amount), currency);
}

function paymentDates(invoice: ReportInvoice) {
  return [...new Set(invoice.payments.map((payment) => payment.date).filter(Boolean))].sort();
}

export function buildReport(
  invoices: ReportInvoice[],
  options: { range: ReportRange; from: string; to: string; activeBeneficiaries: number },
): ReportView {
  const currency = invoices.every((invoice) => invoice.currency === invoices[0]?.currency)
    ? (invoices[0]?.currency ?? "INR")
    : "INR";
  const months = eachReportMonth(options.from, options.to).map((key) => ({
    key,
    label: monthLabel(key),
    count: 0,
    value: 0,
    valueLabel: moneyLabel(0, currency),
  }));
  const monthIndex = new Map(months.map((month, index) => [month.key, index]));
  const statuses = REPORT_STATUSES.map((status) => ({
    status,
    label: statusLabel(status),
    count: 0,
    amountValue: 0,
  }));
  const statusIndex = new Map(statuses.map((status, index) => [status.status, index]));
  const modes = PAYMENT_MODES.map((mode) => ({
    mode,
    label: paymentModeLabel(mode),
    count: 0,
    amountValue: 0,
  }));
  const modeIndex = new Map(modes.map((mode, index) => [mode.mode, index]));
  const beneficiaries = new Map<string, { id: string; name: string; count: number; value: number }>();

  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let gst = 0;
  let total = 0;
  let tds = 0;
  let balanceDue = 0;
  let amountPaid = 0;
  let outstanding = 0;
  let paymentCount = 0;

  for (const invoice of invoices) {
    if (!isInvoiceStatus(invoice.status)) continue;
    subtotal += invoice.subtotal;
    cgst += invoice.cgstAmount;
    sgst += invoice.sgstAmount;
    igst += invoice.igstAmount;
    gst += invoice.gstAmount;
    total += invoice.total;
    tds += invoice.tdsAmount;
    balanceDue += invoice.balanceDue;
    amountPaid += invoice.amountPaid;
    outstanding += invoice.outstanding;

    const status = statuses[statusIndex.get(invoice.status) ?? -1];
    if (status) {
      status.count += 1;
      status.amountValue += invoice.total;
    }

    const month = months[monthIndex.get(invoice.date.slice(0, 7)) ?? -1];
    if (month) {
      month.count += 1;
      month.value += invoice.total;
    }

    const beneficiary = beneficiaries.get(invoice.beneficiaryId) ?? {
      id: invoice.beneficiaryId,
      name: invoice.beneficiaryName,
      count: 0,
      value: 0,
    };
    beneficiary.count += 1;
    beneficiary.value += invoice.total;
    beneficiaries.set(invoice.beneficiaryId, beneficiary);

    for (const payment of invoice.payments) {
      paymentCount += 1;
      const mode = modes[modeIndex.get(payment.mode) ?? -1];
      if (!mode) continue;
      mode.count += 1;
      mode.amountValue += payment.amount;
    }
  }

  for (const month of months) month.valueLabel = moneyLabel(month.value, currency);

  const recent = [...invoices]
    .sort((left, right) => {
      if (left.date !== right.date) return left.date < right.date ? 1 : -1;
      return left.number < right.number ? 1 : -1;
    })
    .slice(0, 8)
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      beneficiary: invoice.beneficiaryName,
      date: formatInvoiceDate(invoice.date),
      total: moneyLabel(invoice.total, invoice.currency || currency),
      status: invoice.status,
    }));

  return {
    range: options.range,
    from: options.from,
    to: options.to,
    error: null,
    currency,
    totalInvoices: invoices.length,
    totalValue: moneyLabel(total, currency),
    totalGst: moneyLabel(gst, currency),
    amountPaid: moneyLabel(amountPaid, currency),
    outstanding: moneyLabel(outstanding, currency),
    statuses: statuses.map((status) => ({
      status: status.status,
      label: status.label,
      count: status.count,
      amount: moneyLabel(status.amountValue, currency),
    })),
    months,
    hasInvoices: invoices.length > 0,
    payments: {
      received: moneyLabel(amountPaid, currency),
      count: paymentCount,
      average: moneyLabel(paymentCount > 0 ? amountPaid / paymentCount : 0, currency),
      outstanding: moneyLabel(outstanding, currency),
      modes: modes.map((mode) => ({
        mode: mode.mode,
        label: mode.label,
        count: mode.count,
        amount: moneyLabel(mode.amountValue, currency),
      })),
    },
    gst: {
      subtotal: moneyLabel(subtotal, currency),
      cgst: moneyLabel(cgst, currency),
      sgst: moneyLabel(sgst, currency),
      igst: moneyLabel(igst, currency),
      gst: moneyLabel(gst, currency),
      total: moneyLabel(total, currency),
      tds: moneyLabel(tds, currency),
      balanceDue: moneyLabel(balanceDue, currency),
    },
    beneficiaries: {
      active: options.activeBeneficiaries,
      withInvoices: beneficiaries.size,
      top: [...beneficiaries.values()]
        .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name))
        .slice(0, 5)
        .map((beneficiary) => ({
          id: beneficiary.id,
          name: beneficiary.name,
          count: beneficiary.count,
          value: moneyLabel(beneficiary.value, currency),
        })),
    },
    recent,
  };
}

export function emptyReport(
  range: { range: ReportRange; from: string; to: string; error: string | null },
  activeBeneficiaries = 0,
): ReportView {
  const view = buildReport([], { ...range, activeBeneficiaries });
  return { ...view, error: range.error };
}

function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function reportCsv(invoices: ReportInvoice[]) {
  const header = [
    "Invoice number",
    "Invoice date",
    "Beneficiary",
    "Subtotal",
    "CGST",
    "SGST",
    "IGST",
    "Total GST",
    "Invoice total",
    "TDS",
    "Balance due",
    "Status",
    "Amount paid",
    "Outstanding",
    "Payment date",
  ];
  const lines = [header.join(",")];
  const ordered = [...invoices].sort((left, right) => {
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    return left.number < right.number ? -1 : 1;
  });
  for (const invoice of ordered) {
    lines.push(
      [
        invoice.number,
        invoice.date,
        invoice.beneficiaryName,
        roundMoney(invoice.subtotal).toFixed(2),
        roundMoney(invoice.cgstAmount).toFixed(2),
        roundMoney(invoice.sgstAmount).toFixed(2),
        roundMoney(invoice.igstAmount).toFixed(2),
        roundMoney(invoice.gstAmount).toFixed(2),
        roundMoney(invoice.total).toFixed(2),
        roundMoney(invoice.tdsAmount).toFixed(2),
        roundMoney(invoice.balanceDue).toFixed(2),
        statusLabel(invoice.status),
        roundMoney(invoice.amountPaid).toFixed(2),
        roundMoney(invoice.outstanding).toFixed(2),
        paymentDates(invoice).join("; "),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function reportExportName(from: string, to: string) {
  return `invoice-report-${from}-to-${to}.csv`;
}

export function normalizePaymentMode(value: string): PaymentMode {
  return isPaymentMode(value) ? value : "other";
}
