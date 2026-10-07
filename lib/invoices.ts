import {
  emptyPartyFields,
  formatBeneficiaryBillTo,
  formatCompanyBillFrom,
  INVOICE_LIST_LIMIT,
  isInvoiceId,
  isInvoicePaymentStanding,
  isInvoiceStatus,
  invoiceNumberSearchTerms,
  normalizeInvoiceBeneficiary,
  normalizeInvoiceDateFilter,
  normalizeInvoicePaymentFilter,
  normalizeInvoiceSearch,
  normalizeInvoiceSort,
  normalizeInvoiceStatusFilter,
  partyFieldsFromSource,
  type BankAccountOption,
  type CompanyInvoiceDefaults,
  type InvoiceDetail,
  type InvoiceLine,
  type InvoiceListData,
  type InvoicePartyOption,
  type InvoicePaymentStanding,
  type InvoiceSort,
  type InvoiceStatus,
  type InvoiceSummary,
} from "@/lib/invoice";
import { signBeneficiaryLogoMap } from "@/lib/beneficiary-logo";
import { activeOwnerId } from "@/lib/owner-scope";
import { createClient } from "@/lib/supabase/server";

type SummaryRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  subtotal: number | string;
  gst_amount: number | string;
  total: number | string;
  tds_amount: number | string;
  balance_due: number | string;
  currency: string;
  beneficiary_id: string;
  bill_to: string | null;
  beneficiaries: { legal_name: string } | { legal_name: string }[] | null;
};

function money(value: number | string) {
  return Number(value);
}

function storedPartyName(value: string | null | undefined) {
  const line = value
    ?.split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  return line || "—";
}

function beneficiaryName(row: SummaryRow) {
  const embedded = row.beneficiaries;
  const record = Array.isArray(embedded) ? embedded[0] : embedded;
  return record?.legal_name?.trim() || storedPartyName(row.bill_to);
}

function mapSummary(row: SummaryRow, paymentStanding: InvoicePaymentStanding): InvoiceSummary {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    beneficiaryName: beneficiaryName(row),
    subtotal: money(row.subtotal),
    gstAmount: money(row.gst_amount),
    total: money(row.total),
    tdsAmount: money(row.tds_amount),
    balanceDue: money(row.balance_due),
    currency: row.currency,
    status: isInvoiceStatus(row.status) ? row.status : "draft",
    paymentStanding,
  };
}

function standingFor(status: InvoiceStatus, raw: string | undefined): InvoicePaymentStanding {
  if (raw && isInvoicePaymentStanding(raw)) return raw;
  if (status === "cancelled") return "cancelled";
  if (status === "paid") return "paid";
  if (status === "draft") return "draft";
  return "unpaid";
}

function mapParty(row: {
  id: string;
  legal_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  gstin: string | null;
  pan: string | null;
  is_active: boolean;
  logo_path?: string | null;
}): InvoicePartyOption {
  return {
    id: row.id,
    legalName: row.legal_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    gstin: row.gstin,
    pan: row.pan,
    isActive: row.is_active,
    logoUrl: null,
  };
}

function mapBank(row: {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string | null;
  branch: string | null;
  is_default: boolean;
  is_active: boolean;
}): BankAccountOption {
  return {
    id: row.id,
    accountHolderName: row.account_holder_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    ifscCode: row.ifsc_code,
    branch: row.branch,
    isDefault: row.is_default,
    isActive: row.is_active,
  };
}

async function countInvoices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
) {
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("created_by", ownerId);
  if (error) throw error;
  return count ?? 0;
}

