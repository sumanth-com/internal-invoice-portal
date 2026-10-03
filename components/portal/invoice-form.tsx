"use client";

import { saveInvoice } from "@/app/(portal)/invoices/actions";
import { ModalBody, ModalFooter, useOptionalModal } from "@/components/portal/modal";
import { createClient } from "@/lib/supabase/client";
import type { Beneficiary } from "@/lib/beneficiary";
import { formatGstRate, stateCodeForParty } from "@/lib/gst";
import {
  composePartyFields,
  emptyInvoiceFormState,
  emptyPartyFields,
  financialYearLabel,
  formatMoney,
  invoiceDateWindow,
  isFinancialYearNumber,
  parsePartyFields,
  partyFieldsFromSource,
  previewTotals,
  roundMoney,
  type BankAccountOption,
  type InvoiceDetail,
  type InvoiceFormState,
  type InvoicePartyFields,
  type InvoicePartyOption,
} from "@/lib/invoice";
import { indiaStateNames } from "@/lib/settings-places";
import { ChoiceSelect } from "@/components/portal/suggest-field";
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
  useMemo,
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

function BankDetails({
  accounts,
  defaultId,
  error,
}: {
  accounts: BankAccountOption[];
  defaultId: string;
  error?: string;
}) {
  const [accountId, setAccountId] = useState(defaultId);
  const account = accounts.find((item) => item.id === accountId) ?? null;

  return (
    <div className="grid gap-3">
      <input type="hidden" name="bank_account_id" value={account?.id ?? ""} />
      {accounts.length > 1 ? (
        <Field id="bank_account_id" label="Bank account" error={error}>
          <ChoiceSelect
            id="bank_account_id"
            label="Bank account"
            value={accountId}
            display="label"
            invalid={Boolean(error)}
            onValue={setAccountId}
            choices={accounts.map((item) => ({
              value: item.id,
              label: `${item.bankName}${item.isActive ? "" : " (inactive)"}`,
            }))}
          />
        </Field>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="bank-account-number" label="Bank account number">
          <Input id="bank-account-number" value={account?.accountNumber ?? ""} readOnly className="bg-muted/40" />
        </Field>
        <Field id="bank-name" label="Bank name">
          <Input id="bank-name" value={account?.bankName ?? ""} readOnly className="bg-muted/40" />
        </Field>
        <Field id="bank-ifsc" label="IFSC code">
          <Input id="bank-ifsc" value={account?.ifscCode ?? ""} readOnly className="uppercase bg-muted/40" />
        </Field>
        <Field id="bank-branch" label="Branch">
          <Input id="bank-branch" value={account?.branch ?? ""} readOnly className="bg-muted/40" />
        </Field>
      </div>
      {accounts.length <= 1 && error ? <p className="text-sm text-destructive">{error}</p> : null}
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

function PartyEditor({
  idPrefix,
  fields,
  onChange,
  error,
}: {
  idPrefix: string;
  fields: InvoicePartyFields;
  onChange: (next: InvoicePartyFields) => void;
  error?: string;
}) {
  function setField(key: keyof InvoicePartyFields, value: string) {
    onChange({ ...fields, [key]: value });
  }

  return (
    <div className="grid gap-3">
      <Field id={`${idPrefix}-company`} label="Company name">
        <Input
          id={`${idPrefix}-company`}
          value={fields.companyName}
          onChange={(event) => setField("companyName", event.target.value)}
          maxLength={200}
        />
      </Field>
      <Field id={`${idPrefix}-address`} label="Address">
        <Input
          id={`${idPrefix}-address`}
          value={fields.address}
          onChange={(event) => setField("address", event.target.value)}
          maxLength={400}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`${idPrefix}-state`} label="State">
          <Input
            id={`${idPrefix}-state`}
            value={fields.state}
            onChange={(event) => setField("state", event.target.value)}
            maxLength={80}
          />
        </Field>
        <Field id={`${idPrefix}-city`} label="City">
          <Input
            id={`${idPrefix}-city`}
            value={fields.city}
            onChange={(event) => setField("city", event.target.value)}
            maxLength={80}
          />
        </Field>
        <Field id={`${idPrefix}-pincode`} label="Pincode">
          <Input
            id={`${idPrefix}-pincode`}
            value={fields.pincode}
            onChange={(event) => setField("pincode", event.target.value)}
            maxLength={12}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${idPrefix}-country`} label="Country">
          <Input
            id={`${idPrefix}-country`}
            value={fields.country}
            onChange={(event) => setField("country", event.target.value)}
            maxLength={80}
          />
        </Field>
        <Field id={`${idPrefix}-gstin`} label="GSTIN">
          <Input
            id={`${idPrefix}-gstin`}
            value={fields.gstin}
            onChange={(event) => setField("gstin", event.target.value.toUpperCase())}
            maxLength={20}
            spellCheck={false}
            className="uppercase"
          />
        </Field>
      </div>
      {error ? (
        <p id={`${idPrefix}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
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
    fromParty: InvoicePartyFields;
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
  const [billToParty, setBillToParty] = useState<InvoicePartyFields>(() =>
    invoice?.billTo ? parsePartyFields(invoice.billTo) : emptyPartyFields,
  );
  const [billFromParty, setBillFromParty] = useState<InvoicePartyFields>(() =>
    invoice?.billFrom ? parsePartyFields(invoice.billFrom) : (defaults.fromParty ?? parsePartyFields(defaults.billFrom)),
  );
  const [gstEnabled, setGstEnabled] = useState(invoice?.gstEnabled ?? defaults.gstEnabled);
  const [gstRate, setGstRate] = useState(
    String(invoice?.gstRate ?? defaults.gstRate),
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(invoice?.placeOfSupply ?? "");
  const [supplyState, setSupplyState] = useState(invoice?.supplyState ?? "");
  const [stateCode, setStateCode] = useState(invoice?.stateCode ?? "");
  const [clientGstin, setClientGstin] = useState(invoice?.clientGstin ?? "");
  const [dealReference, setDealReference] = useState(invoice?.dealReference ?? "");
  const [tdsAmount, setTdsAmount] = useState(invoice ? String(invoice.tdsAmount) : "0");
  const [lines, setLines] = useState<DraftLine[]>(() => linesFromInvoice(invoice));
  const [amountInWords, setAmountInWords] = useState(invoice?.amountInWords ?? "");

  const setBusy = modal?.setBusy;
  const setDirty = modal?.setDirty;

  useEffect(() => {
    setBusy?.(pending);
  }, [pending, setBusy]);

  const dateBounds = invoice ? invoiceDateWindow(invoice.invoiceNumber) : null;
  const numberYear = financialYearLabel(invoice?.invoiceDate ?? today);

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
    {
      tdsAmount: Number(tdsAmount) || 0,
      companyState: defaults.fromParty.state,
      companyGstin: defaults.fromParty.gstin,
      supplyState,
      stateCode,
      placeOfSupply,
    },
  );
  const currency = invoice?.currency ?? defaults.currency;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("amount_in_words", {
        p_amount: totals.balanceDue,
      });
      if (!cancelled && !error && typeof data === "string") {
        setAmountInWords(data);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [totals.balanceDue]);

  function markDirty() {
    setDirty?.(true);
  }

  function applyBeneficiary(source: {
    state?: string | null;
    gstin?: string | null;
    legalName: string;
    tradeName?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    pan?: string | null;
  }) {
    const state = source.state?.trim() ?? "";
    const gstin = source.gstin?.trim().toUpperCase() ?? "";
    setBillToParty(partyFieldsFromSource(source));
    setSupplyState(state);
    setPlaceOfSupply(state);
    setClientGstin(gstin);
    setStateCode(stateCodeForParty({ state, gstin }) ?? "");
  }

  function chooseBeneficiary(nextId: string) {
    setBeneficiaryId(nextId);
    const beneficiary = beneficiaries.find((item) => item.id === nextId);
    if (!beneficiary) {
      setBillToParty(emptyPartyFields);
      setSupplyState("");
      setPlaceOfSupply("");
      setClientGstin("");
      setStateCode("");
      return;
    }
    applyBeneficiary(beneficiary);
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
                  <input type="hidden" name="beneficiary_id" value={beneficiaryId} />
                  <ChoiceSelect
                    id="beneficiary_id"
                    label="Beneficiary"
                    value={beneficiaryId}
                    display="label"
                    invalid={Boolean(errors.beneficiary_id)}
                    onValue={(next) => {
                      markDirty();
                      chooseBeneficiary(next);
                    }}
                    choices={[
                      { value: "", label: "Select a beneficiary" },
                      ...beneficiaries.map((beneficiary) => ({
                        value: beneficiary.id,
                        label: `${beneficiary.legalName}${beneficiary.isActive ? "" : " (inactive)"}`,
                      })),
                    ]}
                    className="min-w-0 flex-1"
                  />
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
                          applyBeneficiary(saved);
                        })
                      }
                    >
                      <UserPlus />
                    </Button>
                  ) : null}
                </div>
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field id="place_of_supply" label="Place of supply" error={errors.place_of_supply}>
                <Input
                  id="place_of_supply"
                  name="place_of_supply"
                  value={placeOfSupply}
                  maxLength={80}
                  onChange={(event) => setPlaceOfSupply(event.target.value)}
                />
              </Field>
              <Field id="supply_state" label="State" error={errors.supply_state}>
                <ChoiceSelect
                  id="supply_state"
                  label="State"
                  value={supplyState}
                  display="label"
                  invalid={Boolean(errors.supply_state)}
                  onValue={(next) => {
                    setSupplyState(next);
                    const fromGstin = stateCodeForParty({ gstin: clientGstin });
                    setStateCode(fromGstin ?? stateCodeForParty({ state: next }) ?? "");
                  }}
                  choices={[
                    { value: "", label: "Select a state" },
                    ...indiaStateNames().map((name) => ({ value: name, label: name })),
                    ...(supplyState && !indiaStateNames().includes(supplyState)
                      ? [{ value: supplyState, label: supplyState }]
                      : []),
                  ]}
                />
                <input type="hidden" name="supply_state" value={supplyState} />
              </Field>
              <Field id="state_code" label="State code" error={errors.state_code}>
                <Input
                  id="state_code"
                  name="state_code"
                  value={stateCode}
                  inputMode="numeric"
                  maxLength={2}
                  className="tabular-nums"
                  onChange={(event) => setStateCode(event.target.value.replace(/\D/g, "").slice(0, 2))}
                />
              </Field>
              <Field id="client_gstin" label="Client GSTIN" error={errors.client_gstin}>
                <Input
                  id="client_gstin"
                  name="client_gstin"
                  value={clientGstin}
                  maxLength={15}
                  spellCheck={false}
                  className="uppercase"
                  onChange={(event) => {
                    const next = event.target.value.toUpperCase();
                    setClientGstin(next);
                    const derived = stateCodeForParty({ gstin: next, state: supplyState });
                    if (derived) setStateCode(derived);
                  }}
                />
              </Field>
              <Field
                id="deal_reference"
                label="Deal / brand reference"
                error={errors.deal_reference}
                className="sm:col-span-2 lg:col-span-4"
              >
                <Input
                  id="deal_reference"
                  name="deal_reference"
                  value={dealReference}
                  maxLength={120}
                  onChange={(event) => setDealReference(event.target.value)}
                />
              </Field>
            </div>
            {!invoice ? (
              <p className="mt-3 text-xs text-muted-foreground">
                New invoice numbers follow the Indian financial year, from 1 April to 31 March.
                {numberYear ? ` This date is in FY ${numberYear}.` : ""} The database assigns the number when this draft is saved.
              </p>
            ) : isFinancialYearNumber(invoice.invoiceNumber) ? (
              <p className="mt-3 text-xs text-muted-foreground">
                This number stays with the draft. The invoice date must stay in financial year {invoice.invoiceNumber.slice(3, 8)}.
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                This invoice keeps its original number. The invoice date must stay in that calendar month.
              </p>
            )}
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Bill to">
              <input type="hidden" name="bill_to" value={composePartyFields(billToParty)} />
              <PartyEditor
                idPrefix="bill_to"
                fields={billToParty}
                onChange={setBillToParty}
                error={errors.bill_to}
              />
            </Section>
            <Section title="Bill from">
              <input type="hidden" name="bill_from" value={composePartyFields(billFromParty)} />
              <PartyEditor
                idPrefix="bill_from"
                fields={billFromParty}
                onChange={setBillFromParty}
                error={errors.bill_from}
              />
              {!defaults.billFrom && mode === "create" ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Company settings are not saved yet, so Bill From starts empty. Enter it before issuing.
                </p>
              ) : null}
            </Section>
          </div>

          <Section
            title="Tax and supply"
            description={
              gstEnabled
                ? totals.intrastate
                  ? `Supply in ${defaults.fromParty.state || "the company state"} uses CGST and SGST.`
                  : `Supply outside ${defaults.fromParty.state || "the company state"} uses IGST.`
                : "GST is off, so CGST, SGST, and IGST stay at zero."
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
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
                    The company state in Settings is compared with the place of supply.
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
          </Section>

          <Section title="Bank details">
            <BankDetails
              accounts={bankAccounts}
              defaultId={
                invoice
                  ? (invoice.bankAccountId ?? "")
                  : (bankAccounts.find((account) => account.isDefault)?.id ?? bankAccounts[0]?.id ?? "")
              }
              error={errors.bank_account_id}
            />
            <input type="hidden" name="payment_terms" value={invoice?.paymentTerms ?? defaults.paymentTerms} />
            <input type="hidden" name="notes" value={invoice?.notes ?? defaults.notes} />
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
              <span>SAC</span>
              <span>Quantity</span>
              <span>Rate</span>
              <span className="text-right">Taxable amount</span>
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
                    label="SAC"
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
                    <span className="text-sm font-medium md:sr-only">Taxable amount</span>
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

        <div className="relative min-w-0 xl:sticky xl:top-4 xl:z-10 xl:self-start sm:xl:top-6">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full hidden h-4 bg-muted/30 xl:block sm:h-6" />
          <Section
            title="GST and totals"
            description="Preview only. The database calculates the saved tax, balance due, and amount in words."
          >
            <Field id="tds_amount" label="TDS" error={errors.tds_amount}>
              <Input
                id="tds_amount"
                name="tds_amount"
                inputMode="decimal"
                value={tdsAmount}
                className="tabular-nums"
                onChange={(event) => setTdsAmount(event.target.value)}
                aria-invalid={Boolean(errors.tds_amount) || undefined}
                aria-describedby={errors.tds_amount ? "tds_amount-error" : undefined}
              />
            </Field>
            <dl className="mt-5 grid gap-2 border-t pt-4 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">CGST @ {formatGstRate(totals.intrastate ? Number(gstRate) / 2 : 0)}%</dt>
                <dd className="tabular-nums">{formatMoney(totals.cgstAmount, currency)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">SGST @ {formatGstRate(totals.intrastate ? Number(gstRate) / 2 : 0)}%</dt>
                <dd className="tabular-nums">{formatMoney(totals.sgstAmount, currency)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">IGST @ {formatGstRate(gstEnabled && !totals.intrastate ? Number(gstRate) : 0)}%</dt>
                <dd className="tabular-nums">{formatMoney(totals.igstAmount, currency)}</dd>
              </div>
              <div className="flex justify-between gap-6 border-t pt-2 font-medium">
                <dt>Invoice total</dt>
                <dd className="tabular-nums">{formatMoney(totals.total, currency)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">TDS</dt>
                <dd className="tabular-nums">{formatMoney(Number(tdsAmount) || 0, currency)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-6 border-t pt-3 text-base font-semibold">
                <dt>Balance due</dt>
                <dd className="tabular-nums">{formatMoney(totals.balanceDue, currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {amountInWords || "Amount in words follows the balance due."}
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
      <input type="hidden" name="company_state" value={defaults.fromParty.state} />
      <input type="hidden" name="company_gstin" value={defaults.fromParty.gstin} />

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
