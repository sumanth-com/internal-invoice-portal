import { formatInvoiceTimestamp, invoiceToday } from "@/lib/invoice";

export const COMPANY_COLUMNS =
  "legal_name, trade_name, address_line1, address_line2, city, state, postal_code, country, email, phone, website, gstin, pan, logo_url, default_currency, default_payment_terms, invoice_notes, default_gst_enabled, default_gst_rate, updated_at";

export const BANK_COLUMNS =
  "id, account_holder_name, bank_name, account_number, ifsc_code, swift_code, branch, is_default, is_active";

export type CompanyDetails = {
  legalName: string;
  tradeName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  gstin: string;
  pan: string;
  defaultCurrency: string;
  defaultPaymentTerms: string;
  invoiceNotes: string;
  updatedAt: string | null;
};

export type CompanyProfile = CompanyDetails & {
  exists: boolean;
  logoUrl: string | null;
  logoPreviewUrl: string | null;
  defaultGstEnabled: boolean;
  defaultGstRate: number;
};

export type CompanyField = Exclude<
  keyof {
    legal_name: string;
    trade_name: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    email: string;
    phone: string;
    website: string;
    gstin: string;
    pan: string;
    default_currency: string;
    default_payment_terms: string;
    invoice_notes: string;
  },
  never
>;

export type CompanyWrite = {
  legal_name: string;
  trade_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  gstin: string | null;
  pan: string | null;
  default_currency: string;
  default_payment_terms: string | null;
  invoice_notes: string | null;
};

export type CompanyFormState = {
  error: string | null;
  fieldErrors: Partial<Record<CompanyField, string>>;
  saved?: CompanyDetails;
};

export type GstDefaults = {
  defaultGstEnabled: boolean;
  defaultGstRate: number;
};

export type GstFormState = {
  error: string | null;
  fieldErrors: Partial<Record<"default_gst_rate", string>>;
  saved?: GstDefaults;
};

export type SettingsBankAccount = {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string | null;
  swiftCode: string | null;
  branch: string | null;
  isDefault: boolean;
  isActive: boolean;
  invoiceCount: number;
};

export type BankField =
  | "account_holder_name"
  | "bank_name"
  | "account_number"
  | "ifsc_code"
  | "swift_code"
  | "branch"
  | "is_default";

export type BankWrite = {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string | null;
  swift_code: string | null;
  branch: string | null;
  is_default: boolean;
  is_active: boolean;
};

export type BankFormState = {
  error: string | null;
  fieldErrors: Partial<Record<BankField, string>>;
  saved?: SettingsBankAccount;
  clearedDefaultId?: string | null;
};

export type BankMutationState = {
  error: string | null;
  saved?: SettingsBankAccount;
  deletedId?: string;
};

export type InvoiceSequenceRow = {
  id: string | null;
  period: string;
  periodLabel: string;
  nextNumber: number;
  floor: number;
  nextInvoiceNumber: string;
  issuedCount: number;
  updatedAt: string | null;
  pending: boolean;
};

export type NumberingFormState = {
  error: string | null;
  fieldErrors: Partial<Record<"next_number", string>>;
  saved?: InvoiceSequenceRow;
};

export type LogoState = {
  error: string | null;
  saved?: { logoUrl: string | null; logoPreviewUrl: string | null };
};

export type CompanyRow = {
  legal_name: string;
  trade_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  gstin: string | null;
  pan: string | null;
  logo_url: string | null;
  default_currency: string;
  default_payment_terms: string | null;
  invoice_notes: string | null;
  default_gst_enabled: boolean;
  default_gst_rate: number | string;
  updated_at: string;
};

export type BankRow = {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string | null;
  swift_code: string | null;
  branch: string | null;
  is_default: boolean;
  is_active: boolean;
};

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_PATTERN = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;
const PERIOD_PATTERN = /^[0-9]{4}(0[1-9]|1[0-2])$/;
const RECORD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE_PATTERN = /^\d+(\.\d{1,2})?$/;

export const emptyCompanyFormState: CompanyFormState = { error: null, fieldErrors: {} };
export const emptyGstFormState: GstFormState = { error: null, fieldErrors: {} };
export const emptyBankFormState: BankFormState = { error: null, fieldErrors: {} };
export const emptyBankMutationState: BankMutationState = { error: null };
export const emptyNumberingFormState: NumberingFormState = { error: null, fieldErrors: {} };
export const emptyLogoState: LogoState = { error: null };

