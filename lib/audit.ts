import { datesAreCurrentMonth, formatMoney, periodDateBounds, statusLabel, type InvoiceStatus } from "@/lib/invoice";
import { isPaymentMode, paymentModeLabel } from "@/lib/payment";

export const AUDIT_PAGE_SIZE = 40;

export const AUDIT_ACTIONS = [
  "created",
  "updated",
  "issued",
  "payment_recorded",
  "payment_updated",
  "payment_deleted",
  "paid",
  "cancelled",
  "duplicated",
  "pdf_downloaded",
  "emailed",
  "exported",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const PAYMENT_AUDIT_ACTIONS: readonly AuditAction[] = [
  "payment_recorded",
  "payment_updated",
  "payment_deleted",
  "paid",
];

export const INVOICE_AUDIT_ACTIONS: readonly AuditAction[] = AUDIT_ACTIONS.filter(
  (action) => !PAYMENT_AUDIT_ACTIONS.includes(action),
);

export type AuditGroup = "all" | "invoice" | "payment";

const ACTION_LABELS: Record<AuditAction, string> = {
  created: "Invoice Created",
  updated: "Invoice Updated",
  issued: "Invoice Issued",
  payment_recorded: "Payment Recorded",
  payment_updated: "Payment Updated",
  payment_deleted: "Payment Deleted",
  paid: "Invoice Paid",
  cancelled: "Invoice Cancelled",
  duplicated: "Invoice Duplicated",
  pdf_downloaded: "PDF Downloaded",
  emailed: "Invoice Emailed",
  exported: "Invoice Exported",
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AuditActorOption = {
  id: string;
  name: string;
  email: string;
};

export type AuditDetail = {
  statusChange: string | null;
  amount: string | null;
  paymentDate: string | null;
  paymentMode: string | null;
  reference: string | null;
  recipient: string | null;
  sourceInvoice: string | null;
};

export type AuditEntry = {
  id: string;
  createdAt: string;
  action: AuditAction;
  invoiceId: string;
  invoiceNumber: string;
  actorName: string;
  actorEmail: string | null;
  summary: string;
  detail: AuditDetail;
};

export type AuditLogPage = {
  entries: AuditEntry[];
  total: number;
  today: number;
  invoiceEvents: number;
  paymentEvents: number;
  filtered: number;
  page: number;
  pageCount: number;
  search: string;
  action: AuditAction | "all";
  group: AuditGroup;
  user: string;
  from: string;
  to: string;
  users: AuditActorOption[];
};

export function auditActionLabel(action: AuditAction) {
  return ACTION_LABELS[action];
}

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export function isPaymentAuditAction(action: AuditAction) {
  return (PAYMENT_AUDIT_ACTIONS as readonly AuditAction[]).includes(action);
}

export function normalizeAuditSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[%_,()\\'"]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function normalizeAuditAction(value: string | undefined): AuditAction | "all" {
  if (value && isAuditAction(value)) return value;
  return "all";
}

export function normalizeAuditGroup(value: string | undefined): AuditGroup {
  if (value === "invoice" || value === "payment") return value;
  return "all";
}

export function normalizeAuditUser(value: string | undefined) {
  const text = (value ?? "").trim();
  return UUID_PATTERN.test(text) ? text : "all";
}

export function normalizeAuditDate(value: string | undefined) {
  const text = (value ?? "").trim();
  return DATE_PATTERN.test(text) ? text : "";
}

export function auditToOnOrAfterFrom(from: string, to: string) {
  if (!from || !to || to >= from) return to;
  const end = periodDateBounds(`${from.slice(0, 4)}${from.slice(5, 7)}`).end;
  return end < from ? from : end;
}

export function normalizeAuditPage(value: string | undefined) {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;
  return Math.min(page, 500);
}

export function kolkataDayStart(date: string) {
  return new Date(`${date}T00:00:00+05:30`).toISOString();
}

export function kolkataNextDayStart(date: string) {
  const start = new Date(`${date}T00:00:00+05:30`);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export function formatAuditTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
  return `${formatted} IST`;
}

export function auditLogHref(
  filters: Pick<AuditLogPage, "search" | "action" | "group" | "user" | "from" | "to">,
  page = 1,
) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.action !== "all") params.set("action", filters.action);
  if (filters.group !== "all") params.set("group", filters.group);
  if (filters.user !== "all") params.set("user", filters.user);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/audit?${query}` : "/audit";
}

export function auditFiltersActive(
  filters: Pick<AuditLogPage, "search" | "action" | "group" | "user" | "from" | "to">,
) {
  return (
    filters.search.length > 0 ||
    filters.action !== "all" ||
    filters.group !== "all" ||
    filters.user !== "all" ||
    !datesAreCurrentMonth(filters.from, filters.to)
  );
}

function textValue(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function statusName(value: string | null) {
  if (
    value === "draft" ||
    value === "issued" ||
    value === "paid" ||
    value === "cancelled"
  ) {
    return statusLabel(value as InvoiceStatus);
  }
  return null;
}

export function sourceInvoiceId(metadata: Record<string, unknown>) {
  const value = textValue(metadata, ["source_invoice_id"]);
  return value && UUID_PATTERN.test(value) ? value : null;
}

export function describeAuditMetadata(
  action: AuditAction,
  metadata: Record<string, unknown>,
  currency: string,
  sourceNumbers: ReadonlyMap<string, string> = new Map(),
): { summary: string; detail: AuditDetail } {
  const fromStatus = statusName(textValue(metadata, ["from_status"]));
  const toStatus = statusName(textValue(metadata, ["to_status"]));
  const statusChange = fromStatus && toStatus ? `${fromStatus} to ${toStatus}` : null;

  const amountValue = metadata.amount;
  const amountNumber =
    typeof amountValue === "number"
      ? amountValue
      : typeof amountValue === "string"
        ? Number(amountValue)
        : Number.NaN;
  const amount = Number.isFinite(amountNumber) ? formatMoney(amountNumber, currency || "INR") : null;

  const paymentDateValue = textValue(metadata, ["payment_date"]);
  const paymentDate =
    paymentDateValue && /^\d{4}-\d{2}-\d{2}/.test(paymentDateValue)
      ? paymentDateValue.slice(0, 10)
      : null;
  const modeValue = textValue(metadata, ["payment_mode"]);
  const paymentMode = modeValue && isPaymentMode(modeValue) ? paymentModeLabel(modeValue) : null;
  const reference = textValue(metadata, ["reference"]);
  const recipient = textValue(metadata, ["recipient", "recipient_email", "email", "to"]);
  const sourceId = sourceInvoiceId(metadata);
  const sourceInvoice =
    textValue(metadata, ["source_invoice_number", "source_invoice", "from_invoice_number"]) ??
    (sourceId ? (sourceNumbers.get(sourceId) ?? null) : null);

  const detail: AuditDetail = {
    statusChange,
    amount,
    paymentDate,
    paymentMode,
    reference,
    recipient,
    sourceInvoice,
  };

  const parts: string[] = [];
  if (isPaymentAuditAction(action)) {
    if (amount) parts.push(amount);
    if (paymentMode) parts.push(paymentMode);
    if (reference) parts.push(reference);
  }
  if (statusChange && parts.length === 0) parts.push(statusChange);
  if (recipient) parts.push(recipient);
  if (sourceInvoice) parts.push(`From ${sourceInvoice}`);

  return {
    summary: parts.length > 0 ? parts.join(" · ") : "—",
    detail,
  };
}
