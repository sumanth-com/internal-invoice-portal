"use client";

import { deleteBeneficiary } from "@/app/(portal)/beneficiaries/actions";
import type { BeneficiaryMutationState } from "@/lib/beneficiary";
import { Button } from "@/components/ui/button";
import { useActionState, useState } from "react";

const initialState: BeneficiaryMutationState = { error: null };

export function DeleteBeneficiaryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteBeneficiary,
    initialState,
  );

  if (!open) {
    return (
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-destructive/30 bg-card p-4 shadow-sm">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-medium">Delete {name}?</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This removes the beneficiary permanently. Beneficiaries used on invoices cannot be deleted.
      </p>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete beneficiary"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
