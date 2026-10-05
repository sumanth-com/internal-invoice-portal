"use client";

import { fetchBeneficiary, setBeneficiaryStatus } from "@/app/(portal)/beneficiaries/actions";
import { DeleteBeneficiaryDialog } from "@/components/portal/delete-beneficiary-button";
import { IconAction } from "@/components/portal/icon-action";
import { BeneficiaryNotice } from "@/components/portal/beneficiary-notice";
import { useBeneficiarySaved, usePortalModals } from "@/components/portal/portal-modals";
import { Modal, ModalBody, ModalFooter } from "@/components/portal/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  beneficiaryListHref,
  formatBeneficiaryAddress,
  formatBeneficiaryDate,
  type Beneficiary,
  type BeneficiaryListData,
  type BeneficiaryStatusFilter,
  type BeneficiarySummary,
} from "@/lib/beneficiary";
import { requestNotificationRefresh } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, CircleCheck, CircleOff, Eye, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const fieldClass =
  "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-0 text-sm shadow-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

const beneficiaryWaves = {
  total: {
    back: "M0 46C78 46 128 22 206 30C286 38 338 16 400 24V120H0Z",
    front: "M0 74C92 74 146 52 224 58C302 64 348 46 400 52V120H0Z",
    backClass: "fill-sky-100 dark:fill-sky-900",
    frontClass: "fill-sky-200 dark:fill-sky-700",
  },
  active: {
    back: "M0 34C86 34 132 54 210 44C286 34 340 22 400 30V120H0Z",
    front: "M0 64C96 64 150 82 228 70C306 58 352 50 400 56V120H0Z",
    backClass: "fill-violet-100 dark:fill-violet-900",
    frontClass: "fill-violet-200 dark:fill-violet-700",
  },
  inactive: {
    back: "M0 42C72 28 138 24 214 38C292 52 346 36 400 26V120H0Z",
    front: "M0 70C84 56 148 52 226 66C304 80 350 66 400 54V120H0Z",
    backClass: "fill-amber-100 dark:fill-amber-900",
    frontClass: "fill-amber-200 dark:fill-amber-700",
  },
} as const;

function StatCard({
  label,
  value,
  href,
  active,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  active: boolean;
  icon: typeof Users;
  tone: keyof typeof beneficiaryWaves;
}) {
  const wave = beneficiaryWaves[tone];
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[168px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm outline-none transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
      )}
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
    </Link>
  );
}

function display(value: string | null) {
  const text = value?.trim();
  return text || "—";
}

function toSummary(beneficiary: Beneficiary): BeneficiarySummary {
  return {
    id: beneficiary.id,
    legalName: beneficiary.legalName,
    contactName: beneficiary.contactName,
    email: beneficiary.email,
    phone: beneficiary.phone,
    gstin: beneficiary.gstin,
    city: beneficiary.city,
    isActive: beneficiary.isActive,
  };
}

