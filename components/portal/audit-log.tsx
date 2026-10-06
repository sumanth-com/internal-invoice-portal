"use client";

import { clearAuditLog } from "@/app/(portal)/audit/actions";
import { IconAction } from "@/components/portal/icon-action";
import { Modal, ModalBody, ModalFooter } from "@/components/portal/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AUDIT_ACTIONS,
  auditActionLabel,
  auditFiltersActive,
  auditLogHref,
  auditToOnOrAfterFrom,
  formatAuditTimestamp,
  isPaymentAuditAction,
  type AuditAction,
  type AuditDateScope,
  type AuditEntry,
  type AuditGroup,
  type AuditLogPage,
} from "@/lib/audit";
import { formatInvoiceDate, invoiceToday } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { Activity, CalendarDays, ChevronDown, Eye, FileText, IndianRupee, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState, type ReactNode } from "react";

const fieldClass =
  "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

type AuditFilters = Pick<AuditLogPage, "search" | "action" | "group" | "user" | "from" | "to" | "dates">;
type EventCard = "total" | "today" | "invoice" | "payment";

function selectedEventCard(filters: AuditFilters): EventCard | null {
  const plain = filters.action === "all" && filters.user === "all" && filters.search.length === 0;
  if (!plain) return null;
  if (filters.group === "invoice" && filters.dates === "all") return "invoice";
  if (filters.group === "payment" && filters.dates === "all") return "payment";
  if (filters.group !== "all") return null;
  const today = invoiceToday();
  if (filters.from === today && filters.to === today) return "today";
  if (filters.dates === "all") return "total";
  return null;
}

const eventWaves = {
  total: {
    back: "M0 46C78 46 128 22 206 30C286 38 338 16 400 24V120H0Z",
    front: "M0 74C92 74 146 52 224 58C302 64 348 46 400 52V120H0Z",
    backClass: "fill-sky-100 dark:fill-sky-900",
    frontClass: "fill-sky-200 dark:fill-sky-700",
  },
  today: {
    back: "M0 34C86 34 132 54 210 44C286 34 340 22 400 30V120H0Z",
    front: "M0 64C96 64 150 82 228 70C306 58 352 50 400 56V120H0Z",
    backClass: "fill-violet-100 dark:fill-violet-900",
    frontClass: "fill-violet-200 dark:fill-violet-700",
  },
  invoice: {
    back: "M0 42C72 28 138 24 214 38C292 52 346 36 400 26V120H0Z",
    front: "M0 70C84 56 148 52 226 66C304 80 350 66 400 54V120H0Z",
    backClass: "fill-amber-100 dark:fill-amber-900",
    frontClass: "fill-amber-200 dark:fill-amber-700",
  },
  payment: {
    back: "M0 38C70 50 140 18 210 32C280 46 340 28 400 36V120H0Z",
    front: "M0 68C80 80 150 48 220 62C290 76 345 58 400 64V120H0Z",
    backClass: "fill-emerald-100 dark:fill-emerald-900",
    frontClass: "fill-emerald-200 dark:fill-emerald-700",
  },
} as const;

function StatCard({
  label,
  value,
  selected,
  onSelect,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  selected: boolean;
  onSelect: () => void;
  icon: typeof Activity;
  tone: keyof typeof eventWaves;
}) {
  const wave = eventWaves[tone];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="relative flex min-h-[168px] flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative z-10 flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full"
        aria-hidden
      >
        <path d={wave.back} className={wave.backClass} />
        <path d={wave.front} className={wave.frontClass} />
      </svg>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(fieldClass, "pl-3 pr-9")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ActionBadge({ action }: { action: AuditEntry["action"] }) {
  return (
    <Badge variant={action === "cancelled" ? "outline" : "secondary"}>
      {auditActionLabel(action)}
    </Badge>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value}</dd>
    </div>
  );
}

