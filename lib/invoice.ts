import { hasLegacyGst, previewTax, supplyIsIntrastate } from "@/lib/gst";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

export type InvoiceSort =
  | "date_desc"
  | "date_asc"
  | "number_asc"
  | "number_desc"
  | "total_asc"
  | "total_desc"
  | "beneficiary_asc"
  | "status_asc";

export type InvoiceFormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

export type InvoiceMutationState = {
  error: string | null;
};

export type InvoiceLineInput = {
  description: string;
  hsn: string | null;
  quantity: number;
  rate: number;
};

export type InvoiceInput = {
  beneficiaryId: string;
  bankAccountId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  billFrom: string | null;
  billTo: string | null;
  placeOfSupply: string | null;
  supplyState: string | null;
  stateCode: string | null;
  clientGstin: string | null;
  dealReference: string | null;
  currency: string;
  paymentTerms: string | null;
  notes: string | null;
  gstEnabled: boolean;
  gstRate: number;
  tdsAmount: number;
  items: InvoiceLineInput[];
};

export type InvoiceLine = InvoiceLineInput & {
  id: string;
  position: number;
  lineSubtotal: number;
};

export type InvoicePartyOption = {
  id: string;
  legalName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  gstin: string | null;
  pan: string | null;
  isActive: boolean;
  logoUrl: string | null;
};

export type BankAccountOption = {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string | null;
  branch: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export type CompanyInvoiceDefaults = {
  billFrom: string;
  fromParty: InvoicePartyFields;
  currency: string;
  paymentTerms: string;
  notes: string;
  gstEnabled: boolean;
  gstRate: number;
};

export type InvoicePartyFields = {
  companyName: string;
  tradeName: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  country: string;
  gstin: string;
  pan: string;
  cin: string;
  contactName: string;
  email: string;
  phone: string;
};

export const emptyPartyFields: InvoicePartyFields = {
  companyName: "",
  tradeName: "",
  address: "",
  state: "",
  city: "",
  pincode: "",
  country: "",
  gstin: "",
  pan: "",
  cin: "",
  contactName: "",
  email: "",
  phone: "",
};

export type InvoicePaymentStanding = "draft" | "cancelled" | "unpaid" | "partial" | "paid";

export type InvoicePaymentFilter = "all" | "unpaid" | "partial" | "paid";

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  beneficiaryName: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  tdsAmount: number;
  balanceDue: number;
  currency: string;
  status: InvoiceStatus;
  paymentStanding: InvoicePaymentStanding;
};

export type InvoiceBeneficiaryOption = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export type InvoiceListData = {
  invoices: InvoiceSummary[];
  total: number;
  search: string;
  beneficiary: string;
  beneficiaries: InvoiceBeneficiaryOption[];
  invoiceNumbers: string[];
  status: InvoiceStatus | "all";
  payment: InvoicePaymentFilter;
  from: string;
  to: string;
  sort: InvoiceSort;
  truncated: boolean;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryEmail: string | null;
  bankAccountId: string | null;
  bank: BankAccountOption | null;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string | null;
  billFrom: string | null;
  billTo: string | null;
  currency: string;
  paymentTerms: string | null;
  notes: string | null;
  placeOfSupply: string | null;
  supplyState: string | null;
  stateCode: string | null;
  clientGstin: string | null;
  dealReference: string | null;
  gstEnabled: boolean;
  gstRate: number;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  total: number;
  tdsAmount: number;
  balanceDue: number;
  amountInWords: string;
  issuedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: InvoiceLine[];
};

export const INVOICE_LIST_LIMIT = 100;

export const emptyInvoiceFormState: InvoiceFormState = {
  error: null,
  fieldErrors: {},
};

const STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "cancelled"];
const SORTS: InvoiceSort[] = [
  "date_desc",
  "date_asc",
  "number_asc",
  "number_desc",
  "total_asc",
  "total_desc",
  "beneficiary_asc",
  "status_asc",
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isInvoiceId(value: string) {
  return UUID_PATTERN.test(value);
}

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return STATUSES.includes(value as InvoiceStatus);
}

export function normalizeInvoiceSearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[%_,.()\\'"]/g, "")
    .slice(0, 80);
}

export function normalizeInvoiceStatusFilter(value: string | undefined) {
  if (value && isInvoiceStatus(value)) return value;
  return "all" as const;
}

const PAYMENT_FILTERS: InvoicePaymentFilter[] = ["unpaid", "partial", "paid"];

