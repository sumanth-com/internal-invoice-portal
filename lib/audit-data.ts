import { currentMonthRange } from "@/lib/invoice";
import {
  AUDIT_PAGE_SIZE,
  describeAuditMetadata,
  INVOICE_AUDIT_ACTIONS,
  isAuditAction,
  kolkataDayStart,
  kolkataNextDayStart,
  normalizeAuditAction,
  auditToOnOrAfterFrom,
  normalizeAuditDate,
  normalizeAuditGroup,
  normalizeAuditPage,
  normalizeAuditSearch,
  normalizeAuditUser,
  PAYMENT_AUDIT_ACTIONS,
  sourceInvoiceId,
  type AuditAction,
  type AuditActorOption,
  type AuditEntry,
  type AuditDateScope,
  type AuditLogPage,
} from "@/lib/audit";
import { invoiceToday } from "@/lib/invoice";
import { activeOwnerId } from "@/lib/owner-scope";
import { createClient } from "@/lib/supabase/server";

const AUDIT_COLUMNS = `
  id, invoice_id, actor_id, action, metadata, created_at,
  invoices!inner ( invoice_number, currency, created_by ),
  profiles ( full_name, email )
`;

type Embedded<T> = T | T[] | null;

type AuditRow = {
  id: string;
  invoice_id: string;
  actor_id: string | null;
  action: string;
  metadata: unknown;
  created_at: string;
  invoices: Embedded<{ invoice_number: string; currency: string }>;
  profiles: Embedded<{ full_name: string | null; email: string | null }>;
};

function one<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapEntry(row: AuditRow, sourceNumbers: ReadonlyMap<string, string>): AuditEntry | null {
  if (!isAuditAction(row.action)) return null;
  const invoice = one(row.invoices);
  const actor = one(row.profiles);
  const metadata = asMetadata(row.metadata);
  const described = describeAuditMetadata(
    row.action,
    metadata,
    invoice?.currency ?? "INR",
    sourceNumbers,
  );
  const email = actor?.email?.trim() || null;
  return {
    id: row.id,
    createdAt: row.created_at,
    action: row.action,
    invoiceId: row.invoice_id,
    invoiceNumber: invoice?.invoice_number?.trim() || "—",
    actorName: actor?.full_name?.trim() || email || "Unknown user",
    actorEmail: email,
    summary: described.summary,
    detail: described.detail,
  };
}

async function countEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  filter?: { from?: string; to?: string; actions?: readonly AuditAction[] },
) {
  let query = supabase
    .from("invoice_audit_log")
    .select("id, invoices!inner(created_by)", { count: "exact", head: true })
    .eq("invoices.created_by", ownerId);
  if (filter?.from) query = query.gte("created_at", filter.from);
  if (filter?.to) query = query.lt("created_at", filter.to);
  if (filter?.actions) query = query.in("action", [...filter.actions]);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function filteredEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  filters: {
    action: AuditLogPage["action"];
    group: AuditLogPage["group"];
    user: string;
    from: string;
    to: string;
    page: number;
    searchFilters: string[] | null;
  },
) {
  let query = supabase
    .from("invoice_audit_log")
    .select(AUDIT_COLUMNS, { count: "exact" })
    .eq("invoices.created_by", ownerId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (filters.group === "invoice") query = query.in("action", [...INVOICE_AUDIT_ACTIONS]);
  if (filters.group === "payment") query = query.in("action", [...PAYMENT_AUDIT_ACTIONS]);
  if (filters.action !== "all") query = query.eq("action", filters.action);
  if (filters.user !== "all") query = query.eq("actor_id", filters.user);
  if (filters.from) query = query.gte("created_at", kolkataDayStart(filters.from));
  if (filters.to) query = query.lt("created_at", kolkataNextDayStart(filters.to));
  if (filters.searchFilters) query = query.or(filters.searchFilters.join(","));

  const fromIndex = (filters.page - 1) * AUDIT_PAGE_SIZE;
  return query.range(fromIndex, fromIndex + AUDIT_PAGE_SIZE - 1);
}

async function searchTargets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  search: string,
) {
  const pattern = `"%${search.replaceAll('"', "")}%"`;
  const [invoices, actors] = await Promise.all([
    supabase
      .from("invoices")
      .select("id")
      .eq("created_by", ownerId)
      .ilike("invoice_number", `%${search}%`)
      .limit(100),
    supabase
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(100),
  ]);
  if (invoices.error) throw new Error(invoices.error.message);
  if (actors.error) throw new Error(actors.error.message);

  const invoiceIds = (invoices.data ?? []).map((row) => row.id);
  const actorIds = (actors.data ?? []).map((row) => row.id);
  const filters: string[] = [];
  if (invoiceIds.length > 0) filters.push(`invoice_id.in.(${invoiceIds.join(",")})`);
  if (actorIds.length > 0) filters.push(`actor_id.in.(${actorIds.join(",")})`);
  return filters;
}

