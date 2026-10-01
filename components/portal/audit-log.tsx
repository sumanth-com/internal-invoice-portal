"use client";

import { Modal, ModalBody, ModalFooter } from "@/components/portal/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AUDIT_ACTIONS,
  auditActionLabel,
  auditFiltersActive,
  auditLogHref,
  formatAuditTimestamp,
  type AuditEntry,
  type AuditLogPage,
} from "@/lib/audit";
import { formatInvoiceDate } from "@/lib/invoice";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const selectClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </section>
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
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const filtering = auditFiltersActive(data);
  const filters = {
    search: data.search,
    action: data.action,
    user: data.user,
    from: data.from,
    to: data.to,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Events" value={data.total} />
        <StatCard label="Today" value={data.today} />
        <StatCard label="Invoice Events" value={data.invoiceEvents} />
        <StatCard label="Payment Events" value={data.paymentEvents} />
      </div>

      <section className="min-w-0 rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">{filtering ? "Matching activity" : "All activity"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering
                ? "Activity matching your search and filters."
                : "Newest invoice activity first."}
            </p>
          </div>
          <form action="/audit" className="flex min-w-0 flex-col gap-2">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={data.search}
                placeholder="Invoice, name, or email"
                aria-label="Search activity"
                className="pl-8"
              />
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select name="action" defaultValue={data.action} aria-label="Action" className={selectClass}>
                <option value="all">All actions</option>
                {AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {auditActionLabel(action)}
                  </option>
                ))}
              </select>
              <select name="user" defaultValue={data.user} aria-label="User" className={selectClass}>
                <option value="all">All users</option>
                {data.users.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.name}
                  </option>
                ))}
              </select>
              <Input name="from" type="date" defaultValue={data.from} aria-label="From date" className="min-w-0" />
              <Input name="to" type="date" defaultValue={data.to} aria-label="To date" className="min-w-0" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">
                Search
              </Button>
              {filtering ? (
                <Button asChild variant="outline">
                  <Link href="/audit">Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {data.entries.length === 0 ? (
          <div className="px-4 py-10">
            <p className="text-sm text-muted-foreground">
              {filtering ? "No activity matches this search." : "No activity recorded yet."}
            </p>
            {filtering ? (
              <Link href="/audit" className="mt-2 inline-block text-sm underline">
                Clear search
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="divide-y lg:hidden">
              {data.entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(entry)}
                    className="w-full p-4 text-left hover:bg-accent/40"
                  >
                    <ActionBadge action={entry.action} />
                    <p className="mt-2 text-sm font-medium">{entry.invoiceNumber}</p>
                    <p className="mt-1 text-sm">{entry.actorName}</p>
                    {entry.actorEmail ? (
                      <p className="mt-1 break-all text-xs text-muted-foreground">{entry.actorEmail}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatAuditTimestamp(entry.createdAt)}
                    </p>
                    {entry.summary !== "—" ? (
                      <p className="mt-2 break-words text-sm text-muted-foreground">{entry.summary}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date & time</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAuditTimestamp(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{entry.actorName}</p>
                        {entry.actorEmail && entry.actorEmail !== entry.actorName ? (
                          <p className="mt-1 break-all text-xs text-muted-foreground">{entry.actorEmail}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/invoices/${entry.invoiceId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {entry.invoiceNumber}
                        </Link>
                      </td>
                      <td className="max-w-xs break-words px-4 py-3 text-muted-foreground">
                        {entry.summary}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(entry)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                      <Link href={auditLogHref(filters, data.page - 1)}>Previous</Link>
                    </Button>
                  ) : null}
                  {data.page < data.pageCount ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={auditLogHref(filters, data.page + 1)}>Next</Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <AuditDetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
