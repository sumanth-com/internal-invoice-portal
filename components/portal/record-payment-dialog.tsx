"use client";

import { listPayableInvoices, recordPayment } from "@/app/(portal)/payments/actions";
import { Modal, ModalBody, ModalFooter, useModal } from "@/components/portal/modal";
import { useActionToast } from "@/components/portal/toasts";
import { ChoiceSelect } from "@/components/portal/suggest-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, invoiceToday } from "@/lib/invoice";
import {
  emptyPaymentFormState,
  isPaymentMode,
  PAYMENT_MODES,
  paymentModeLabel,
  type PayableInvoice,
  type PaymentFormState,
  type RecordedPayment,
} from "@/lib/payment";
import { Banknote, Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

function Balance({ invoice }: { invoice: PayableInvoice }) {
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted-foreground">Balance due</dt>
        <dd className="mt-1 font-medium tabular-nums">
          {formatMoney(invoice.amountPaid + invoice.outstanding, invoice.currency)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Already paid</dt>
        <dd className="mt-1 font-medium tabular-nums">
          {formatMoney(invoice.amountPaid, invoice.currency)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Outstanding</dt>
        <dd className="mt-1 font-medium tabular-nums">
          {formatMoney(invoice.outstanding, invoice.currency)}
        </dd>
      </div>
    </dl>
  );
}

function amountAboveOutstanding(amount: string, outstanding: number) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return false;
  return Math.round(value * 100) > Math.round(outstanding * 100);
}

function RecordPaymentForm({
  invoices: provided,
  presetId,
  refreshOnOpen,
  onSaved,
}: {
  invoices: PayableInvoice[];
  presetId?: string;
  refreshOnOpen: boolean;
  onSaved: (saved: RecordedPayment) => void;
}) {
  const modal = useModal();
  const [state, formAction, pending] = useActionState(recordPayment, emptyPaymentFormState);
  const [invoices, setInvoices] = useState(refreshOnOpen ? [] : provided);
  const [loading, setLoading] = useState(refreshOnOpen);
  const [invoiceId, setInvoiceId] = useState(presetId ?? "");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("neft");
  const handled = useRef<PaymentFormState | null>(null);
  const { setBusy, setDirty } = modal;
  const selected = invoices.find((invoice) => invoice.id === invoiceId) ?? null;
  const errors = state.fieldErrors;
  const amountTooHigh = selected ? amountAboveOutstanding(amount, selected.outstanding) : false;
  const amountError = errors.amount
    ? errors.amount
    : amountTooHigh && selected
      ? `Amount cannot exceed the outstanding balance of ${formatMoney(selected.outstanding, selected.currency)}.`
      : null;
  useActionToast(state, state.error, "error");

  useEffect(() => {
    if (!refreshOnOpen) return;
    let cancelled = false;
    listPayableInvoices()
      .then((next) => {
        if (cancelled) return;
        setInvoices(next);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setInvoices([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshOnOpen]);

  useEffect(() => {
    if (presetId) return;
    setInvoiceId((current) =>
      invoices.some((invoice) => invoice.id === current) ? current : (invoices[0]?.id ?? ""),
    );
  }, [invoices, presetId]);

  const selectedOutstanding = selected?.outstanding;
  useEffect(() => {
    setAmount(selected ? selected.outstanding.toFixed(2) : "");
  }, [selected, selectedOutstanding]);

  useEffect(() => {
    setBusy(pending);
  }, [pending, setBusy]);

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      handled.current = state;
      setDirty(false);
      onSaved(state.saved);
    }
  }, [onSaved, setDirty, state]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || !selected || amountTooHigh) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      onChange={() => setDirty(true)}
      className="flex min-h-0 flex-auto flex-col"
    >
      <input type="hidden" name="payment_mode" value={paymentMode} />
      <input type="hidden" name="invoice_id" value={presetId || invoiceId} />
      <ModalBody>
        <fieldset disabled={pending} className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-invoice">Invoice</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading invoices…</p>
            ) : invoices.length === 0 ? (
              <div className="rounded-lg border px-3 py-4">
                <p className="text-sm font-medium">No invoices available for payment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only issued invoices with an outstanding balance can be selected.
                </p>
              </div>
            ) : (
              <ChoiceSelect
                id="payment-invoice"
                label="Invoice"
                value={invoiceId}
                display="label"
                disabled={Boolean(presetId)}
                invalid={Boolean(errors.invoice_id)}
                onValue={(next) => {
                  setInvoiceId(next);
                  setDirty(true);
                }}
                choices={invoices.map((invoice) => ({
                  value: invoice.id,
                  label: invoice.invoiceNumber,
                  lines: [
                    invoice.beneficiaryName,
                    `Balance due: ${formatMoney(invoice.outstanding, invoice.currency)}`,
                  ],
                }))}
              />
            )}
            {errors.invoice_id ? (
              <p id="payment-invoice-error" className="text-sm text-destructive">
                {errors.invoice_id}
              </p>
            ) : null}
          </div>

          {selected ? <Balance invoice={selected} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountError ? "payment-amount-error" : undefined}
                placeholder="0.00"
              />
              {amountError ? (
                <p id="payment-amount-error" className="text-sm text-destructive">
                  {amountError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-date">Payment date</Label>
              <Input
                id="payment-date"
                name="payment_date"
                type="date"
                required
                defaultValue={invoiceToday()}
                aria-invalid={errors.payment_date ? true : undefined}
                aria-describedby={errors.payment_date ? "payment-date-error" : undefined}
              />
              {errors.payment_date ? (
                <p id="payment-date-error" className="text-sm text-destructive">
                  {errors.payment_date}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-mode">Payment mode</Label>
              <ChoiceSelect
                id="payment-mode"
                label="Payment mode"
                value={paymentMode}
                display="label"
                invalid={Boolean(errors.payment_mode)}
                onValue={(next) => {
                  if (isPaymentMode(next)) {
                    setPaymentMode(next);
                    setDirty(true);
                  }
                }}
                choices={PAYMENT_MODES.map((mode) => ({
                  value: mode,
                  label: paymentModeLabel(mode),
                }))}
              />
              {errors.payment_mode ? (
                <p id="payment-mode-error" className="text-sm text-destructive">
                  {errors.payment_mode}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-reference">Reference / UTR</Label>
              <Input
                id="payment-reference"
                name="reference"
                autoComplete="off"
                maxLength={120}
                aria-invalid={errors.reference ? true : undefined}
                aria-describedby={errors.reference ? "payment-reference-error" : undefined}
                placeholder="Optional"
              />
              {errors.reference ? (
                <p id="payment-reference-error" className="text-sm text-destructive">
                  {errors.reference}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>
      </ModalBody>
      <ModalFooter className="px-4 py-2.5">
        <Button type="button" variant="outline" disabled={pending} onClick={modal.requestClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !selected || amountTooHigh}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </ModalFooter>
    </form>
  );
}

export function RecordPaymentDialog({
  invoices,
  presetId,
  onSaved,
  label = "Record payment",
  variant = "default",
  compact = false,
}: {
  invoices: PayableInvoice[];
  presetId?: string;
  onSaved: (saved: RecordedPayment) => void;
  label?: string;
  variant?: "default" | "outline";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);

  return (
    <>
      <Button
        type="button"
        variant={compact ? "ghost" : variant}
        size={compact ? "icon" : "default"}
        className={
          compact
            ? "size-9 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            : undefined
        }
        aria-label={compact ? "Record payment" : undefined}
        onClick={() => {
          setSession((current) => current + 1);
          setOpen(true);
        }}
      >
        {compact ? <Banknote /> : null}
        {compact ? <span className="sr-only">{label}</span> : label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        description="Record a payment the company has already received. This does not collect money online."
        size="md"
        discardMessage="This payment has not been saved."
      >
        <RecordPaymentForm
          key={session}
          invoices={invoices}
          presetId={presetId}
          refreshOnOpen={!presetId}
          onSaved={(saved) => {
            setOpen(false);
            onSaved(saved);
          }}
        />
      </Modal>
    </>
  );
}