export async function loadAuditLog(raw: {
  q?: string;
  action?: string;
  group?: string;
  user?: string;
  from?: string;
  to?: string;
  dates?: string;
  page?: string;
}): Promise<AuditLogPage> {
  const search = normalizeAuditSearch(raw.q);
  const action = normalizeAuditAction(raw.action);
  const group = normalizeAuditGroup(raw.group);
  const user = normalizeAuditUser(raw.user);
  const month = currentMonthRange();
  const requestedFrom = normalizeAuditDate(raw.from);
  const requestedTo = normalizeAuditDate(raw.to);
  let dates: AuditDateScope = "range";
  let from = month.from;
  let to = month.to;
  if (raw.dates === "all") {
    dates = "all";
    from = "";
    to = "";
  } else if (raw.dates === "from") {
    dates = "from";
    from = requestedFrom;
    to = "";
  } else if (requestedFrom || requestedTo) {
    from = requestedFrom || month.from;
    to = auditToOnOrAfterFrom(from, requestedTo || month.to);
  }
  const page = normalizeAuditPage(raw.page);
  const ownerId = (await activeOwnerId()) ?? "";
  const supabase = await createClient();
  const today = invoiceToday();

  const listFilters = { action, group, user, from, to, page, searchFilters: null };
  const [total, todayCount, paymentEvents, usersResult, searchFilters, initialList] = await Promise.all([
    countEvents(supabase, ownerId),
    countEvents(supabase, ownerId, {
      from: kolkataDayStart(today),
      to: kolkataNextDayStart(today),
    }),
    countEvents(supabase, ownerId, { actions: PAYMENT_AUDIT_ACTIONS }),
    supabase.from("profiles").select("id, full_name, email").order("full_name", { ascending: true }),
    search ? searchTargets(supabase, ownerId, search) : Promise.resolve<string[] | null>(null),
    search ? Promise.resolve(null) : filteredEntries(supabase, ownerId, listFilters),
  ]);

  if (usersResult.error) throw new Error(usersResult.error.message);

  const users: AuditActorOption[] = (usersResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name?.trim() || row.email?.trim() || "Unknown user",
    email: row.email?.trim() || "",
  }));

  const base = {
    total,
    today: todayCount,
    invoiceEvents: Math.max(0, total - paymentEvents),
    paymentEvents,
    page,
    search,
    action,
    group,
    user,
    from,
    to,
    dates,
    users,
  };

  if (searchFilters && searchFilters.length === 0) {
    return { ...base, entries: [], filtered: 0, pageCount: 1 };
  }

  const listed =
    initialList ??
    (await filteredEntries(supabase, ownerId, { ...listFilters, searchFilters }));
  const { data, error, count } = listed;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AuditRow[];
  const sourceIds = [
    ...new Set(
      rows
        .map((row) => sourceInvoiceId(asMetadata(row.metadata)))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const sourceNumbers = new Map<string, string>();
  if (sourceIds.length > 0) {
    const sources = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("created_by", ownerId)
      .in("id", sourceIds);
    if (sources.error) throw new Error(sources.error.message);
    for (const source of sources.data ?? []) {
      if (source.invoice_number) sourceNumbers.set(source.id, source.invoice_number);
    }
  }

  const filtered = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(filtered / AUDIT_PAGE_SIZE));

  return {
    ...base,
    entries: rows.flatMap((row) => {
      const entry = mapEntry(row, sourceNumbers);
      return entry ? [entry] : [];
    }),
    filtered,
    pageCount,
  };
}
