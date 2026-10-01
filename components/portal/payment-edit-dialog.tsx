"use client";

import { deletePayment, updatePayment } from "@/app/(portal)/payments/actions";
import { Modal, ModalBody, ModalFooter, useModal } from "@/components/portal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import {
  emptyPaymentFormState,
  PAYMENT_MODES,
  paymentModeLabel,
  type PaymentDeleteState,
  type PaymentFormState,
  type PaymentRecord,
  type RecordedPayment,
} from "@/lib/payment";
import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";

const emptyDeleteState: PaymentDeleteState = { error: null };

function EditPaymentForm({
  payment,
  onSaved,
}: {
  payment: PaymentRecord;
  onSaved: (saved: RecordedPayment) => void;
}) {
  const modal = useModal();
  const [state, formAction, pending] = useActionState(updatePayment, emptyPaymentFormState);
  const handled = useRef<PaymentFormState | null>(null);
  const lock = useRef(false);
  const { setBusy, setDirty } = modal;
  const errors = state.fieldErrors;

  useEffect(() => {
    setBusy(pending);
    if (!pending) lock.current = false;
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
        if (pending || lock.current) return;
        lock.current = true;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      onChange={() => setDirty(true)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <input type="hidden" name="payment_id" value={payment.id} />
      <input type="hidden" name="invoice_id" value={payment.invoiceId} />
      <ModalBody>
        <fieldset disabled={pending} className="flex flex-col gap-4 p-4 sm:p-6">
          {state.error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-invoice-${payment.id}`}>Invoice</Label>
              <Input id={`edit-invoice-${payment.id}`} value={payment.invoiceNumber} readOnly />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-beneficiary-${payment.id}`}>Beneficiary</Label>
              <Input id={`edit-beneficiary-${payment.id}`} value={payment.beneficiaryName} readOnly />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-amount-${payment.id}`}>Amount</Label>
              <Input
                id={`edit-amount-${payment.id}`}
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                required
                defaultValue={payment.amount.toFixed(2)}
                aria-invalid={errors.amount ? true : undefined}
                aria-describedby={errors.amount ? `edit-amount-error-${payment.id}` : undefined}
              />
              {errors.amount ? (
                <p id={`edit-amount-error-${payment.id}`} className="text-sm text-destructive">
                  {errors.amount}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-date-${payment.id}`}>Payment date</Label>
              <Input
                id={`edit-date-${payment.id}`}
                name="payment_date"
                type="date"
                required
                defaultValue={payment.paymentDate}
                aria-invalid={errors.payment_date ? true : undefined}
                aria-describedby={errors.payment_date ? `edit-date-error-${payment.id}` : undefined}
              />
              {errors.payment_date ? (
                <p id={`edit-date-error-${payment.id}`} className="text-sm text-destructive">
                  {errors.payment_date}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-mode-${payment.id}`}>Payment mode</Label>
              <select
                id={`edit-mode-${payment.id}`}
                name="payment_mode"
                defaultValue={payment.paymentMode}
                aria-invalid={errors.payment_mode ? true : undefined}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none"
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {paymentModeLabel(mode)}
                  </option>
                ))}
              </select>
              {errors.payment_mode ? (
                <p className="text-sm text-destructive">{errors.payment_mode}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-reference-${payment.id}`}>Reference / UTR</Label>
              <Input
                id={`edit-reference-${payment.id}`}
                name="reference"
                autoComplete="off"
                maxLength={120}
                defaultValue={payment.reference ?? ""}
                placeholder="Optional"
                aria-invalid={errors.reference ? true : undefined}
                aria-describedby={errors.reference ? `edit-reference-error-${payment.id}` : undefined}
              />
              {errors.reference ? (
                <p id={`edit-reference-error-${payment.id}`} className="text-sm text-destructive">
                  {errors.reference}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Optional bank reference, UTR, or cheque number.</p>
              )}
            </div>
          </div>
        </fieldset>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={modal.requestClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Saving…" : "Save payment"}
        </Button>
      </ModalFooter>
    </form>
  );
}

export function EditPaymentDialog({
  payment,
  open,
  onClose,
  onSaved,
}: {
  payment: PaymentRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved: (saved: RecordedPayment) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit payment"
      description="Correct the amount, date, mode, or reference. The payment stays on the same invoice."
      discardMessage="This payment has not been saved."
    >
      {payment ? (
        <EditPaymentForm
          key={payment.id}
          payment={payment}
          onSaved={(saved) => {
            onClose();
            onSaved(saved);
          }}
        />
      ) : null}
    </Modal>
  );
}

export function DeletePaymentDialog({
  payment,
  open,
  onClose,
  onDeleted,
}: {
  payment: PaymentRecord | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (saved: RecordedPayment) => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(deletePayment, emptyDeleteState);
  const handled = useRef<PaymentDeleteState | null>(null);
  const lock = useRef(false);
  const submittedFor = useRef<string | null>(null);
  const [shown, setShown] = useState<PaymentRecord | null>(payment);
  const [mounted, setMounted] = useState(open && payment !== null);
  const [visible, setVisible] = useState(false);

  if (payment && shown?.id !== payment.id) setShown(payment);
  if (open && payment && !mounted) setMounted(true);

  useEffect(() => {
    if (!pending) lock.current = false;
  }, [pending]);

  useEffect(() => {
    if (state.deleted && handled.current !== state) {
      handled.current = state;
      onDeleted(state.deleted);
      onClose();
    }
  }, [onClose, onDeleted, state]);

  useEffect(() => {
    if (open && payment) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 160);
    return () => window.clearTimeout(timer);
  }, [open, payment]);

  useEffect(() => {
    if (!mounted || !visible) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, visible, pending, onClose]);

  if (!mounted || !shown) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || lock.current) return;
          lock.current = true;
          submittedFor.current = shown.id;
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
        className={cn(
          "w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg transition duration-150 ease-out",
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <input type="hidden" name="payment_id" value={shown.id} />
        <h2 id={titleId} className="text-base font-semibold">
          Delete this payment?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Remove the {formatMoney(shown.amount, shown.currency)} {paymentModeLabel(shown.paymentMode)} payment on
          invoice {shown.invoiceNumber} for {shown.beneficiaryName}. The invoice balance will update. This cannot be
          undone.
        </p>
        {state.error && submittedFor.current === shown.id ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Deleting…" : "Delete payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
