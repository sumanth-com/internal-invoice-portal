import { LOGO_BUCKET } from "@/lib/company-logo";
import {
  BANK_COLUMNS,
  buildSequenceRow,
  COMPANY_COLUMNS,
  currentNumberingPeriod,
  emptyCompanyProfile,
  mapBankAccount,
  mapCompanyProfile,
  numberingFloor,
  sequenceSuffix,
  sortBankAccounts,
  type BankRow,
  type CompanyProfile,
  type CompanyRow,
  type InvoiceSequenceRow,
  type SettingsBankAccount,
} from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type PortalSettings = {
  company: CompanyProfile;
  banks: SettingsBankAccount[];
  sequences: InvoiceSequenceRow[];
};

type InvoiceRef = {
  invoice_number: string;
  bank_account_id: string | null;
};

type SequenceRow = {
  id: string;
  period: string;
  next_number: number;
  updated_at: string;
};

function suffixesFor(period: string, invoices: InvoiceRef[]) {
  const suffixes: number[] = [];
  for (const invoice of invoices) {
    const suffix = sequenceSuffix(invoice.invoice_number, period);
    if (suffix !== null) suffixes.push(suffix);
  }
  return suffixes;
}

async function logoPreviewUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  logoUrl: string | null,
) {
  const value = logoUrl?.trim();
  if (!value) return null;
  if (/^https:\/\//i.test(value)) return value;
  const path = value.replace(/^\/+/, "").replace(new RegExp(`^${LOGO_BUCKET}/`), "");
  if (!path || path.includes("..") || path.includes("/")) return null;
  const signed = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? null;
}

export async function loadPortalSettings(): Promise<PortalSettings> {
  const supabase = await createClient();
  const [companyResult, banksResult, sequencesResult, invoicesResult] = await Promise.all([
    supabase.from("company_settings").select(COMPANY_COLUMNS).eq("id", true).maybeSingle(),
    supabase.from("bank_accounts").select(BANK_COLUMNS),
    supabase
      .from("invoice_sequences")
      .select("id, period, next_number, updated_at")
      .order("period", { ascending: false }),
    supabase.from("invoices").select("invoice_number, bank_account_id"),
  ]);

  if (companyResult.error) throw new Error(companyResult.error.message);
  if (banksResult.error) throw new Error(banksResult.error.message);
  if (sequencesResult.error) throw new Error(sequencesResult.error.message);
  if (invoicesResult.error) throw new Error(invoicesResult.error.message);

  const invoices = (invoicesResult.data ?? []) as InvoiceRef[];
  const usage = new Map<string, number>();
  for (const invoice of invoices) {
    if (!invoice.bank_account_id) continue;
    usage.set(invoice.bank_account_id, (usage.get(invoice.bank_account_id) ?? 0) + 1);
  }

  const companyRow = companyResult.data as CompanyRow | null;
  const preview = companyRow ? await logoPreviewUrl(supabase, companyRow.logo_url) : null;
  const company = companyRow ? mapCompanyProfile(companyRow, preview) : emptyCompanyProfile();

  const banks = sortBankAccounts(
    ((banksResult.data ?? []) as BankRow[]).map((row) =>
      mapBankAccount(row, usage.get(row.id) ?? 0),
    ),
  );

  const sequences = ((sequencesResult.data ?? []) as SequenceRow[]).map((row) =>
    buildSequenceRow({
      id: row.id,
      period: row.period,
      nextNumber: row.next_number,
      updatedAt: row.updated_at,
      suffixes: suffixesFor(row.period, invoices),
    }),
  );

  const currentPeriod = currentNumberingPeriod();
  if (!sequences.some((row) => row.period === currentPeriod)) {
    const suffixes = suffixesFor(currentPeriod, invoices);
    sequences.unshift(
      buildSequenceRow({
        id: null,
        period: currentPeriod,
        nextNumber: numberingFloor(suffixes),
        updatedAt: null,
        suffixes,
        pending: true,
      }),
    );
  }

  return { company, banks, sequences };
}

export async function signedLogoUrl(path: string) {
  const supabase = await createClient();
  const signed = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(path, 60 * 60);
  return signed.data?.signedUrl ?? null;
}
