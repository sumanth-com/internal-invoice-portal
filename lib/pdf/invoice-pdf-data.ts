import { loadInvoice } from "@/lib/invoices";
import type {
  InvoicePdfData,
  InvoicePdfLogo,
} from "@/lib/pdf/invoice-document";
import { createClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "company-logos";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TIMEOUT_MS = 5000;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function logoFormat(bytes: Buffer): InvoicePdfLogo["format"] | null {
  if (bytes.length > 8 && bytes.readUInt32BE(0) === 0x89504e47) return "png";
  if (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }
  return null;
}

async function fetchLogoBytes(supabase: SupabaseClient, reference: string) {
  if (/^https:\/\//i.test(reference)) {
    const response = await fetch(reference, {
      signal: AbortSignal.timeout(LOGO_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }

  const objectPath = reference
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${LOGO_BUCKET}/`), "");
  if (!objectPath) return null;
  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .download(objectPath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function loadLogo(supabase: SupabaseClient, reference: string | null) {
  const value = reference?.trim();
  if (!value) return null;
  try {
    const bytes = await fetchLogoBytes(supabase, value);
    if (!bytes || bytes.length > LOGO_MAX_BYTES) return null;
    const format = logoFormat(bytes);
    return format ? { data: bytes, format } : null;
  } catch {
    return null;
  }
}

async function loadCompanyBranding(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("company_settings")
    .select("logo_url, website")
    .maybeSingle();
  if (error) throw error;
  const logo = await loadLogo(supabase, data?.logo_url ?? null);
  return { logo, website: data?.website?.trim() || null };
}

export async function loadInvoicePdfData(
  id: string,
): Promise<InvoicePdfData | null> {
  const supabase = await createClient();
  const [invoice, branding] = await Promise.all([
    loadInvoice(id),
    loadCompanyBranding(supabase),
  ]);
  if (!invoice) return null;
  return { invoice, ...branding };
}

export function invoicePdfFileName(invoiceNumber: string) {
  return `Invoice-${invoiceNumber.replace(/[^A-Za-z0-9_-]/g, "")}.pdf`;
}