export function emptyCompanyProfile(): CompanyProfile {
  return {
    exists: false,
    legalName: "",
    tradeName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    email: "",
    phone: "",
    website: "",
    gstin: "",
    pan: "",
    defaultCurrency: "INR",
    defaultPaymentTerms: "",
    invoiceNotes: "",
    updatedAt: null,
    logoUrl: null,
    logoPreviewUrl: null,
    defaultGstEnabled: true,
    defaultGstRate: 18,
  };
}

export function currentNumberingPeriod() {
  const today = invoiceToday();
  return `${today.slice(0, 4)}${today.slice(5, 7)}`;
}

export function formatNumberingPeriod(period: string) {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatSequenceNumber(period: string, nextNumber: number) {
  return `${period}${String(nextNumber).padStart(2, "0")}`;
}

export function sequenceSuffix(invoiceNumber: string, period: string) {
  if (!invoiceNumber.startsWith(period)) return null;
  const rest = invoiceNumber.slice(period.length);
  if (!/^[0-9]+$/.test(rest)) return null;
  return Number(rest);
}

export function numberingFloor(suffixes: number[]) {
  const highest = suffixes.reduce((max, value) => Math.max(max, value), 0);
  return highest + 1;
}

function blankToNull(value: string) {
  return value ? value : null;
}

function fieldText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function limit(
  value: string,
  max: number,
  key: CompanyField | BankField,
  label: string,
  errors: Record<string, string>,
) {
  if (value.length > max) {
    errors[key] = `${label} must be ${max} characters or fewer.`;
    return false;
  }
  return true;
}

export function mapCompanyDetails(row: CompanyRow): CompanyDetails {
  return {
    legalName: row.legal_name?.trim() ?? "",
    tradeName: row.trade_name?.trim() ?? "",
    addressLine1: row.address_line1?.trim() ?? "",
    addressLine2: row.address_line2?.trim() ?? "",
    city: row.city?.trim() ?? "",
    state: row.state?.trim() ?? "",
    postalCode: row.postal_code?.trim() ?? "",
    country: row.country?.trim() || "India",
    email: row.email?.trim() ?? "",
    phone: row.phone?.trim() ?? "",
    website: row.website?.trim() ?? "",
    gstin: row.gstin?.trim() ?? "",
    pan: row.pan?.trim() ?? "",
    defaultCurrency: row.default_currency?.trim() || "INR",
    defaultPaymentTerms: row.default_payment_terms?.trim() ?? "",
    invoiceNotes: row.invoice_notes?.trim() ?? "",
    updatedAt: row.updated_at ?? null,
  };
}

export function mapCompanyProfile(row: CompanyRow, previewUrl: string | null): CompanyProfile {
  return {
    exists: true,
    ...mapCompanyDetails(row),
    logoUrl: row.logo_url?.trim() || null,
    logoPreviewUrl: previewUrl,
    defaultGstEnabled: Boolean(row.default_gst_enabled),
    defaultGstRate: Number(row.default_gst_rate),
  };
}

export function mapBankAccount(row: BankRow, invoiceCount = 0): SettingsBankAccount {
  return {
    id: row.id,
    accountHolderName: row.account_holder_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    ifscCode: row.ifsc_code,
    swiftCode: row.swift_code,
    branch: row.branch,
    isDefault: row.is_default,
    isActive: row.is_active,
    invoiceCount,
  };
}

export function sortBankAccounts(accounts: SettingsBankAccount[]) {
  return [...accounts].sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
    return (
      left.bankName.localeCompare(right.bankName, "en") ||
      left.accountNumber.localeCompare(right.accountNumber, "en")
    );
  });
}