function applySaved(data: BeneficiaryListData, saved: BeneficiarySummary): BeneficiaryListData {
  const previous = data.beneficiaries.find((item) => item.id === saved.id);
  let { total, active, inactive } = data;

  if (!previous) {
    total += 1;
    if (saved.isActive) active += 1;
    else inactive += 1;
  } else if (previous.isActive !== saved.isActive) {
    active += saved.isActive ? 1 : -1;
    inactive += saved.isActive ? -1 : 1;
  }

  const matchesStatus = data.status === "all" || (data.status === "active") === saved.isActive;
  const matchesContact = !data.contact || saved.contactName?.trim() === data.contact;
  const others = data.beneficiaries.filter((item) => item.id !== saved.id);
  const beneficiaries =
    matchesStatus && matchesContact
      ? [...others, saved].sort((left, right) => left.legalName.localeCompare(right.legalName, "en"))
      : others;
  const contactNames =
    saved.contactName?.trim() && !data.contactNames.includes(saved.contactName.trim())
      ? [...data.contactNames, saved.contactName.trim()].sort((left, right) => left.localeCompare(right, "en"))
      : data.contactNames;

  return { ...data, total, active, inactive, beneficiaries, contactNames };
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
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={cn(fieldClass, "pl-3 pr-8")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function BeneficiaryStatusControl({
  beneficiary,
  busy,
  onChange,
}: {
  beneficiary: BeneficiarySummary;
  busy: boolean;
  onChange: (isActive: boolean) => void;
}) {
  const options = [
    { active: true, label: "Active" },
    { active: false, label: "Inactive" },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        aria-label={`Status for ${beneficiary.legalName}`}
        className={cn(
          "inline-flex h-7 w-[8.25rem] items-center justify-between gap-1 rounded-full px-2.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
          beneficiary.isActive ? "bg-emerald-600 text-white" : "bg-slate-500 text-white",
        )}
      >
        <span>{beneficiary.isActive ? "Active" : "Inactive"}</span>
        <ChevronDown className="size-3 shrink-0 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[8.25rem] p-1">
        {options.map((option) => {
          const current = option.active === beneficiary.isActive;
          return (
            <DropdownMenuItem
              key={option.label}
              onSelect={() => onChange(option.active)}
              className={cn(
                "justify-between text-xs font-medium focus:bg-[hsl(262_83%_96%)] focus:text-[hsl(262_47%_28%)]",
                current && "bg-[hsl(262_83%_58%)] text-white focus:bg-[hsl(262_83%_58%)] focus:text-white",
              )}
            >
              {option.label}
              {current ? <Check className="size-3.5" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export function BeneficiaryList({
  data: serverData,
  notice,
  deletableIds,
  isAdmin,
}: {
  data: BeneficiaryListData;
  notice: "created" | "updated" | "deleted" | null;
  deletableIds: string[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { openBeneficiary, notify } = usePortalModals();
  const [source, setSource] = useState(serverData);
  const [data, setData] = useState(serverData);
  const [search, setSearch] = useState(serverData.search);
  const [status, setStatus] = useState<BeneficiaryStatusFilter>(serverData.status);
  const [contact, setContact] = useState(serverData.contact);
  const [deleting, setDeleting] = useState<BeneficiarySummary | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Beneficiary | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const viewRequest = useRef(0);
  const deletable = new Set(deletableIds);

  if (source !== serverData) {
    setSource(serverData);
    setData(serverData);
    setSearch(serverData.search);
    setStatus(serverData.status);
    setContact(serverData.contact);
  }

  useBeneficiarySaved((saved) => {
    setData((current) => applySaved(current, toSummary(saved)));
  });

  const applyStatus = useCallback(
    async (beneficiary: BeneficiarySummary, isActive: boolean) => {
      if (beneficiary.isActive === isActive || busyId === beneficiary.id) return;
      setBusyId(beneficiary.id);
      const result = await setBeneficiaryStatus(beneficiary.id, isActive);
      setBusyId(null);
      if (!result.ok) {
        notify(result.error, "error");
        return;
      }
      const saved = { ...beneficiary, isActive: result.isActive };
      setData((current) => applySaved(current, saved));
      setViewing((current) => (current?.id === beneficiary.id ? { ...current, isActive: result.isActive } : current));
      notify(result.isActive ? "Beneficiary marked as active successfully." : "Beneficiary marked as inactive successfully.");
      requestNotificationRefresh();
    },
    [busyId, notify],
  );

  const filtering = data.search.length > 0 || data.status !== "all" || data.contact.length > 0;
  const emptyPortal = data.total === 0 && !filtering;

  const pushFilters = useCallback(
    (next?: { search?: string; status?: BeneficiaryStatusFilter; contact?: string }) => {
      const href = beneficiaryListHref({
        search: next?.search ?? search,
        status: next?.status ?? status,
        contact: next?.contact ?? contact,
      });
      startTransition(() => router.push(href));
    },
    [search, status, contact, router],
  );

  useEffect(() => {
    const query = search.trim();
    if (query === data.search) return;
    const timer = window.setTimeout(() => pushFilters({ search: query }), 300);
    return () => window.clearTimeout(timer);
  }, [search, data.search, pushFilters]);

  function openEditor(beneficiary: Beneficiary) {
    setViewOpen(false);
    openBeneficiary({ beneficiary });
  }

  async function editBeneficiary(id: string) {
    if (editingId) return;
    setEditingId(id);
    const result = await fetchBeneficiary(id);
    setEditingId(null);
    if (!result.ok) {
      notify(result.error, "error");
      return;
    }
    openEditor(result.beneficiary);
  }

  async function viewBeneficiary(id: string) {
    const request = viewRequest.current + 1;
    viewRequest.current = request;
    setViewing(null);
    setViewError(null);
    setViewOpen(true);
    const result = await fetchBeneficiary(id);
    if (request !== viewRequest.current) return;
    if (!result.ok) {
      setViewError(result.error);
      return;
    }
    setViewing(result.beneficiary);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {notice ? <BeneficiaryNotice notice={notice} /> : null}

      <div className="grid shrink-0 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total beneficiaries"
          value={data.total}
          href={beneficiaryListHref({ search, status: "all", contact })}
          active={status === "all"}
          icon={Users}
          tone="total"
        />
        <StatCard
          label="Active"
          value={data.active}
          href={beneficiaryListHref({ search, status: "active", contact })}
          active={status === "active"}
          icon={CircleCheck}
          tone="active"
        />
        <StatCard
          label="Inactive"
          value={data.inactive}
          href={beneficiaryListHref({ search, status: "inactive", contact })}
          active={status === "inactive"}
          icon={CircleOff}
          tone="inactive"
        />
      </div>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex shrink-0 flex-col gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-semibold">{filtering ? "Matching beneficiaries" : "All beneficiaries"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering
                ? "Beneficiaries matching your search or client legal name."
                : "Active and inactive beneficiary records."}
            </p>
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
                placeholder="Name, contact, email, GSTIN, or PAN"
                aria-label="Search beneficiaries"
                className="h-9 py-0 pl-8 text-sm shadow-sm outline-none ring-0 focus-visible:ring-0"
              />
            </div>
            <FilterSelect
              label="Client legal name"
              value={contact}
              onChange={(value) => {
                setContact(value);
                pushFilters({ contact: value });
              }}
              className="w-52"
            >
              <option value="">Client legal name</option>
              {data.contactNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => {
                const next: BeneficiaryStatusFilter =
                  value === "active" || value === "inactive" ? value : "all";
                setStatus(next);
                pushFilters({ status: next });
              }}
              className="w-40"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </FilterSelect>
          </form>
        </div>

        {data.beneficiaries.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">No beneficiaries found</p>
            {emptyPortal ? (
              <Button type="button" className="mt-4" onClick={() => openBeneficiary()}>
                <Plus />
                Add beneficiary
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[64rem] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-center text-primary-foreground">
                    <th className="border-b border-primary bg-primary px-4 py-3 text-center align-middle font-medium">Company</th>
                    <th className="border-b border-primary bg-primary px-4 py-3 text-center align-middle font-medium">
                      Client legal name
                    </th>
                    <th className="border-b border-primary bg-primary px-4 py-3 text-center align-middle font-medium">Email</th>
                    <th className="border-b border-primary bg-primary px-4 py-3 text-center align-middle font-medium">Phone</th>
                    <th className="border-b border-primary bg-primary px-4 py-3 text-center align-middle font-medium">GSTIN</th>
                    <th className="border-b border-primary bg-primary px-4 py-3 text-center align-middle font-medium">Status</th>
                    <th className="border-b border-primary bg-primary px-4 py-3 text-center align-middle font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.beneficiaries.map((beneficiary) => (
                    <tr key={beneficiary.id} className="hover:bg-muted/40">
                      <td className="border-b px-4 py-3 text-center align-middle font-medium">
                        <button
                          type="button"
                          onClick={() => viewBeneficiary(beneficiary.id)}
                          className="underline-offset-4 hover:underline"
                        >
                          {beneficiary.legalName}
                        </button>
                        {beneficiary.city ? (
                          <p className="mt-1 text-xs font-normal text-muted-foreground">{beneficiary.city}</p>
                        ) : null}
                      </td>
                      <td className="border-b px-4 py-3 text-center align-middle">{display(beneficiary.contactName)}</td>
                      <td className="border-b px-4 py-3 text-center align-middle">{display(beneficiary.email)}</td>
                      <td className="border-b px-4 py-3 whitespace-nowrap text-center align-middle">{display(beneficiary.phone)}</td>
                      <td className="border-b px-4 py-3 whitespace-nowrap text-center align-middle">{display(beneficiary.gstin)}</td>
                      <td className="border-b px-4 py-3 text-center align-middle">
                        <BeneficiaryStatusControl
                          beneficiary={beneficiary}
                          busy={busyId === beneficiary.id}
                          onChange={(isActive) => void applyStatus(beneficiary, isActive)}
                        />
                      </td>
                      <td className="border-b px-4 py-3 text-center align-middle">
                        <div className="flex justify-center gap-1">
                          <IconAction label="View" onClick={() => viewBeneficiary(beneficiary.id)}>
                            <Eye />
                          </IconAction>
                          <IconAction label="Edit" onClick={() => editBeneficiary(beneficiary.id)}>
                            <Pencil />
                          </IconAction>
                          {isAdmin ? (
                            <IconAction
                              label="Delete"
                              onClick={() => setDeleting(beneficiary)}
                              className="hover:text-destructive"
                            >
                              <Trash2 />
                            </IconAction>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="shrink-0 border-t px-4 py-3 text-sm text-muted-foreground">
              {data.truncated
                ? `Showing the first ${data.beneficiaries.length} beneficiaries. Refine the search to see more.`
                : data.beneficiaries.length === 1
                  ? "1 beneficiary."
                  : `${data.beneficiaries.length} beneficiaries.`}
            </p>
          </div>
        )}
      </section>

      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        size="md"
        title={viewing?.legalName ?? "Beneficiary"}
        description={viewing ? undefined : "Loading beneficiary details."}
      >
        <ModalBody>
          <div className="flex flex-col gap-4 p-4">
            {viewError ? (
              <p role="alert" className="text-sm text-destructive">
                {viewError}
              </p>
            ) : !viewing ? (
              <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} className="h-12 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <>
                <Badge variant={viewing.isActive ? "secondary" : "outline"} className="w-fit">
                  {viewing.isActive ? "Active" : "Inactive"}
                </Badge>
                {isAdmin && !deletable.has(viewing.id) ? (
                  <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
                    This beneficiary is used on invoices, so it cannot be deleted. Mark it inactive instead.
                  </p>
                ) : null}
                <dl className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Client legal name">{display(viewing.contactName)}</DetailItem>
                  <DetailItem label="Email">{display(viewing.email)}</DetailItem>
                  <DetailItem label="Phone">{display(viewing.phone)}</DetailItem>
                  <DetailItem label="GSTIN">{display(viewing.gstin)}</DetailItem>
                  <DetailItem label="PAN">{display(viewing.pan)}</DetailItem>
                  <DetailItem label="Billing address">
                    {formatBeneficiaryAddress(viewing).length > 0 ? (
                      <span className="block whitespace-pre-line">{formatBeneficiaryAddress(viewing).join("\n")}</span>
                    ) : (
                      "—"
                    )}
                  </DetailItem>
                  <DetailItem label="Notes">
                    <span className="block whitespace-pre-line">{display(viewing.notes)}</span>
                  </DetailItem>
                  <DetailItem label="Added">{formatBeneficiaryDate(viewing.createdAt)}</DetailItem>
                </dl>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="px-4 py-2.5">
          <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
            Close
          </Button>
          {viewing ? (
            <Button type="button" onClick={() => openEditor(viewing)}>
              <Pencil />
              Edit
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>

      <DeleteBeneficiaryDialog
        id={deleting?.id ?? null}
        name={deleting?.legalName ?? ""}
        open={deleting !== null}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