export function normalizeInvoicePaymentFilter(value: string | undefined): InvoicePaymentFilter {
  if (value && PAYMENT_FILTERS.includes(value as InvoicePaymentFilter)) return value as InvoicePaymentFilter;
  return "all";
}

export function isInvoicePaymentStanding(value: string): value is InvoicePaymentStanding {
  return value === "draft" || value === "cancelled" || value === "unpaid" || value === "partial" || value === "paid";
}

export function paymentStandingLabel(standing: InvoicePaymentStanding) {
  if (standing === "unpaid") return "Pending";
  if (standing === "partial") return "Partially Paid";
  if (standing === "paid") return "Paid";
  if (standing === "cancelled") return "Cancelled";
  return "Draft";
}

export function normalizeInvoiceSort(value: string | undefined): InvoiceSort {
  if (value && SORTS.includes(value as InvoiceSort)) return value as InvoiceSort;
  return "date_desc";
}

export function normalizeInvoiceDateFilter(value: string | undefined) {
  return canonicalInvoiceDate(value ?? "") ?? "";
}

export function canonicalInvoiceDate(value: string) {
  const text = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const dayFirstMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = isoMatch
    ? text
    : dayFirstMatch
      ? `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}`
      : "";
  if (!iso) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return iso;
}

export function formatDayMonthYear(value: string) {
  const iso = canonicalInvoiceDate(value);
  if (!iso) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function normalizeInvoiceBeneficiary(value: string | undefined) {
  return value && isInvoiceId(value) ? value : "";
}

export function invoiceNumberSearchTerms(value: string) {
  const search = value.trim();
  const terms = new Set<string>();
  if (search) terms.add(search);
  const compact = search.replace(/[\s/]/g, "").toUpperCase();
  const financialYear = /^IF(\d{2})-?(\d{2})(\d{4})$/.exec(compact);
  if (financialYear) {
    terms.add(`IF/${financialYear[1]}-${financialYear[2]}/${financialYear[3]}`);
  }
  return [...terms];
}

export function invoiceListHref(options: {
  search?: string;
  beneficiary?: string;
  status?: InvoiceStatus | "all";
  payment?: InvoicePaymentFilter;
  from?: string;
  to?: string;
  sort?: InvoiceSort;
}) {
  const params = new URLSearchParams();
  const search = options.search?.trim();
  if (search) params.set("q", search);
  if (options.beneficiary && isInvoiceId(options.beneficiary)) {
    params.set("beneficiary", options.beneficiary);
  }
  if (options.status && options.status !== "all") params.set("status", options.status);
  if (options.payment && options.payment !== "all") params.set("payment", options.payment);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.sort && options.sort !== "date_desc") params.set("sort", options.sort);
  const query = params.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

export function invoiceNotice(value: string | undefined) {
  if (
    value === "saved" ||
    value === "issued" ||
    value === "cancelled" ||
    value === "deleted"
  ) {
    return value;
  }
  return null;
}

export function invoiceToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const FINANCIAL_YEAR_NUMBER = /^IF\/(\d{2})-(\d{2})\/\d{4}$/;
const MONTHLY_NUMBER = /^[0-9]{8,}$/;

export function isFinancialYearNumber(invoiceNumber: string) {
  return FINANCIAL_YEAR_NUMBER.test(invoiceNumber);
}

export function financialYearLabel(date: string) {
  if (!DATE_PATTERN.test(date)) return null;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  const end = start + 1;
  return `${String(start).slice(2)}-${String(end).slice(2)}`;
}

export function financialYearBounds(label: string) {
  const match = /^(\d{2})-(\d{2})$/.exec(label);
  if (!match) return null;
  const start = 2000 + Number(match[1]);
  const end = 2000 + Number(match[2]);
  if (end !== start + 1) return null;
  return { start: `${start}-04-01`, end: `${end}-03-31` };
}

export function invoiceNumberPeriod(invoiceNumber: string) {
  return invoiceNumber.slice(0, 6);
}

export function invoiceDateWindow(invoiceNumber: string) {
  if (MONTHLY_NUMBER.test(invoiceNumber)) return periodDateBounds(invoiceNumber.slice(0, 6));
  const match = FINANCIAL_YEAR_NUMBER.exec(invoiceNumber);
  if (!match) return null;
  return financialYearBounds(`${match[1]}-${match[2]}`);
}

export function periodDateBounds(period: string) {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));
  const last = new Date(year, month, 0).getDate();
  const mm = period.slice(4, 6);
  const yyyy = period.slice(0, 4);
  return {
    start: `${yyyy}-${mm}-01`,
    end: `${yyyy}-${mm}-${String(last).padStart(2, "0")}`,
  };
}

