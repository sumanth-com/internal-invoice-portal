import { composePhone, nationalPhoneError, splitStoredPhone } from "@/lib/settings-places";

export type BeneficiaryStatusFilter = "all" | "active" | "inactive";

export type BeneficiaryField =
  | "legal_name"
  | "contact_name"
  | "email"
  | "phone"
  | "address_line1"
  | "address_line2"
  | "city"
  | "state"
  | "postal_code"
  | "country"
  | "gstin"
  | "pan"
  | "notes";

export type BeneficiaryFieldErrors = Partial<Record<BeneficiaryField, string>>;

export type BeneficiaryFormState = {
  error: string | null;
  fieldErrors: BeneficiaryFieldErrors;
  saved?: Beneficiary;
};

export type BeneficiaryMutationState = {
  error: string | null;
};

export type BeneficiaryInput = {
  legalName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  gstin: string | null;
  pan: string | null;
  notes: string | null;
  isActive: boolean;
};

export type BeneficiarySummary = {
  id: string;
  legalName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  city: string | null;
  isActive: boolean;
};

export type Beneficiary = BeneficiarySummary & {
  addressLine1: string | null;
  addressLine2: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  pan: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BeneficiaryListData = {
  beneficiaries: BeneficiarySummary[];
  total: number;
  active: number;
  inactive: number;
  search: string;
  status: BeneficiaryStatusFilter;
  contact: string;
  contactNames: string[];
  truncated: boolean;
};

const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]+$/;
const POSTAL_PATTERN = /^[A-Za-z0-9 -]{3,12}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BENEFICIARY_LIST_LIMIT = 100;

export const emptyBeneficiaryFormState: BeneficiaryFormState = {
  error: null,
  fieldErrors: {},
};

