"use client";

import { deleteBeneficiary } from "@/app/(portal)/beneficiaries/actions";
import { useActionToast } from "@/components/portal/toasts";
import { Button } from "@/components/ui/button";
import type { BeneficiaryMutationState } from "@/lib/beneficiary";
import { cn } from "@/lib/utils";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";

const initialState: BeneficiaryMutationState = { error: null };

export function DeleteBeneficiaryDialog({
  id,
  name,
  open,
  onClose,
}: {
  id: string | null;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(deleteBeneficiary, initialState);
  useActionToast(state, state.error, "error");
  const lock = useRef(false);
  const submittedFor = useRef<string | null>(null);
  const [shown, setShown] = useState(id ? { id, name } : null);
  const [mounted, setMounted] = useState(open && id !== null);
  const [visible, setVisible] = useState(false);

  if (id && shown?.id !== id) setShown({ id, name });
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
          Delete {shown.name}?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This removes the beneficiary permanently. Beneficiaries used on invoices cannot be deleted.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Deleting…" : "Delete beneficiary"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function DeleteBeneficiaryButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <DeleteBeneficiaryDialog id={id} name={name} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