export function currentMonthRange(today = invoiceToday()) {
  const bounds = periodDateBounds(today.slice(0, 4) + today.slice(5, 7));
  return { from: bounds.start, to: bounds.end };
}

export function datesAreCurrentMonth(from: string, to: string, today = invoiceToday()) {
  const month = currentMonthRange(today);
  return from === month.from && to === month.to;
}

export function dateOnOrAfter(start: string, end: string) {
  if (start && end && end < start) return start;
  return end;
}

export function statusLabel(status: InvoiceStatus) {
  if (status === "draft") return "Draft";
  if (status === "issued") return "Issued";
  if (status === "paid") return "Paid";
  return "Cancelled";
}

export function paymentStandingAfterStatusChange(
  current: InvoicePaymentStanding,
  next: InvoiceStatus,
): InvoicePaymentStanding {
  if (next === "cancelled") return "cancelled";
  if (next === "paid") return "paid";
  if (next === "draft") return "draft";
  if (current === "draft" || current === "cancelled") return "unpaid";
  return current;
}

export function formatInvoiceDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatInvoiceTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function roundMoney(value: number) {
  return Math.round(Number((value * 100).toFixed(8))) / 100;
}

export function previewTotals(
  items: Pick<InvoiceLineInput, "quantity" | "rate">[],
  gstEnabled: boolean,
  gstRate: number,
  options: {
    tdsAmount?: number;
    companyState?: string | null;
    companyGstin?: string | null;
    supplyState?: string | null;
    stateCode?: string | null;
    placeOfSupply?: string | null;
  } = {},
) {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + roundMoney(item.quantity * item.rate), 0),
  );
  return previewTax({
    subtotal,
    gstEnabled,
    gstRate,
    tdsAmount: options.tdsAmount ?? 0,
    intrastate: supplyIsIntrastate(
      { state: options.companyState, gstin: options.companyGstin },
      {
        state: options.supplyState,
        stateCode: options.stateCode,
        placeOfSupply: options.placeOfSupply,
      },
    ),
  });
}

export function invoiceUsesLegacyGst(invoice: {
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
}) {
  return hasLegacyGst(invoice);
}

