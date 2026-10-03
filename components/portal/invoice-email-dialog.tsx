"use client";

import { fetchBeneficiary } from "@/app/(portal)/beneficiaries/actions";
import { emailInvoice } from "@/app/(portal)/invoices/email-action";
import { Modal, ModalBody, ModalFooter, useModal } from "@/components/portal/modal";
import { usePortalModals } from "@/components/portal/portal-modals";
import { Button } from "@/components/ui/button";
import type { Beneficiary } from "@/lib/beneficiary";
import type { EmailInvoiceState } from "@/lib/email/invoice-email-state";
import { formatMoney } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { Check, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState, useTransition } from "react";

const initialEmailInvoiceState: EmailInvoiceState = {
  error: null,
  fieldErrors: {},
  sent: false,
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function EmailInvoiceForm({
  id,
  number,
  beneficiaryId,
  beneficiaryName,
  beneficiaryEmail,
  total,
  currency,
  onDone,
  onEditBeneficiary,
}: {
  id: string;
  number: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryEmail: string | null;
  total: number;
  currency: string;
  onDone: () => void;
  onEditBeneficiary: (beneficiary: Beneficiary) => void;
}) {
  const modal = useModal();
  const [state, formAction, pending] = useActionState(
    emailInvoice,
    initialEmailInvoiceState,
  );
  const current = state?.fieldErrors ? state : initialEmailInvoiceState;
  const [sent, setSent] = useState(false);
  const recipient = beneficiaryEmail?.trim() || "";
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const { setBusy, setDirty } = modal;

  useEffect(() => {
    setBusy(pending);
  }, [pending, setBusy]);

  useEffect(() => {
    setDirty(false);
  }, [setDirty]);

  useEffect(() => {
    if (current.sent) setSent(true);
  }, [current.sent]);

  if (sent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <div className="flex flex-col items-center px-6 py-14 text-center animate-in fade-in-0 duration-300 motion-reduce:animate-none">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700 animate-in zoom-in-95 duration-300 motion-reduce:animate-none dark:text-emerald-300">
              <Check className="size-7" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">Invoice sent successfully</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {number} was sent to {recipient}.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </ModalFooter>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending || !recipient) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ModalBody>
        <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
          {current.error ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {current.error}
            </p>
          ) : null}
          {!recipient ? (
            <div className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                This beneficiary has no email address, so the invoice cannot be sent.
              </p>
              <button
                type="button"
                className="mt-2 font-medium underline underline-offset-4 disabled:opacity-60"
                disabled={editing || pending}
                onClick={() => {
                  setEditError(null);
                  setEditing(true);
                  void fetchBeneficiary(beneficiaryId)
                    .then((result) => {
                      if (!result.ok) {
                        setEditError(result.error);
                        return;
                      }
                      onEditBeneficiary(result.beneficiary);
                    })
                    .catch(() => {
                      setEditError("This beneficiary could not be loaded.");
                    })
                    .finally(() => setEditing(false));
                }}
              >
                {editing ? "Opening…" : "Edit Beneficiary"}
              </button>
              {editError ? <p className="mt-2 text-destructive">{editError}</p> : null}
            </div>
          ) : null}
          <input type="hidden" name="invoice_id" value={id} />
          <input type="hidden" name="recipient" value={recipient} />
          <dl className="rounded-xl border bg-card px-4">
            <Detail label="Beneficiary" value={beneficiaryName} />
            <Detail label="Invoice number" value={number} />
            <Detail label="Recipient email" value={recipient || "No email on file"} />
            <Detail label="Balance due" value={formatMoney(total, currency)} />
          </dl>
          {current.fieldErrors.recipient ? (
            <p className="mt-3 text-sm text-destructive">{current.fieldErrors.recipient}</p>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={modal.requestClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !recipient}>
          {pending ? <Loader2 className="animate-spin" /> : <Mail />}
          {pending ? "Sending…" : "Confirm & Send"}
        </Button>
      </ModalFooter>
    </form>
  );
}

export function InvoiceEmailButton({
  id,
  number,
  beneficiaryId,
  beneficiaryName,
  beneficiaryEmail,
  total,
  currency,
  compact = false,
}: {
  id: string;
  number: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryEmail: string | null;
  total: number;
  currency: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const { openBeneficiary } = usePortalModals();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(beneficiaryEmail);

  useEffect(() => {
    setEmail(beneficiaryEmail);
  }, [beneficiaryEmail]);

  return (
    <>
      {compact ? (
        <span className="group/tip relative inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            aria-label="Email invoice"
            onClick={() => setOpen(true)}
          >
            <Mail />
            <span className="sr-only">Email invoice</span>
          </Button>
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
            )}
          >
            Email invoice
          </span>
        </span>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <Mail />
          Email Invoice
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Email invoice"
        description="Review the details, then confirm to send the invoice PDF."
      >
        <EmailInvoiceForm
          key={`${id}:${email ?? ""}`}
          id={id}
          number={number}
          beneficiaryId={beneficiaryId}
          beneficiaryName={beneficiaryName}
          beneficiaryEmail={email}
          total={total}
          currency={currency}
          onDone={() => setOpen(false)}
          onEditBeneficiary={(beneficiary) => {
            setOpen(false);
            openBeneficiary({
              beneficiary,
              onSaved: (saved) => {
                setEmail(saved.email);
                startRefresh(() => router.refresh());
              },
            });
          }}
        />
      </Modal>
    </>
  );
}