export async function loadInvoices(raw: {
  q?: string;
  beneficiary?: string;
  status?: string;
  payment?: string;
  from?: string;
  to?: string;
  sort?: string;
}): Promise<InvoiceListData> {
  const search = normalizeInvoiceSearch(raw.q);
  const beneficiary = normalizeInvoiceBeneficiary(raw.beneficiary);
  const status = normalizeInvoiceStatusFilter(raw.status);
  const payment = normalizeInvoicePaymentFilter(raw.payment);
  const from = normalizeInvoiceDateFilter(raw.from);
  const to = normalizeInvoiceDateFilter(raw.to);
  const sort: InvoiceSort = normalizeInvoiceSort(raw.sort);
  const ownerId = await activeOwnerId();
  const supabase = await createClient();
  const beneficiaryOptions = supabase
    .from("beneficiaries")
    .select("id, legal_name, logo_path")
    .eq("created_by", ownerId ?? "")
    .order("legal_name", { ascending: true });
  const numberOptions = supabase
    .from("invoices")
    .select("invoice_number")
    .eq("created_by", ownerId ?? "")
    .order("invoice_number", { ascending: false })
    .limit(500);

  let beneficiaryIds: string[] = [];
  if (search) {
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("id")
      .eq("created_by", ownerId ?? "")
      .ilike("legal_name", `%${search}%`);
    if (error) throw error;
    beneficiaryIds = (data ?? []).map((row) => row.id);
  }

  let paymentIds: string[] | null = null;
  if (payment !== "all") {
    const { data, error } = await supabase
      .from("invoice_balances")
      .select("invoice_id")
      .eq("payment_status", payment);
    if (error) throw error;
    paymentIds = (data ?? []).map((row) => row.invoice_id);
  }

  if (paymentIds && paymentIds.length === 0) {
    const [total, options, numbers] = await Promise.all([
      countInvoices(supabase, ownerId ?? ""),
      beneficiaryOptions,
      numberOptions,
    ]);
    if (options.error) throw options.error;
    if (numbers.error) throw numbers.error;
    return {
      invoices: [],
      total,
      search,
      beneficiary,
      beneficiaries: await mapBeneficiaryOptions(supabase, options.data),
      invoiceNumbers: invoiceNumberOptions(numbers.data),
      status,
      payment,
      from,
      to,
      sort,
      truncated: false,
    };
  }

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, invoice_date, status, subtotal, gst_amount, total, tds_amount, balance_due, currency, beneficiary_id, bill_to, beneficiaries(legal_name)",
    )
    .eq("created_by", ownerId ?? "")
    .limit(INVOICE_LIST_LIMIT + 1);

  if (paymentIds) query = query.in("id", paymentIds);
  if (beneficiary) query = query.eq("beneficiary_id", beneficiary);
  if (status !== "all") query = query.eq("status", status);
  if (from) query = query.gte("invoice_date", from);
  if (to) query = query.lte("invoice_date", to);
  if (search) {
    const filters = invoiceNumberSearchTerms(search).map(
      (term) => `invoice_number.ilike.${quotedLike(term)}`,
    );
    if (beneficiaryIds.length > 0) {
      filters.push(`beneficiary_id.in.(${beneficiaryIds.join(",")})`);
    }
    query = query.or(filters.join(","));
  }

  if (sort === "date_asc") query = query.order("invoice_date", { ascending: true });
  if (sort === "date_desc") query = query.order("invoice_date", { ascending: false });
  if (sort === "number_asc") query = query.order("invoice_number", { ascending: true });
  if (sort === "number_desc") query = query.order("invoice_number", { ascending: false });
  if (sort === "total_asc") query = query.order("total", { ascending: true });
  if (sort === "total_desc") query = query.order("total", { ascending: false });
  if (sort === "status_asc") query = query.order("status", { ascending: true });
  if (sort !== "beneficiary_asc") {
    query = query.order("invoice_number", { ascending: true });
  }

  const [{ data, error }, total, options, numbers] = await Promise.all([
    query,
    countInvoices(supabase, ownerId ?? ""),
    beneficiaryOptions,
    numberOptions,
  ]);
  if (error) throw error;
  if (options.error) throw options.error;
  if (numbers.error) throw numbers.error;

  let rows = (data ?? []) as SummaryRow[];
  if (sort === "beneficiary_asc") {
    rows = [...rows].sort((left, right) =>
      beneficiaryName(left).localeCompare(beneficiaryName(right), "en"),
    );
  }

  const truncated = rows.length > INVOICE_LIST_LIMIT;
  const visible = truncated ? rows.slice(0, INVOICE_LIST_LIMIT) : rows;
  const standings = new Map<string, string>();
  if (visible.length > 0) {
    const { data: balances, error: balanceError } = await supabase
      .from("invoice_balances")
      .select("invoice_id, payment_status")
      .in(
        "invoice_id",
        visible.map((row) => row.id),
      );
    if (balanceError) throw balanceError;
    for (const balance of balances ?? []) {
      standings.set(balance.invoice_id, balance.payment_status);
    }
  }

  return {
    invoices: visible.map((row) => {
      const invoiceStatus = isInvoiceStatus(row.status) ? row.status : "draft";
      return mapSummary(row, standingFor(invoiceStatus, standings.get(row.id)));
    }),
    total,
    search,
    beneficiary,
    beneficiaries: await mapBeneficiaryOptions(supabase, options.data),
    invoiceNumbers: invoiceNumberOptions(numbers.data),
    status,
    payment,
    from,
    to,
    sort,
    truncated,
  };
}