export function isBeneficiaryId(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeBeneficiarySearch(value: string | undefined) {
  return (value ?? "")
    .trim()
    .replace(/[%_,.()\\'"]/g, "")
    .slice(0, 80);
}

export function normalizeBeneficiaryStatus(
  value: string | undefined,
): BeneficiaryStatusFilter {
  if (value === "active" || value === "inactive") return value;
  return "all";
}

export function normalizeBeneficiaryContact(value: string | undefined) {
  return (value ?? "").trim().slice(0, 120);
}

export function beneficiaryListHref(options: {
  search?: string;
  status?: BeneficiaryStatusFilter;
  contact?: string;
}) {
  const params = new URLSearchParams();
  const search = options.search?.trim();
  const contact = normalizeBeneficiaryContact(options.contact);
  if (search) params.set("q", search);
  if (options.status && options.status !== "all") params.set("status", options.status);
  if (contact) params.set("contact", contact);
  const query = params.toString();
  return query ? `/beneficiaries?${query}` : "/beneficiaries";
}

export function beneficiaryNotice(value: string | undefined) {
  if (value === "created" || value === "updated" || value === "deleted") {
    return value;
  }
  return null;
}

function fieldText(formData: FormData, key: BeneficiaryField) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(
  value: string,
  max: number,
  field: BeneficiaryField,
  label: string,
  errors: BeneficiaryFieldErrors,
) {
  if (!value) return null;
  if (value.length > max) {
    errors[field] = `${label} must be ${max} characters or fewer.`;
    return null;
  }
  return value;
}

export function parseBeneficiaryForm(
  formData: FormData,
):
  | { ok: true; value: BeneficiaryInput }
  | { ok: false; fieldErrors: BeneficiaryFieldErrors } {
  const errors: BeneficiaryFieldErrors = {};
  const legalName = fieldText(formData, "legal_name");

  if (!legalName) {
    errors.legal_name = "Enter a company or legal name.";
  } else if (legalName.length > 200) {
    errors.legal_name = "Company or legal name must be 200 characters or fewer.";
  }

  const contactName = optionalText(
    fieldText(formData, "contact_name"),
    120,
    "contact_name",
    "Client legal name",
    errors,
  );

  const emailText = fieldText(formData, "email");
  let email: string | null = null;
  if (emailText) {
    if (emailText.length > 160 || !EMAIL_PATTERN.test(emailText)) {
      errors.email = "Enter a valid email address.";
    } else {
      email = emailText;
    }
  }

  const phoneText = fieldText(formData, "phone");
  let phone: string | null = null;
  if (phoneText) {
    const stored = splitStoredPhone(phoneText, "");
    const phoneError = nationalPhoneError(stored.dial, stored.number);
    if (phoneText.length > 30 || !PHONE_PATTERN.test(phoneText) || phoneError) {
      errors.phone = phoneError ?? "Enter a valid mobile number.";
    } else {
      phone = composePhone(stored.dial, stored.number);
    }
  }

  const addressLine1 = optionalText(
    fieldText(formData, "address_line1"),
    200,
    "address_line1",
    "Address line 1",
    errors,
  );
  const addressLine2 = optionalText(
    fieldText(formData, "address_line2"),
    200,
    "address_line2",
    "Address line 2",
    errors,
  );
  const city = optionalText(fieldText(formData, "city"), 80, "city", "City", errors);
  const state = optionalText(
    fieldText(formData, "state"),
    80,
    "state",
    "State",
    errors,
  );

  const postalText = fieldText(formData, "postal_code");
  let postalCode: string | null = null;
  if (postalText) {
    if (!POSTAL_PATTERN.test(postalText)) {
      errors.postal_code = "Enter a valid postal code.";
    } else {
      postalCode = postalText;
    }
  }

  const countryText = fieldText(formData, "country") || "India";
  if (countryText.length > 80) {
    errors.country = "Country must be 80 characters or fewer.";
  }

  const gstinText = fieldText(formData, "gstin").replace(/\s+/g, "").toUpperCase();
  let gstin: string | null = null;
  if (gstinText) {
    if (!GSTIN_PATTERN.test(gstinText)) {
      errors.gstin = "Enter a valid 15-character GSTIN.";
    } else {
      gstin = gstinText;
    }
  }

  const panText = fieldText(formData, "pan").replace(/\s+/g, "").toUpperCase();
  let pan: string | null = null;
  if (panText) {
    if (!PAN_PATTERN.test(panText)) {
      errors.pan = "Enter a valid 10-character PAN.";
    } else {
      pan = panText;
    }
  }

  if (gstin && pan && gstin.slice(2, 12) !== pan) {
    errors.pan = "PAN does not match the GSTIN.";
  }

  const notes = optionalText(fieldText(formData, "notes"), 2000, "notes", "Notes", errors);
  const isActive = formData.get("is_active") === "on";

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }

  return {
    ok: true,
    value: {
      legalName,
      contactName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country: countryText,
      gstin,
      pan,
      notes,
      isActive,
    },
  };
}

export function beneficiaryToRow(value: BeneficiaryInput) {
  return {
    legal_name: value.legalName,
    contact_name: value.contactName,
    email: value.email,
    phone: value.phone,
    address_line1: value.addressLine1,
    address_line2: value.addressLine2,
    city: value.city,
    state: value.state,
    postal_code: value.postalCode,
    country: value.country,
    gstin: value.gstin,
    pan: value.pan,
    notes: value.notes,
    is_active: value.isActive,
  };
}

export function formatBeneficiaryAddress(
  beneficiary: Pick<
    Beneficiary,
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "state"
    | "postalCode"
    | "country"
  >,
) {
  const cityLine = [beneficiary.city, beneficiary.state].filter(Boolean).join(", ");
  const locality = [cityLine, beneficiary.postalCode].filter(Boolean).join(" ");
  return [
    beneficiary.addressLine1,
    beneficiary.addressLine2,
    locality,
    beneficiary.country,
  ].filter((line): line is string => Boolean(line));
}

export function formatBeneficiaryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function beneficiaryErrorMessage(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  if (!error) return fallback;
  if (error.code === "23503") {
    return "This beneficiary is used on invoices. Deactivate it instead of deleting.";
  }
  if (error.code === "23514") {
    return "Enter a company or legal name.";
  }
  if (
    error.code === "42501" ||
    /row-level security/i.test(error.message ?? "")
  ) {
    return "You do not have permission to do that.";
  }
  return fallback;
}
