import { isInvoiceId, roundMoney } from "@/lib/invoice";

export const PAYMENT_MODES = [
  "neft",
  "rtgs",
  "imps",
  "upi",
  "cheque",
  "cash",
  "other",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export type PaymentRecord = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  beneficiaryName: string;
  paymentDate: string;
  paymentMode: PaymentMode;
  reference: string | null;
  amount: number;
  currency: string;
  createdByName: string;
  createdAt: string;
};

export type PayableInvoice = {
  id: string;
  invoiceNumber: string;
  beneficiaryName: string;
  currency: string;
  total: number;
  amountPaid: number;
  outstanding: number;
};

export type PaymentListData = {
  payments: PaymentRecord[];
  search: string;
  mode: PaymentMode | "all";
  from: string;
  to: string;
  truncated: boolean;
};

export type RecordedPayment = {
  payment: PaymentRecord;
  total: number;
  amountPaid: number;
  outstanding: number;
  invoiceStatus: "issued" | "paid";
};

export type PaymentField = "invoice_id" | "amount" | "payment_date" | "payment_mode" | "reference";

export type PaymentFormState = {
  error: string | null;
  fieldErrors: Partial<Record<PaymentField, string>>;
  saved?: RecordedPayment;
};

export const emptyPaymentFormState: PaymentFormState = {
  error: null,
  fieldErrors: {},
};

export const PAYMENT_LIST_LIMIT = 100;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT = 9_999_999_999_999.99;

const MODE_LABELS: Record<PaymentMode, string> = {
  neft: "NEFT",
  rtgs: "RTGS",
  imps: "IMPS",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  other: "Other",
};

export function isPaymentMode(value: string): value is PaymentMode {
  return (PAYMENT_MODES as readonly string[]).includes(value);
}

export function paymentModeLabel(mode: PaymentMode) {
  return MODE_LABELS[mode];
}

export function normalizePaymentSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[%_,.()\\'"]/g, "")
    .slice(0, 80);
}

export function normalizePaymentModeFilter(value: string | undefined): PaymentMode | "all" {
  if (value && isPaymentMode(value)) return value;
  return "all";
}

export function normalizePaymentDate(value: string | undefined) {
  const text = (value ?? "").trim();
  return DATE_PATTERN.test(text) ? text : "";
}

export function paymentBalance(total: number, amountPaid: number, status: string) {
  const paid = roundMoney(amountPaid);
  if (status === "draft" || status === "cancelled") {
    return { amountPaid: paid, outstanding: 0 };
  }
  return {
    amountPaid: paid,
    outstanding: roundMoney(Math.max(total - paid, 0)),
  };
}

export function parsePaymentForm(formData: FormData):
  | {
      ok: true;
      value: {
        invoiceId: string;
        amount: number;
        paymentDate: string;
        paymentMode: PaymentMode;
        reference: string | null;
      };
    }
  | { ok: false; fieldErrors: PaymentFormState["fieldErrors"] } {
  const errors: PaymentFormState["fieldErrors"] = {};
  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  if (!isInvoiceId(invoiceId)) errors.invoice_id = "Select an issued invoice.";

  const amountText = String(formData.get("amount") ?? "").trim();
  let amount = 0;
  if (!AMOUNT_PATTERN.test(amountText)) {
    errors.amount = "Enter an amount greater than zero, with up to 2 decimal places.";
  } else {
    amount = roundMoney(Number(amountText));
    if (!(amount > 0) || amount > MAX_AMOUNT) {
      errors.amount = "Enter an amount greater than zero, with up to 2 decimal places.";
    }
  }

  const paymentDate = String(formData.get("payment_date") ?? "").trim();
  if (!DATE_PATTERN.test(paymentDate)) errors.payment_date = "Enter a payment date.";

  const mode = String(formData.get("payment_mode") ?? "").trim();
  if (!isPaymentMode(mode)) errors.payment_mode = "Select a payment mode.";

  const referenceText = String(formData.get("reference") ?? "").trim();
  if (referenceText.length > 120) {
    errors.reference = "Reference must be 120 characters or fewer.";
  }

  if (Object.keys(errors).length > 0 || !isPaymentMode(mode)) {
    return { ok: false, fieldErrors: errors };
  }

  return {
    ok: true,
    value: {
      invoiceId,
      amount,
      paymentDate,
      paymentMode: mode,
      reference: referenceText || null,
    },
  };
}

export function paymentErrorMessage(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  const message = error?.message ?? "";
  const known = [
    "Payments cannot exceed the invoice total",
    "Payments are allowed only for issued invoices",
    "Payment records cannot be changed",
    "Only an active member can record a payment",
    "Invoice does not exist",
  ];
  const match = known.find((item) => message.includes(item));
  if (match) return match.endsWith(".") ? match : `${match}.`;
  if (error?.code === "23514" && /amount/i.test(message)) {
    return "Enter an amount greater than zero.";
  }
  if (error?.code === "42501" || /row-level security/i.test(message)) {
    return "You do not have permission to record a payment.";
  }
  return fallback;
}
