"use client";

import { saveInvoice } from "@/app/(portal)/invoices/actions";
import { ModalBody, ModalFooter, useOptionalModal } from "@/components/portal/modal";
import { createClient } from "@/lib/supabase/client";
import type { Beneficiary } from "@/lib/beneficiary";
import {
  bankAccountLabel,
  emptyInvoiceFormState,
  formatBeneficiaryBillTo,
  formatMoney,
  periodDateBounds,
  previewTotals,
  roundMoney,
  type BankAccountOption,
  type InvoiceDetail,
  type InvoiceFormState,
  type InvoicePartyOption,
} from "@/lib/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type DraftLine = {
  key: string;
  description: string;
  hsn: string;
  quantity: string;
  rate: string;
};

const textareaClass =
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function Field({
  id,
  label,
  error,
  required,
  className,
  labelClassName,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function bankOptionLabel(account: BankAccountOption) {
  return `${bankAccountLabel(account)}${account.isActive ? "" : " (inactive)"}`;
}

function BankAccountSuggest({
  accounts,
  defaultId,
  invalid,
}: {
  accounts: BankAccountOption[];
  defaultId: string;
  invalid?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = accounts.find((account) => account.id === defaultId);
  const [accountId, setAccountId] = useState(defaultId);
  const [query, setQuery] = useState(initial ? bankOptionLabel(initial) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const needle = query.trim().toLowerCase();
  const matches = (
    needle
      ? accounts.filter((account) => bankOptionLabel(account).toLowerCase().includes(needle))
      : accounts
  ).slice(0, 8);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function choose(account: BankAccountOption) {
    setAccountId(account.id);
    setQuery(bankOptionLabel(account));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name="bank_account_id" value={accountId} />
      <input
        id="bank_account_id"
        value={query}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "bank_account_id-error" : undefined}
        placeholder="Search saved bank accounts"
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setOpen(true);
          const exact = accounts.find((account) => bankOptionLabel(account) === next);
          setAccountId(exact?.id ?? "");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!matches.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => (current + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => (current - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            choose(matches[active] ?? matches[0]);
          }
        }}
        className={selectClass}
      />
      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-card py-1 text-sm shadow-md"
        >
          {matches.map((account, optionIndex) => (
            <li key={account.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={optionIndex === active}
                className={cn(
                  "flex w-full cursor-pointer px-3 py-2 text-left",
                  optionIndex === active ? "bg-muted" : "hover:bg-muted/70",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(account)}
              >
                {bankOptionLabel(account)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function blankLine(key = "line-1"): DraftLine {
  return {
    key,
    description: "",
    hsn: "",
    quantity: "",
    rate: "",
  };
}

function linesFromInvoice(invoice?: InvoiceDetail): DraftLine[] {
  if (!invoice || invoice.items.length === 0) return [blankLine()];
  return invoice.items.map((item) => ({
    key: item.id,
    description: item.description,
    hsn: item.hsn ?? "",
    quantity: String(item.quantity),
    rate: String(item.rate),
  }));
}

export function InvoiceForm({
  mode,
  variant = "page",
  invoice,
  beneficiaries,
  bankAccounts,
  defaults,
  today,
  onAddBeneficiary,
}: {
  mode: "create" | "edit";
  variant?: "page" | "modal";
  invoice?: InvoiceDetail;
  beneficiaries: InvoicePartyOption[];
  bankAccounts: BankAccountOption[];
  defaults: {
    billFrom: string;
    currency: string;
    paymentTerms: string;
    notes: string;
    gstEnabled: boolean;
    gstRate: number;
  };
  today: string;
  onAddBeneficiary?: (onSaved: (beneficiary: Beneficiary) => void) => void;
}) {
  const modal = useOptionalModal();
  const inModal = variant === "modal" && modal !== null;
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(
    saveInvoice,
    emptyInvoiceFormState,
  );
  const errors = state.fieldErrors;
  const [beneficiaryId, setBeneficiaryId] = useState(invoice?.beneficiaryId ?? "");
  const [billTo, setBillTo] = useState(invoice?.billTo ?? "");
  const [gstEnabled, setGstEnabled] = useState(invoice?.gstEnabled ?? defaults.gstEnabled);
  const [gstRate, setGstRate] = useState(
    String(invoice?.gstRate ?? defaults.gstRate),
  );
  const [lines, setLines] = useState<DraftLine[]>(() => linesFromInvoice(invoice));
  const [amountInWords, setAmountInWords] = useState(invoice?.amountInWords ?? "");

  const setBusy = modal?.setBusy;
  const setDirty = modal?.setDirty;

  useEffect(() => {
    setBusy?.(pending);
  }, [pending, setBusy]);

  const dateBounds = invoice
    ? periodDateBounds(invoice.invoiceNumber.slice(0, 6))
    : null;

  const numericLines = useMemo(
    () =>
      lines
        .map((line) => ({
          quantity: Number(line.quantity),
          rate: Number(line.rate),
        }))
        .filter((line) => Number.isFinite(line.quantity) && Number.isFinite(line.rate)),
    [lines],
  );
  const totals = previewTotals(
    numericLines,
    gstEnabled,
    Number.isFinite(Number(gstRate)) ? Number(gstRate) : 0,
  );
  const currency = invoice?.currency ?? defaults.currency;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("amount_in_words", {
        p_amount: totals.total,
      });
      if (!cancelled && !error && typeof data === "string") {
        setAmountInWords(data);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [totals.total]);

  function markDirty() {
    setDirty?.(true);
  }

  function chooseBeneficiary(nextId: string) {
    setBeneficiaryId(nextId);
    const beneficiary = beneficiaries.find((item) => item.id === nextId);
    setBillTo(beneficiary ? formatBeneficiaryBillTo(beneficiary) : "");
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  const itemsPayload = JSON.stringify(
    lines.map((line) => ({
      description: line.description,
      hsn: line.hsn,
      quantity: line.quantity,
      rate: line.rate,
    })),
  );

  const content = (
    <fieldset disabled={pending} className={cn("flex min-w-0 flex-col gap-6", inModal && "p-4 sm:p-6")}>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title="Invoice details">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid content-start gap-2">
                <p className="text-sm font-medium leading-none">Invoice number</p>
                <p
                  className={cn(
                    "flex h-9 items-center rounded-md border border-dashed px-3 text-sm",
                    invoice ? "font-medium tabular-nums" : "text-muted-foreground",
                  )}
                >
                  {invoice ? invoice.invoiceNumber : "Assigned on save"}
                </p>
              </div>
              <Field id="invoice_date" label="Invoice date" required error={errors.invoice_date}>
                <Input
                  id="invoice_date"
                  name="invoice_date"
                  type="date"
                  required
                  defaultValue={invoice?.invoiceDate ?? today}
                  min={dateBounds?.start}
                  max={dateBounds?.end}
                  aria-invalid={Boolean(errors.invoice_date) || undefined}
                  aria-describedby={errors.invoice_date ? "invoice_date-error" : undefined}
                />
              </Field>
              <Field id="due_date" label="Due date" error={errors.due_date}>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  defaultValue={invoice?.dueDate ?? ""}
                  aria-invalid={Boolean(errors.due_date) || undefined}
                  aria-describedby={errors.due_date ? "due_date-error" : undefined}
                />
              </Field>
              <Field
                id="beneficiary_id"
                label="Beneficiary"
                required
                error={errors.beneficiary_id}
              >
                <div className="flex gap-2">
                  <select
                    id="beneficiary_id"
                    name="beneficiary_id"
                    required
                    value={beneficiaryId}
                    onChange={(event) => chooseBeneficiary(event.target.value)}
                    aria-invalid={Boolean(errors.beneficiary_id) || undefined}
                    className={cn(selectClass, "min-w-0")}
                  >
                    <option value="">Select a beneficiary</option>
                    {beneficiaries.map((beneficiary) => (
                      <option key={beneficiary.id} value={beneficiary.id}>
                        {beneficiary.legalName}
                        {beneficiary.isActive ? "" : " (inactive)"}
                      </option>
                    ))}
                  </select>
                  {onAddBeneficiary ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label="Add a new beneficiary"
                      title="Add a new beneficiary"
                      onClick={() =>
                        onAddBeneficiary((saved) => {
                          markDirty();
                          setBeneficiaryId(saved.id);
                          setBillTo(formatBeneficiaryBillTo(saved));
                        })
                      }
                    >
                      <UserPlus />
                    </Button>
                  ) : null}
                </div>
              </Field>
            </div>
            {!invoice ? (
              <p className="mt-3 text-xs text-muted-foreground">
                The number follows the invoice month and is created by the database when this draft is saved.
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                The number stays with this draft, so the invoice date must stay in the same month.
              </p>
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Bill to"
              description="Filled from the selected beneficiary. Saved with the invoice, so later edits to the beneficiary do not change it."
            >
              <Field id="bill_to" label="Bill to" labelClassName="sr-only" error={errors.bill_to}>
                <textarea
                  id="bill_to"
                  name="bill_to"
                  value={billTo}
                  onChange={(event) => setBillTo(event.target.value)}
                  rows={7}
                  maxLength={2000}
                  placeholder="Select a beneficiary to fill this in."
                  className={textareaClass}
                />
              </Field>
            </Section>
            <Section
              title="Bill from"
              description="Filled from company settings and saved with the invoice."
            >
              <Field id="bill_from" label="Bill from" labelClassName="sr-only" error={errors.bill_from}>
                <textarea
                  id="bill_from"
                  name="bill_from"
                  defaultValue={invoice?.billFrom ?? defaults.billFrom}
                  rows={7}
                  maxLength={2000}
                  className={textareaClass}
                />
              </Field>
              {!defaults.billFrom && mode === "create" ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Company settings are not saved yet, so Bill From starts empty. Enter it before issuing.
                </p>
              ) : null}
            </Section>
          </div>

          <Section title="Bank and payment">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="bank_account_id" label="Bank account" error={errors.bank_account_id}>
                <BankAccountSuggest
                  accounts={bankAccounts}
                  defaultId={
                    invoice
                      ? (invoice.bankAccountId ?? "")
                      : (bankAccounts.find((account) => account.isDefault)?.id ?? "")
                  }
                  invalid={Boolean(errors.bank_account_id)}
                />
              </Field>
              <Field id="payment_terms" label="Payment terms" error={errors.payment_terms}>
                <Input
                  id="payment_terms"
                  name="payment_terms"
                  defaultValue={invoice?.paymentTerms ?? defaults.paymentTerms}
                  maxLength={500}
                />
              </Field>
              <Field id="notes" label="Notes" error={errors.notes} className="sm:col-span-2">
                <textarea
                  id="notes"
                  name="notes"
                  defaultValue={invoice?.notes ?? defaults.notes}
                  rows={2}
                  maxLength={2000}
                  className={textareaClass}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Items"
            description="Add at least one line before issuing."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  markDirty();
                  setLines((current) => [...current, blankLine(crypto.randomUUID())]);
                }}
              >
                <Plus />
                Add line
              </Button>
            }
          >
            {errors.items ? (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {errors.items}
              </p>
            ) : null}
            <div
              aria-hidden
              className="hidden gap-3 border-b pb-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_110px_90px_120px_120px_36px]"
            >
              <span>Description</span>
              <span>HSN/SAC</span>
              <span>Quantity</span>
              <span>Rate</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="flex flex-col gap-3 md:mt-3">
              {lines.map((line, index) => (
                <div
                  key={line.key}
                  className="grid grid-cols-2 gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_110px_90px_120px_120px_36px] md:items-start md:rounded-none md:border-0 md:p-0"
                >
                  <Field
                    id={`description-${line.key}`}
                    label="Description"
                    labelClassName="md:sr-only"
                    error={errors[`item-${index}-description`]}
                    className="col-span-2 md:col-span-1"
                  >
                    <Input
                      id={`description-${line.key}`}
                      value={line.description}
                      maxLength={500}
                      placeholder="Service or product"
                      onChange={(event) =>
                        updateLine(line.key, { description: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    id={`hsn-${line.key}`}
                    label="HSN/SAC"
                    labelClassName="md:sr-only"
                    error={errors[`item-${index}-hsn`]}
                    className="col-span-2 md:col-span-1"
                  >
                    <Input
                      id={`hsn-${line.key}`}
                      value={line.hsn}
                      maxLength={20}
                      onChange={(event) => updateLine(line.key, { hsn: event.target.value })}
                    />
                  </Field>
                  <Field
                    id={`quantity-${line.key}`}
                    label="Quantity"
                    labelClassName="md:sr-only"
                    error={errors[`item-${index}-quantity`]}
                  >
                    <Input
                      id={`quantity-${line.key}`}
                      inputMode="decimal"
                      value={line.quantity}
                      className="tabular-nums"
                      onChange={(event) =>
                        updateLine(line.key, { quantity: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    id={`rate-${line.key}`}
                    label="Rate"
                    labelClassName="md:sr-only"
                    error={errors[`item-${index}-rate`]}
                  >
                    <Input
                      id={`rate-${line.key}`}
                      inputMode="decimal"
                      value={line.rate}
                      className="tabular-nums"
                      onChange={(event) => updateLine(line.key, { rate: event.target.value })}
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-2 md:block md:h-9 md:pt-2 md:text-right">
                    <span className="text-sm font-medium md:sr-only">Amount</span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(
                        roundMoney(
                          (Number(line.quantity) || 0) * (Number(line.rate) || 0),
                        ),
                        currency,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove line ${index + 1}`}
                      title="Remove line"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        markDirty();
                        setLines((current) =>
                          current.length === 1
                            ? [blankLine()]
                            : current.filter((item) => item.key !== line.key),
                        );
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="min-w-0 xl:sticky xl:top-0 xl:self-start">
          <Section
            title="GST and totals"
            description="Preview only. The database calculates the saved GST, totals, and amount in words."
          >
            <div className="grid gap-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="gst_enabled"
                  checked={gstEnabled}
                  onChange={(event) => setGstEnabled(event.target.checked)}
                  className="mt-0.5 size-4 rounded border border-input"
                />
                <span>
                  <span className="font-medium">Apply GST</span>
                  <span className="mt-1 block text-muted-foreground">
                    New invoices start from the company GST default.
                  </span>
                </span>
              </label>
              <Field id="gst_rate" label="GST rate (%)" error={errors.gst_rate}>
                <input type="hidden" name="gst_rate" value={gstRate} />
                <Input
                  id="gst_rate"
                  inputMode="decimal"
                  value={gstRate}
                  onChange={(event) => setGstRate(event.target.value)}
                  disabled={!gstEnabled}
                  className="tabular-nums"
                  aria-invalid={Boolean(errors.gst_rate) || undefined}
                  aria-describedby={errors.gst_rate ? "gst_rate-error" : undefined}
                />
              </Field>
            </div>
            <dl className="mt-5 grid gap-2 border-t pt-4 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">GST amount</dt>
                <dd className="tabular-nums">{formatMoney(totals.gstAmount, currency)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-6 border-t pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(totals.total, currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {amountInWords || "Amount in words is calculated by the database."}
            </p>
          </Section>
        </div>
      </div>
    </fieldset>
  );

  const submitLabel = pending ? "Saving…" : "Save draft";
  const submitButton = (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {submitLabel}
    </Button>
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      onChange={markDirty}
      className={cn("flex flex-col", inModal ? "min-h-0 flex-1" : "gap-6")}
    >
      {mode === "edit" && invoice ? <input type="hidden" name="id" value={invoice.id} /> : null}
      <input type="hidden" name="items" value={itemsPayload} />
      <input type="hidden" name="currency" value={currency} />

      {inModal ? (
        <>
          <ModalBody>{content}</ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={modal.requestClose}>
              Cancel
            </Button>
            {submitButton}
          </ModalFooter>
        </>
      ) : (
        <>
          {content}
          <div className="flex flex-wrap gap-2">
            {submitButton}
            <Button asChild variant="outline">
              <Link href={invoice ? `/invoices/${invoice.id}` : "/invoices"}>Cancel</Link>
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