export function settingsErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string,
) {
  const message = error?.message ?? "";
  if (
    error?.code === "42501" ||
    /permission denied|row-level security/i.test(message)
  ) {
    return "Only an admin can change these settings.";
  }
  if (error?.code === "23505" && /one_default|is_default/i.test(message)) {
    return "Another bank account is already the default.";
  }
  if (error?.code === "23505" && /identity|bank_name|account_number/i.test(message)) {
    return "A bank account with this bank and account number already exists.";
  }
  if (error?.code === "23505") {
    return "These settings conflict with a record that already exists.";
  }
  if (error?.code === "23503") {
    return "This bank account is used on an invoice and cannot be deleted. Deactivate it instead.";
  }
  if (error?.code === "23514" && /ifsc/i.test(message)) {
    return "Enter a valid IFSC code, such as HDFC0001234.";
  }
  if (error?.code === "23514" && /gst/i.test(message)) {
    return "GST rate must be between 0 and 100.";
  }
  if (error?.code === "23514" && /currency/i.test(message)) {
    return "Currency must be a 3-letter code, such as INR.";
  }
  if (error?.code === "23514" && /next_number/i.test(message)) {
    return "The next number must be greater than zero.";
  }
  if (error?.code === "23514" && /period/i.test(message)) {
    return "The numbering period must stay in YYYYMM form.";
  }
  return fallback;
}

export function companyUpdatedLabel(updatedAt: string | null) {
  if (!updatedAt) return null;
  return `Last updated ${formatInvoiceTimestamp(updatedAt)}`;
}

export function parseCompanyForm(
  formData: FormData,
): { ok: true; value: CompanyWrite } | { ok: false; fieldErrors: CompanyFormState["fieldErrors"] } {
  const errors: CompanyFormState["fieldErrors"] = {};
  const legalName = fieldText(formData, "legal_name");
  const tradeName = fieldText(formData, "trade_name");
  const addressLine1 = fieldText(formData, "address_line1");
  const addressLine2 = fieldText(formData, "address_line2");
  const city = fieldText(formData, "city");
  const state = fieldText(formData, "state");
  const postalCode = fieldText(formData, "postal_code");
  const country = fieldText(formData, "country") || "India";
  const email = fieldText(formData, "email").toLowerCase();
  const phone = fieldText(formData, "phone");
  const website = fieldText(formData, "website");
  const gstin = fieldText(formData, "gstin").toUpperCase();
  const pan = fieldText(formData, "pan").toUpperCase();
  const currency = fieldText(formData, "default_currency").toUpperCase() || "INR";
  const paymentTerms = fieldText(formData, "default_payment_terms");
  const notes = fieldText(formData, "invoice_notes");

  if (!legalName) errors.legal_name = "Enter the company name.";
  else if (!limit(legalName, 200, "legal_name", "Company name", errors)) {
    /* recorded */
  }
  limit(tradeName, 200, "trade_name", "Trade name", errors);
  limit(addressLine1, 200, "address_line1", "Address line 1", errors);
  limit(addressLine2, 200, "address_line2", "Address line 2", errors);
  limit(city, 80, "city", "City", errors);
  limit(state, 80, "state", "State", errors);
  limit(postalCode, 12, "postal_code", "Postal code", errors);
  limit(country, 80, "country", "Country", errors);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address, or leave it blank.";
  } else {
    limit(email, 160, "email", "Email", errors);
  }
  limit(phone, 30, "phone", "Phone", errors);
  limit(website, 200, "website", "Website", errors);
  if (gstin && !GSTIN_PATTERN.test(gstin)) {
    errors.gstin = "Enter a valid 15-character GSTIN, or leave it blank.";
  }
  if (pan && !PAN_PATTERN.test(pan)) {
    errors.pan = "Enter a valid 10-character PAN, or leave it blank.";
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.default_currency = "Currency must be a 3-letter code, such as INR.";
  }
  limit(paymentTerms, 2000, "default_payment_terms", "Payment terms", errors);
  limit(notes, 2000, "invoice_notes", "Invoice notes", errors);

  let websiteValue: string | null = null;
  if (website && !errors.website) {
    const withProtocol = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    try {
      const url = new URL(withProtocol);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.website = "Enter a valid website, or leave it blank.";
      } else {
        websiteValue = url.href;
      }
    } catch {
      errors.website = "Enter a valid website, or leave it blank.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

  return {
    ok: true,
    value: {
      legal_name: legalName,
      trade_name: blankToNull(tradeName),
      address_line1: blankToNull(addressLine1),
      address_line2: blankToNull(addressLine2),
      city: blankToNull(city),
      state: blankToNull(state),
      postal_code: blankToNull(postalCode),
      country,
      email: blankToNull(email),
      phone: blankToNull(phone),
      website: websiteValue,
      gstin: blankToNull(gstin),
      pan: blankToNull(pan),
      default_currency: currency,
      default_payment_terms: blankToNull(paymentTerms),
      invoice_notes: blankToNull(notes),
    },
  };
}