function AuditDetailModal({
  entry,
  onClose,
}: {
  entry: AuditEntry | null;
  onClose: () => void;
}) {
  const detail = entry?.detail;
  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      title={entry ? auditActionLabel(entry.action) : "Activity"}
      description={entry ? `Invoice ${entry.invoiceNumber}` : undefined}
    >
      {entry && detail ? (
        <>
          <ModalBody>
            <dl className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <DetailItem label="Date and time" value={formatAuditTimestamp(entry.createdAt)} />
              <DetailItem label="Action" value={auditActionLabel(entry.action)} />
              <DetailItem label="User" value={entry.actorName} />
              <DetailItem label="Email" value={entry.actorEmail ?? "—"} />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Invoice number</dt>
                <dd className="mt-1 text-sm">
                  {entry.invoiceId ? (
                    <Link
                      href={`/invoices/${entry.invoiceId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {entry.invoiceNumber}
                    </Link>
                  ) : (
                    entry.invoiceNumber
                  )}
                </dd>
              </div>
              {detail.statusChange ? (
                <DetailItem label="Status change" value={detail.statusChange} />
              ) : null}
              {detail.amount ? <DetailItem label="Amount" value={detail.amount} /> : null}
              {detail.paymentDate ? (
                <DetailItem label="Payment date" value={formatInvoiceDate(detail.paymentDate)} />
              ) : null}
              {detail.paymentMode ? (
                <DetailItem label="Payment mode" value={detail.paymentMode} />
              ) : null}
              {detail.reference ? (
                <DetailItem label="Payment reference" value={detail.reference} />
              ) : null}
              {detail.recipient ? (
                <DetailItem label="Email recipient" value={detail.recipient} />
              ) : null}
              {detail.sourceInvoice ? (
                <DetailItem label="Source invoice" value={detail.sourceInvoice} />
              ) : null}
            </dl>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </>
      ) : null}
    </Modal>
  );
}

export function AuditLog({ data }: { data: AuditLogPage }) {
  const router = useRouter();
  const [source, setSource] = useState(data);
  const [search, setSearch] = useState(data.search);
  const [action, setAction] = useState(data.action);
  const [group, setGroup] = useState<AuditGroup>(data.group);
  const [user, setUser] = useState(data.user);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [dates, setDates] = useState<AuditDateScope>(data.dates);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  if (source !== data) {
    setSource(data);
    setSearch(data.search);
    setAction(data.action);
    setGroup(data.group);
    setUser(data.user);
    setFrom(data.from);
    setTo(data.to);
    setDates(data.dates);
  }

  const filters: AuditFilters = { search, action, group, user, from, to, dates };
  const filtering = auditFiltersActive(filters);
  const activeCard = selectedEventCard(filters);

  const pushFilters = useCallback(
    (next?: Partial<AuditFilters>) => {
      const href = auditLogHref({
        search: next?.search ?? search,
        action: next?.action ?? action,
        group: next?.group ?? group,
        user: next?.user ?? user,
        from: next?.from ?? from,
        to: next?.to ?? to,
        dates: next?.dates ?? dates,
      });
      startTransition(() => router.push(href));
    },
    [search, action, group, user, from, to, dates, router],
  );

  useEffect(() => {
    const query = search.trim();
    if (query === data.search) return;
    const timer = window.setTimeout(() => pushFilters({ search: query }), 300);
    return () => window.clearTimeout(timer);
  }, [search, data.search, pushFilters]);

  function applyAction(value: string) {
    const nextAction: AuditAction | "all" =
      value !== "all" && AUDIT_ACTIONS.includes(value as AuditAction) ? (value as AuditAction) : "all";
    let nextGroup = group;
    if (nextAction !== "all") {
      const payment = isPaymentAuditAction(nextAction);
      if ((group === "payment" && !payment) || (group === "invoice" && payment)) nextGroup = "all";
    }
    setAction(nextAction);
    setGroup(nextGroup);
    pushFilters({ action: nextAction, group: nextGroup });
  }

  function resetListFilters() {
    setSearch("");
    setAction("all");
    setUser("all");
  }

  function selectCard(card: EventCard) {
    resetListFilters();
    if (card === "total") {
      setGroup("all");
      setFrom("");
      setTo("");
      setDates("all");
      pushFilters({
        search: "",
        action: "all",
        group: "all",
        user: "all",
        from: "",
        to: "",
        dates: "all",
      });
      return;
    }
    if (card === "today") {
      const today = invoiceToday();
      setGroup("all");
      setFrom(today);
      setTo(today);
      setDates("range");
      pushFilters({
        search: "",
        action: "all",
        group: "all",
        user: "all",
        from: today,
        to: today,
        dates: "range",
      });
      return;
    }
    const nextGroup = card === "invoice" ? "invoice" : "payment";
    setGroup(nextGroup);
    setFrom("");
    setTo("");
    setDates("all");
    pushFilters({
      search: "",
      action: "all",
      group: nextGroup,
      user: "all",
      from: "",
      to: "",
      dates: "all",
    });
  }

  function showAllActivity() {
    setSearch("");
    setAction("all");
    setGroup("all");
    setUser("all");
    setFrom("");
    setTo("");
    setDates("all");
    pushFilters({
      search: "",
      action: "all",
      group: "all",
      user: "all",
      from: "",
      to: "",
      dates: "all",
    });
  }

  function applyFrom(value: string) {
    if (!value) {
      setFrom("");
      setTo("");
      setDates("all");
      pushFilters({ from: "", to: "", dates: "all" });
      return;
    }
    const nextTo = to ? auditToOnOrAfterFrom(value, to) : "";
    const nextDates: AuditDateScope = nextTo ? "range" : "from";
    setFrom(value);
    setTo(nextTo);
    setDates(nextDates);
    pushFilters({ from: value, to: nextTo, dates: nextDates });
  }

  function applyTo(value: string) {
    if (!value) {
      const nextDates: AuditDateScope = from ? "from" : "all";
      setTo("");
      setDates(nextDates);
      pushFilters({ to: "", dates: nextDates });
      return;
    }
    const nextTo = from && value < from ? from : value;
    setTo(nextTo);
    setDates("range");
    pushFilters({ to: nextTo, dates: "range" });
  }

  async function removeAllActivity() {
    setClearing(true);
    setClearError(null);
    const result = await clearAuditLog();
    setClearing(false);
    if (result.error) {
      setClearError(result.error);
      return;
    }
    setConfirmClear(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Events"
          value={data.total}
          selected={activeCard === "total"}
          onSelect={() => selectCard("total")}
          icon={Activity}
          tone="total"
        />
        <StatCard
          label="Today"
          value={data.today}
          selected={activeCard === "today"}
          onSelect={() => selectCard("today")}
          icon={CalendarDays}
          tone="today"
        />
        <StatCard
          label="Invoice Events"
          value={data.invoiceEvents}
          selected={activeCard === "invoice"}
          onSelect={() => selectCard("invoice")}
          icon={FileText}
          tone="invoice"
        />
        <StatCard
          label="Payment Events"
          value={data.paymentEvents}
          selected={activeCard === "payment"}
          onSelect={() => selectCard("payment")}
          icon={IndianRupee}
          tone="payment"
        />
      </div>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">{filtering ? "Matching activity" : "All activity"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filtering ? "Activity matching your search and filters." : "Newest invoice activity first."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setClearError(null);
                setConfirmClear(true);
              }}
            >
              Delete all
            </Button>
          </div>
          <form
            className="flex items-center gap-2 overflow-x-auto"
            onSubmit={(event) => {
              event.preventDefault();
              pushFilters({ search: search.trim() });
            }}
          >
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Invoice, name, or email"
                aria-label="Search activity"
                className="h-9 py-0 pl-8 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
              />
            </div>
            <FilterSelect label="Action" value={action} onChange={applyAction} className="w-44">
              <option value="all">All actions</option>
              {AUDIT_ACTIONS.map((item) => (
                <option key={item} value={item}>
                  {auditActionLabel(item)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="User"
              value={user}
              onChange={(value) => {
                setUser(value);
                pushFilters({ user: value });
              }}
              className="w-44"
            >
              <option value="all">All users</option>
              {data.users.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </FilterSelect>
            <Input
              type="date"
              value={from}
              aria-label="From date"
              onChange={(event) => applyFrom(event.target.value)}
              className="h-9 w-40 shrink-0 py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
            />
            <Input
              type="date"
              value={to}
              min={from || undefined}
              aria-label="To date"
              onChange={(event) => applyTo(event.target.value)}
              className="h-9 w-40 shrink-0 py-0 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
            />
          </form>
        </div>

        {data.entries.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {filtering
                ? "No activity matches these filters."
                : "No activity has been recorded yet."}
            </p>
            {filtering ? (
              <Button type="button" variant="outline" className="mt-4" onClick={showAllActivity}>
                Show all activity
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-center text-primary-foreground">
                    <th className="w-[18%] border-b border-primary bg-primary px-3 py-3 text-center align-middle font-medium">Date & time</th>
                    <th className="w-[18%] border-b border-primary bg-primary px-3 py-3 text-center align-middle font-medium">User</th>
                    <th className="w-[16%] border-b border-primary bg-primary px-3 py-3 text-center align-middle font-medium">Action</th>
                    <th className="w-[16%] border-b border-primary bg-primary px-3 py-3 text-center align-middle font-medium">Invoice</th>
                    <th className="border-b border-primary bg-primary px-3 py-3 text-center align-middle font-medium">Details</th>
                    <th className="w-16 border-b border-primary bg-primary px-3 py-3 text-center align-middle font-medium">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/40">
                      <td className="border-b px-3 py-3 text-center align-middle text-muted-foreground">
                        {formatAuditTimestamp(entry.createdAt)}
                      </td>
                      <td className="border-b px-3 py-3 text-center align-middle">
                        <p className="font-medium">{entry.actorName}</p>
                        {entry.actorEmail && entry.actorEmail !== entry.actorName ? (
                          <p className="mt-1 break-all text-xs text-muted-foreground">{entry.actorEmail}</p>
                        ) : null}
                      </td>
                      <td className="border-b px-3 py-3 text-center align-middle">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="border-b px-3 py-3 text-center align-middle font-medium">
                        <Link
                          href={`/invoices/${entry.invoiceId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {entry.invoiceNumber}
                        </Link>
                      </td>
                      <td className="border-b px-3 py-3 break-words text-center align-middle text-muted-foreground">
                        {entry.summary}
                      </td>
                      <td className="border-b px-3 py-3 text-center align-middle">
                        <IconAction label="View" onClick={() => setSelected(entry)}>
                          <Eye />
                        </IconAction>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex shrink-0 flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {data.filtered === 1 ? "1 event." : `${data.filtered} events.`}
              </p>
              {data.pageCount > 1 ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.pageCount}
                  </p>
                  {data.page > 1 ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={auditLogHref(data, data.page - 1)}>Previous</Link>
                    </Button>
                  ) : null}
                  {data.page < data.pageCount ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={auditLogHref(data, data.page + 1)}>Next</Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <AuditDetailModal entry={selected} onClose={() => setSelected(null)} />
      <Modal
        open={confirmClear}
        onClose={() => {
          if (!clearing) setConfirmClear(false);
        }}
        title="Delete all activity"
        description="This removes every event from the audit log."
      >
        <ModalBody>
          {clearError ? (
            <p role="alert" className="px-4 pt-4 text-sm text-destructive sm:px-6">
              {clearError}
            </p>
          ) : (
            <p className="px-4 pt-4 text-sm text-muted-foreground sm:px-6">
              The history shown here will be cleared. Invoice records stay as they are.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setConfirmClear(false)} disabled={clearing}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={removeAllActivity} disabled={clearing}>
            {clearing ? "Deleting…" : "Delete all"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