function quotedLike(value: string) {
  return `"%${value.replaceAll('"', "")}%"`;
}

async function mapBeneficiaryOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: { id: string; legal_name: string; logo_path: string | null }[] | null,
) {
  const logos = await signBeneficiaryLogoMap(
    supabase,
    (rows ?? []).map((row) => row.logo_path),
  );
  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.legal_name,
    logoUrl: row.logo_path ? logos.get(row.logo_path) ?? null : null,
  }));
}

function invoiceNumberOptions(rows: { invoice_number: string }[] | null) {
  return [
    ...new Set(
      (rows ?? [])
        .map((row) => row.invoice_number?.trim() ?? "")
        .filter((number) => number.length > 0),
    ),
  ];
}

export async function loadInvoice(id: string): Promise<InvoiceDetail | null> {
  if (!isInvoiceId(id)) return null;
  const ownerId = await activeOwnerId();
  if (!ownerId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `id, invoice_number, beneficiary_id, bank_account_id, status, invoice_date, due_date,
       bill_from, bill_to, place_of_supply, supply_state, state_code, client_gstin, deal_reference,
       currency, payment_terms, notes, gst_enabled, gst_rate,
       subtotal, cgst_amount, sgst_amount, igst_amount, gst_amount, total, tds_amount, balance_due,
       amount_in_words, issued_at, paid_at, cancelled_at, created_at,
       beneficiaries ( legal_name, email ),
       bank_accounts ( id, account_holder_name, bank_name, account_number, ifsc_code, branch, is_default, is_active ),
       invoice_items ( id, position, hsn, description, quantity, rate, line_subtotal )`,
    )
    .eq("id", id)
    .eq("created_by", ownerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const beneficiary = Array.isArray(data.beneficiaries)
    ? data.beneficiaries[0]
    : data.beneficiaries;
  const bank = Array.isArray(data.bank_accounts)
    ? data.bank_accounts[0]
    : data.bank_accounts;
  const items = ((data.invoice_items ?? []) as {
    id: string;
    position: number;
    hsn: string | null;
    description: string;
    quantity: number | string;
    rate: number | string;
    line_subtotal: number | string;
  }[])
    .slice()
    .sort((left, right) => left.position - right.position)
    .map(
      (item): InvoiceLine => ({
        id: item.id,
        position: item.position,
        description: item.description,
        hsn: item.hsn,
        quantity: money(item.quantity),
        rate: money(item.rate),
        lineSubtotal: money(item.line_subtotal),
      }),
    );

  const status: InvoiceStatus = isInvoiceStatus(data.status) ? data.status : "draft";

  return {
    id: data.id,
    invoiceNumber: data.invoice_number,
    beneficiaryId: data.beneficiary_id,
    beneficiaryName: beneficiary?.legal_name?.trim() || storedPartyName(data.bill_to),
    beneficiaryEmail: beneficiary?.email?.trim() || null,
    bankAccountId: data.bank_account_id,
    bank: bank ? mapBank(bank) : null,
    status,
    invoiceDate: data.invoice_date,
    dueDate: data.due_date,
    billFrom: data.bill_from,
    billTo: data.bill_to,
    currency: data.currency,
    paymentTerms: data.payment_terms,
    notes: data.notes,
    placeOfSupply: data.place_of_supply,
    supplyState: data.supply_state,
    stateCode: data.state_code,
    clientGstin: data.client_gstin,
    dealReference: data.deal_reference,
    gstEnabled: data.gst_enabled,
    gstRate: money(data.gst_rate),
    subtotal: money(data.subtotal),
    cgstAmount: money(data.cgst_amount),
    sgstAmount: money(data.sgst_amount),
    igstAmount: money(data.igst_amount),
    gstAmount: money(data.gst_amount),
    total: money(data.total),
    tdsAmount: money(data.tds_amount),
    balanceDue: money(data.balance_due),
    amountInWords: data.amount_in_words,
    issuedAt: data.issued_at,
    paidAt: data.paid_at,
    cancelledAt: data.cancelled_at,
    createdAt: data.created_at,
    items,
  };
}

export async function loadInvoiceFormOptions(selected?: {
  beneficiaryId?: string;
  bankAccountId?: string | null;
}) {
  const ownerId = await activeOwnerId();
  const supabase = await createClient();
  const [beneficiariesResult, banksResult, companyResult] = await Promise.all([
    supabase
      .from("beneficiaries")
      .select(
        "id, legal_name, contact_name, email, phone, address_line1, address_line2, city, state, postal_code, country, gstin, pan, is_active, logo_path",
      )
      .eq("created_by", ownerId ?? "")
      .order("legal_name", { ascending: true }),
    supabase
      .from("bank_accounts")
      .select(
        "id, account_holder_name, bank_name, account_number, ifsc_code, branch, is_default, is_active",
      )
      .order("bank_name", { ascending: true }),
    supabase
      .from("company_settings")
      .select(
        "legal_name, trade_name, address_line1, address_line2, city, state, postal_code, country, email, phone, gstin, pan, cin, default_currency, default_payment_terms, invoice_notes, default_gst_enabled, default_gst_rate",
      )
      .maybeSingle(),
  ]);

  if (beneficiariesResult.error) throw beneficiariesResult.error;
  if (banksResult.error) throw banksResult.error;
  if (companyResult.error) throw companyResult.error;

  const partyLogos = await signBeneficiaryLogoMap(
    supabase,
    (beneficiariesResult.data ?? []).map((row) => row.logo_path),
  );
  const beneficiaries = (beneficiariesResult.data ?? [])
    .map((row) => ({
      ...mapParty(row),
      logoUrl: row.logo_path ? partyLogos.get(row.logo_path) ?? null : null,
    }))
    .filter(
      (beneficiary) =>
        beneficiary.isActive || beneficiary.id === selected?.beneficiaryId,
    );
  const bankAccounts = (banksResult.data ?? [])
    .map(mapBank)
    .filter(
      (account) => account.isActive || account.id === selected?.bankAccountId,
    );

  const company = companyResult.data;
  const fromParty = company
    ? partyFieldsFromSource({
        legalName: company.legal_name,
        tradeName: company.trade_name,
        addressLine1: company.address_line1,
        addressLine2: company.address_line2,
        city: company.city,
        state: company.state,
        postalCode: company.postal_code,
        country: company.country,
        email: company.email,
        phone: company.phone,
        gstin: company.gstin,
        pan: company.pan,
        cin: company.cin,
      })
    : emptyPartyFields;
  const defaults: CompanyInvoiceDefaults = {
    billFrom: company
      ? formatCompanyBillFrom({
          legalName: company.legal_name,
          tradeName: company.trade_name,
          addressLine1: company.address_line1,
          addressLine2: company.address_line2,
          city: company.city,
          state: company.state,
          postalCode: company.postal_code,
          country: company.country,
          email: company.email,
          phone: company.phone,
          gstin: company.gstin,
          pan: company.pan,
          cin: company.cin,
        })
      : "",
    fromParty,
    currency: company?.default_currency ?? "INR",
    paymentTerms: company?.default_payment_terms ?? "",
    notes: company?.invoice_notes ?? "",
    gstEnabled: company?.default_gst_enabled ?? true,
    gstRate: company ? money(company.default_gst_rate) : 18,
  };

  return { beneficiaries, bankAccounts, defaults };
}

export function billToForBeneficiary(
  beneficiaries: InvoicePartyOption[],
  beneficiaryId: string,
) {
  const beneficiary = beneficiaries.find((item) => item.id === beneficiaryId);
  return beneficiary ? formatBeneficiaryBillTo(beneficiary) : "";
}