function line(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

export function formatBeneficiaryBillTo(beneficiary: InvoicePartyOption) {
  const locality = [line(beneficiary.city), line(beneficiary.state)]
    .filter(Boolean)
    .join(", ");
  const cityLine = [locality, line(beneficiary.postalCode)].filter(Boolean).join(" ");
  return [
    line(beneficiary.legalName),
    line(beneficiary.contactName),
    line(beneficiary.addressLine1),
    line(beneficiary.addressLine2),
    cityLine || null,
    line(beneficiary.country),
    line(beneficiary.gstin) ? `GSTIN: ${line(beneficiary.gstin)}` : null,
    line(beneficiary.pan) ? `PAN: ${line(beneficiary.pan)}` : null,
    line(beneficiary.email),
    line(beneficiary.phone),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

export function formatCompanyBillFrom(company: {
  legalName: string;
  tradeName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  cin?: string | null;
}) {
  const trade =
    line(company.tradeName) && line(company.tradeName) !== line(company.legalName)
      ? line(company.tradeName)
      : null;
  const locality = [line(company.city), line(company.state)].filter(Boolean).join(", ");
  const cityLine = [locality, line(company.postalCode)].filter(Boolean).join(" ");
  return [
    line(company.legalName),
    trade,
    line(company.addressLine1),
    line(company.addressLine2),
    cityLine || null,
    line(company.country),
    line(company.gstin) ? `GSTIN: ${line(company.gstin)}` : null,
    line(company.pan) ? `PAN: ${line(company.pan)}` : null,
    line(company.cin) ? `CIN: ${line(company.cin)}` : null,
    line(company.email),
    line(company.phone),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

export function partyFieldsFromSource(source: {
  legalName: string;
  tradeName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
}): InvoicePartyFields {
  return {
    companyName: source.legalName.trim(),
    tradeName:
      line(source.tradeName) && line(source.tradeName) !== source.legalName.trim()
        ? (line(source.tradeName) ?? "")
        : "",
    address: [line(source.addressLine1), line(source.addressLine2)].filter(Boolean).join(", "),
    state: line(source.state) ?? "",
    city: line(source.city) ?? "",
    pincode: line(source.postalCode) ?? "",
    country: line(source.country) ?? "",
    gstin: line(source.gstin) ?? "",
    pan: line(source.pan) ?? "",
    cin: line(source.cin) ?? "",
    contactName: line(source.contactName) ?? "",
    email: line(source.email) ?? "",
    phone: line(source.phone) ?? "",
  };
}

export function composePartyFields(fields: InvoicePartyFields) {
  const locality = [line(fields.city), line(fields.state)].filter(Boolean).join(", ");
  const cityLine = [locality, line(fields.pincode)].filter(Boolean).join(" ");
  return [
    line(fields.companyName),
    line(fields.tradeName),
    line(fields.contactName),
    line(fields.address),
    cityLine || null,
    line(fields.country),
    line(fields.gstin) ? `GSTIN: ${line(fields.gstin)}` : null,
    line(fields.pan) ? `PAN: ${line(fields.pan)}` : null,
    line(fields.cin) ? `CIN: ${line(fields.cin)}` : null,
    line(fields.email),
    line(fields.phone),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

export function parsePartyFields(text: string): InvoicePartyFields {
  const rows = text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const take = (prefix: string) => {
    const index = rows.findIndex((row) => row.toUpperCase().startsWith(prefix));
    if (index < 0) return "";
    const value = rows[index].slice(prefix.length).trim();
    rows.splice(index, 1);
    return value;
  };
  const gstin = take("GSTIN:");
  const pan = take("PAN:");
  const cin = take("CIN:");
  const emailIndex = rows.findIndex((row) => row.includes("@"));
  const email = emailIndex >= 0 ? rows.splice(emailIndex, 1)[0] : "";
  const phoneIndex = rows.findIndex((row) => /^[+\d][\d\s().-]{6,}$/.test(row));
  const phone = phoneIndex >= 0 ? rows.splice(phoneIndex, 1)[0] : "";
  const companyName = rows.shift() ?? "";
  const cityIndex = rows.findIndex((row) => row.includes(","));
  let city = "";
  let state = "";
  let pincode = "";
  if (cityIndex >= 0) {
    const cityLine = rows.splice(cityIndex, 1)[0];
    const [cityPart, rest = ""] = cityLine.split(",");
    city = cityPart.trim();
    const tokens = rest.trim().split(/\s+/).filter(Boolean);
    const last = tokens.at(-1) ?? "";
    if (tokens.length > 1 && /\d/.test(last)) {
      pincode = last;
      state = tokens.slice(0, -1).join(" ");
    } else {
      state = tokens.join(" ");
    }
  }
  let country = "";
  const countryIndex = rows.findLastIndex((row) => !row.includes(",") && !/\d/.test(row));
  if (countryIndex >= 0) country = rows.splice(countryIndex, 1)[0];
  return {
    companyName,
    tradeName: "",
    address: rows.join(", "),
    state,
    city,
    pincode,
    country,
    gstin,
    pan,
    cin,
    contactName: "",
    email,
    phone,
  };
}

export function bankAccountLabel(account: Pick<
  BankAccountOption,
  "bankName" | "accountHolderName" | "accountNumber"
>) {
  return `${account.bankName} · ${account.accountHolderName} · ${account.accountNumber}`;
}

export function issueBlockers(invoice: Pick<
  InvoiceDetail,
  "bankAccountId" | "billFrom" | "billTo" | "items"
>) {
  const blockers: string[] = [];
  if (!invoice.bankAccountId) blockers.push("Select a bank account.");
  if (!invoice.billFrom?.trim()) blockers.push("Enter Bill From.");
  if (!invoice.billTo?.trim()) blockers.push("Enter Bill To.");
  if (invoice.items.length === 0) blockers.push("Add at least one line item.");
  return blockers;
}

function fieldText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(
  value: string,
  max: number,
  key: string,
  label: string,
  errors: Record<string, string>,
) {
  if (!value) return null;
  if (value.length > max) {
    errors[key] = `${label} must be ${max} characters or fewer.`;
    return null;
  }
  return value;
}

export function parseInvoiceForm(
  formData: FormData,
  options: { invoiceNumber?: string } = {},
): { ok: true; value: InvoiceInput } | { ok: false; fieldErrors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const beneficiaryId = fieldText(formData, "beneficiary_id");
  if (!isInvoiceId(beneficiaryId)) {
    errors.beneficiary_id = "Select a beneficiary.";
  }

  const invoiceDate = canonicalInvoiceDate(fieldText(formData, "invoice_date")) ?? "";
  const dateWindow = options.invoiceNumber ? invoiceDateWindow(options.invoiceNumber) : null;
  if (!invoiceDate) {
    errors.invoice_date = "Enter an invoice date.";
  } else if (dateWindow && (invoiceDate < dateWindow.start || invoiceDate > dateWindow.end)) {
    errors.invoice_date = isFinancialYearNumber(options.invoiceNumber ?? "")
      ? "Invoice date must stay in the financial year of the invoice number."
      : "Invoice date must stay in the month of the invoice number.";
  }

  const dueDateText = fieldText(formData, "due_date");
  let dueDate: string | null = null;
  if (dueDateText) {
    const dueIso = canonicalInvoiceDate(dueDateText);
    if (!dueIso) {
      errors.due_date = "Enter a valid due date.";
    } else if (invoiceDate && dueIso < invoiceDate) {
      errors.due_date = "Due date must be on or after the invoice date.";
    } else {
      dueDate = dueIso;
    }
  }

  const bankText = fieldText(formData, "bank_account_id");
  let bankAccountId: string | null = null;
  if (bankText) {
    if (!isInvoiceId(bankText)) errors.bank_account_id = "Select a bank account.";
    else bankAccountId = bankText;
  }

  const billFrom = optionalText(
    fieldText(formData, "bill_from"),
    2000,
    "bill_from",
    "Bill From",
    errors,
  );
  const billTo = optionalText(
    fieldText(formData, "bill_to"),
    2000,
    "bill_to",
    "Bill To",
    errors,
  );
  const paymentTerms = optionalText(
    fieldText(formData, "payment_terms"),
    500,
    "payment_terms",
    "Payment terms",
    errors,
  );
  const notes = optionalText(fieldText(formData, "notes"), 2000, "notes", "Notes", errors);
  const placeOfSupply = optionalText(
    fieldText(formData, "place_of_supply"),
    80,
    "place_of_supply",
    "Place of supply",
    errors,
  );
  const supplyState = optionalText(
    fieldText(formData, "supply_state"),
    80,
    "supply_state",
    "State",
    errors,
  );
  const stateCodeText = fieldText(formData, "state_code");
  let stateCode: string | null = null;
  if (stateCodeText) {
    if (!/^[0-9]{2}$/.test(stateCodeText)) {
      errors.state_code = "State code must be 2 digits.";
    } else {
      stateCode = stateCodeText;
    }
  }
  const clientGstinText = fieldText(formData, "client_gstin").toUpperCase();
  let clientGstin: string | null = null;
  if (clientGstinText) {
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(clientGstinText)) {
      errors.client_gstin = "Enter a valid 15-character GSTIN, or leave it blank.";
    } else {
      clientGstin = clientGstinText;
    }
  }
  const dealReference = optionalText(
    fieldText(formData, "deal_reference"),
    120,
    "deal_reference",
    "Deal / brand reference",
    errors,
  );

  const currencyText = fieldText(formData, "currency").toUpperCase() || "INR";
  if (!/^[A-Z]{3}$/.test(currencyText)) {
    errors.currency = "Enter a 3-letter currency code.";
  }

  const gstEnabled = formData.get("gst_enabled") === "on";
  const gstRateText = fieldText(formData, "gst_rate");
  const gstRate = Number(gstRateText);
  if (
    !gstRateText ||
    !Number.isFinite(gstRate) ||
    gstRate < 0 ||
    gstRate > 100
  ) {
    errors.gst_rate = "GST rate must be between 0 and 100.";
  }

  const tdsText = fieldText(formData, "tds_amount") || "0";
  const tdsAmount = Number(tdsText);
  if (!/^\d+(\.\d{1,2})?$/.test(tdsText) || !Number.isFinite(tdsAmount) || tdsAmount < 0) {
    errors.tds_amount = "TDS must be a rupee amount of zero or more.";
  }

  const items = parseInvoiceItems(fieldText(formData, "items"), errors);
  if (items && Number.isFinite(tdsAmount) && tdsAmount >= 0) {
    const preview = previewTotals(items, gstEnabled, Number.isFinite(gstRate) ? gstRate : 0, {
      tdsAmount,
      companyState: fieldText(formData, "company_state"),
      companyGstin: fieldText(formData, "company_gstin"),
      supplyState,
      stateCode,
      placeOfSupply,
    });
    if (tdsAmount > preview.total) {
      errors.tds_amount = "TDS cannot exceed the invoice total.";
    }
  }

  if (Object.keys(errors).length > 0 || !items) {
    return { ok: false, fieldErrors: errors };
  }

  return {
    ok: true,
    value: {
      beneficiaryId,
      bankAccountId,
      invoiceDate,
      dueDate,
      billFrom,
      billTo,
      placeOfSupply,
      supplyState,
      stateCode,
      clientGstin,
      dealReference,
      currency: currencyText,
      paymentTerms,
      notes,
      gstEnabled,
      gstRate,
      tdsAmount,
      items,
    },
  };
}

function parseInvoiceItems(raw: string, errors: Record<string, string>) {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : [];
  } catch {
    errors.items = "Invoice items could not be read.";
    return null;
  }

  if (!Array.isArray(parsed)) {
    errors.items = "Invoice items could not be read.";
    return null;
  }

  const items: InvoiceLineInput[] = [];
  parsed.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const row = entry as Record<string, unknown>;
    const description = String(row.description ?? "").trim();
    const hsn = String(row.hsn ?? "").trim();
    const quantityText = String(row.quantity ?? "").trim();
    const rateText = String(row.rate ?? "").trim();
    if (!description && !hsn && !quantityText && !rateText) return;

    if (!description) {
      errors[`item-${index}-description`] = "Enter a description.";
    } else if (description.length > 500) {
      errors[`item-${index}-description`] = "Description must be 500 characters or fewer.";
    }
    if (hsn.length > 20) {
      errors[`item-${index}-hsn`] = "SAC must be 20 characters or fewer.";
    }

    const quantity = Number(quantityText);
    if (!quantityText || !Number.isFinite(quantity) || quantity <= 0) {
      errors[`item-${index}-quantity`] = "Quantity must be greater than zero.";
    }
    const rate = Number(rateText);
    if (!rateText || !Number.isFinite(rate) || rate < 0) {
      errors[`item-${index}-rate`] = "Rate cannot be negative.";
    }

    if (
      description &&
      description.length <= 500 &&
      hsn.length <= 20 &&
      quantity > 0 &&
      rate >= 0
    ) {
      items.push({
        description,
        hsn: hsn || null,
        quantity,
        rate,
      });
    }
  });

  return items;
}

export function invoiceToRow(value: InvoiceInput) {
  return {
    beneficiary_id: value.beneficiaryId,
    bank_account_id: value.bankAccountId,
    invoice_date: value.invoiceDate,
    due_date: value.dueDate,
    bill_from: value.billFrom,
    bill_to: value.billTo,
    place_of_supply: value.placeOfSupply,
    supply_state: value.supplyState,
    state_code: value.stateCode,
    client_gstin: value.clientGstin,
    deal_reference: value.dealReference,
    currency: value.currency,
    payment_terms: value.paymentTerms,
    notes: value.notes,
    gst_enabled: value.gstEnabled,
    gst_rate: value.gstRate,
    status: "draft" as const,
  };
}

export function invoiceErrorMessage(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  const message = error?.message ?? "";
  const known = [
    "Invoice numbers are assigned by the database",
    "Invoices must be created as drafts",
    "Invoice numbers cannot be changed",
    "Invoice date must stay in the month of the invoice number",
    "Invoice date must stay in the financial year of the invoice number",
    "Invoice date must stay in the period of the invoice number",
    "TDS cannot exceed the invoice total",
    "Payments cannot exceed the balance due",
    "Invoice can be marked paid only when payments cover the balance due",
    "Invoice balance due cannot fall below recorded payments",
    "A bank account is required before issuing an invoice",
    "Bill-from and bill-to are required before issuing an invoice",
    "At least one line item is required before issuing an invoice",
    "Cancelled invoices cannot be changed",
    "Invalid invoice status change",
    "Invoice items can only be changed while the invoice is a draft",
    "An issued invoice must keep at least one line item",
    "Internal users can edit a draft, issue it, or mark an issued invoice as paid",
    "Invoice can be marked paid only when payments cover the total",
  ];
  const match = known.find((item) => message.includes(item));
  if (match) return match.endsWith(".") ? match : `${match}.`;
  if (error?.code === "23503") return "Select a valid beneficiary and bank account.";
  if (error?.code === "23514" && /due_date/i.test(message)) {
    return "Due date must be on or after the invoice date.";
  }
  if (error?.code === "42501" || /row-level security/i.test(message)) {
    return "You do not have permission to do that.";
  }
  return fallback;
}
