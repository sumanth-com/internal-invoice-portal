"use client";

import {
  cancelInvoice,
  deleteDraftInvoice,
  issueInvoice,
} from "@/app/(portal)/invoices/actions";
import type { InvoiceMutationState } from "@/lib/invoice";
import { Button } from "@/components/ui/button";
import { useActionState, useState } from "react";

const initialState: InvoiceMutationState = { error: null };

export function IssueInvoiceButton({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(issueInvoice, initialState);

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={id} />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={disabled || pending}>
        {pending ? "Issuing…" : "Issue invoice"}
      </Button>
    </form>
  );
}

export function CancelInvoiceButton({ id, number }: { id: string; number: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelInvoice, initialState);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Cancel invoice
      </Button>
    );
  }

  return (
    <form action={action} className="rounded-xl border bg-card p-4 shadow-sm">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-medium">Cancel invoice {number}?</p>
      <p className="mt-1 text-sm text-muted-foreground">
        A cancelled invoice cannot be changed.
      </p>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Cancelling…" : "Cancel invoice"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          Keep invoice
        </Button>
      </div>
    </form>
  );
}

export function DeleteDraftButton({ id, number }: { id: string; number: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteDraftInvoice, initialState);

  if (!open) {
    return (
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Delete draft
      </Button>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-destructive/30 bg-card p-4 shadow-sm">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-medium">Delete draft {number}?</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This removes the draft permanently. Issued invoices cannot be deleted.
      </p>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete draft"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          Keep draft
        </Button>
      </div>
    </form>
  );
}