export function parseGstForm(
  formData: FormData,
): { ok: true; value: { default_gst_enabled: boolean; default_gst_rate: number } } | {
  ok: false;
  fieldErrors: GstFormState["fieldErrors"];
} {
  const enabled = formData.get("default_gst_enabled") === "on";
  const rateText = fieldText(formData, "default_gst_rate");
  if (!RATE_PATTERN.test(rateText)) {
    return {
      ok: false,
      fieldErrors: { default_gst_rate: "Enter a GST rate from 0 to 100, with up to 2 decimal places." },
    };
  }
  const rate = Number(rateText);
  if (rate < 0 || rate > 100) {
    return {
      ok: false,
      fieldErrors: { default_gst_rate: "GST rate must be between 0 and 100." },
    };
  }
  return { ok: true, value: { default_gst_enabled: enabled, default_gst_rate: rate } };
}

export function parseBankForm(
  formData: FormData,
): { ok: true; value: BankWrite } | { ok: false; fieldErrors: BankFormState["fieldErrors"] } {
  const errors: BankFormState["fieldErrors"] = {};
  const accountHolderName = fieldText(formData, "account_holder_name");
  const bankName = fieldText(formData, "bank_name");
  const accountNumber = fieldText(formData, "account_number");
  const ifsc = fieldText(formData, "ifsc_code").toUpperCase().replace(/\s+/g, "");
  const swift = fieldText(formData, "swift_code").toUpperCase().replace(/\s+/g, "");
  const branch = fieldText(formData, "branch");
  const isDefault = formData.get("is_default") === "on";
  const isActive = formData.get("is_active") === "on";

  if (!accountHolderName) errors.account_holder_name = "Enter the account name.";
  else limit(accountHolderName, 160, "account_holder_name", "Account name", errors);
  if (!bankName) errors.bank_name = "Enter the bank name.";
  else limit(bankName, 120, "bank_name", "Bank name", errors);
  if (!accountNumber) errors.account_number = "Enter the account number.";
  else limit(accountNumber, 40, "account_number", "Account number", errors);
  if (ifsc && !IFSC_PATTERN.test(ifsc)) {
    errors.ifsc_code = "Enter a valid IFSC code, such as HDFC0001234, or leave it blank.";
  }
  if (swift && !SWIFT_PATTERN.test(swift)) {
    errors.swift_code = "Enter an 8 or 11 character SWIFT code, or leave it blank.";
  }
  limit(branch, 120, "branch", "Branch", errors);
  if (isDefault && !isActive) {
    errors.is_default = "An inactive account cannot be the default. Activate it, or clear the default.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: {
      account_holder_name: accountHolderName,
      bank_name: bankName,
      account_number: accountNumber,
      ifsc_code: blankToNull(ifsc),
      swift_code: blankToNull(swift),
      branch: blankToNull(branch),
      is_default: isDefault,
      is_active: isActive,
    },
  };
}

export function parseNextNumber(value: string, floor: number) {
  if (!/^[0-9]+$/.test(value)) {
    return { ok: false as const, error: "Enter a whole number." };
  }
  const nextNumber = Number(value);
  if (!Number.isSafeInteger(nextNumber) || nextNumber < 1 || nextNumber > 100000) {
    return { ok: false as const, error: "Enter a next number from 1 to 100000." };
  }
  if (nextNumber < floor) {
    return {
      ok: false as const,
      error: `The next number must be at least ${floor}. Invoice numbers already issued in this month cannot be reused.`,
    };
  }
  return { ok: true as const, nextNumber };
}

export function isNumberingPeriod(value: string) {
  return PERIOD_PATTERN.test(value);
}

export function isRecordId(value: string) {
  return RECORD_ID_PATTERN.test(value);
}

export function buildSequenceRow(input: {
  id: string | null;
  period: string;
  nextNumber: number;
  updatedAt: string | null;
  suffixes: number[];
  pending?: boolean;
}): InvoiceSequenceRow {
  const floor = numberingFloor(input.suffixes);
  const nextNumber = input.nextNumber;
  return {
    id: input.id,
    period: input.period,
    periodLabel: formatNumberingPeriod(input.period),
    nextNumber,
    floor,
    nextInvoiceNumber: formatSequenceNumber(input.period, nextNumber),
    issuedCount: input.suffixes.length,
    updatedAt: input.updatedAt,
    pending: input.pending ?? false,
  };
}
