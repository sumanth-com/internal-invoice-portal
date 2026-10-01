"use client";

import { recordPayment } from "@/app/(portal)/payments/actions";
import { Modal, ModalBody, ModalFooter, useModal } from "@/components/portal/modal";
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
        <dt className="text-muted-foreground">Invoice total</dt>
        <dd className="mt-1 font-medium tabular-nums">
          {formatMoney(invoice.total, invoice.currency)}
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

function RecordPaymentForm({
  invoices,
  presetId,
  onSaved,
}: {
  invoices: PayableInvoice[];
  presetId?: string;
  onSaved: (saved: RecordedPayment) => void;
}) {
  const modal = useModal();
  const [state, formAction, pending] = useActionState(recordPayment, emptyPaymentFormState);
  const [invoiceId, setInvoiceId] = useState(presetId ?? invoices[0]?.id ?? "");
  const [paymentMode, setPaymentMode] = useState("neft");
  const handled = useRef<PaymentFormState | null>(null);
  const { setBusy, setDirty } = modal;
  const selected = invoices.find((invoice) => invoice.id === invoiceId) ?? null;
  const errors = state.fieldErrors;

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
        if (pending) return;
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
          {state.error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-invoice">Invoice</Label>
            <ChoiceSelect
              id="payment-invoice"
              label="Invoice"
              value={invoiceId}
              display="label"
              disabled={Boolean(presetId) || invoices.length === 0}
              invalid={Boolean(errors.invoice_id)}
              onValue={(next) => {
                setInvoiceId(next);
                setDirty(true);
              }}
              choices={
                invoices.length === 0
                  ? [{ value: "", label: "No issued invoices" }]
                  : invoices.map((invoice) => ({
                      value: invoice.id,
                      label: `${invoice.invoiceNumber} · ${invoice.beneficiaryName}`,
                    }))
              }
            />
            {errors.invoice_id ? (
              <p id="payment-invoice-error" className="text-sm text-destructive">
                {errors.invoice_id}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only issued invoices with an outstanding balance can be selected.
              </p>
            )}
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
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? "payment-amount-error" : undefined}
                placeholder="0.00"
              />
              {errors.amount ? (
                <p id="payment-amount-error" className="text-sm text-destructive">
                  {errors.amount}
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
        <Button type="submit" disabled={pending || !selected}>
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
        onClick={() => setOpen(true)}
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
          invoices={invoices}
          presetId={presetId}
          onSaved={(saved) => {
            setOpen(false);
            onSaved(saved);
          }}
        />
      </Modal>
    </>
  );
}
