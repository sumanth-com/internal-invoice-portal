"use client";

import {
  cancelInvoice,
  deleteDraftInvoice,
  issueInvoice,
} from "@/app/(portal)/invoices/actions";
import { useActionToast } from "@/components/portal/toasts";
import type { InvoiceMutationState } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Ban, Send, Trash2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";

const initialState: InvoiceMutationState = { error: null };

export function IssueInvoiceButton({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(issueInvoice, initialState);
  useActionToast(state, state.error, "error");

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={disabled || pending}>
        <Send />
        {pending ? "Issuing…" : "Issue invoice"}
      </Button>
    </form>
  );
}

export function CancelInvoiceButton({ id, number }: { id: string; number: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelInvoice, initialState);
  useActionToast(state, state.error, "error");

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Ban />
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

export function DeleteDraftDialog({
  id,
  number,
  open,
  onClose,
}: {
  id: string | null;
  number: string;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(deleteDraftInvoice, initialState);
  useActionToast(state, state.error, "error");
  const lock = useRef(false);
  const submittedFor = useRef<string | null>(null);
  const [shown, setShown] = useState(id ? { id, number } : null);
  const [mounted, setMounted] = useState(open && id !== null);
  const [visible, setVisible] = useState(false);

  if (id && shown?.id !== id) setShown({ id, number });
  if (open && id && !mounted) setMounted(true);

  useEffect(() => {
    if (!pending) lock.current = false;
  }, [pending]);

  useEffect(() => {
    if (open && id) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 160);
    return () => window.clearTimeout(timer);
  }, [open, id]);

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
        <input type="hidden" name="id" value={shown.id} />
        <h2 id={titleId} className="text-base font-semibold">
          Delete draft {shown.number}?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This removes the draft permanently. Issued invoices cannot be deleted.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" disabled={pending} onClick={onClose}>
            Keep draft
          </Button>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Deleting…" : "Delete draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function DeleteDraftButton({ id, number }: { id: string; number: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete draft
      </Button>
      <DeleteDraftDialog id={id} number={number} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
