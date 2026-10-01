"use client";

import { restoreInvoiceSequence, updateInvoiceSequence } from "@/app/(portal)/settings/actions";
import { SettingsNotice, SettingsSection } from "@/components/portal/settings-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { companyUpdatedLabel, emptyNumberingFormState, formatSequenceNumber, parseNextNumber, type InvoiceSequenceRow } from "@/lib/settings";
import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

function SequenceCard({
  row,
  canEdit,
  onSaved,
}: {
  row: InvoiceSequenceRow;
  canEdit: boolean;
  onSaved: (row: InvoiceSequenceRow) => void;
}) {
  const safeNext = Math.max(row.nextNumber, row.floor);
  const [nextNumber, setNextNumber] = useState(String(safeNext));
  const [confirm, setConfirm] = useState(false);
  const parsedNext = parseNextNumber(nextNumber, row.floor);
  const [state, formAction, pending] = useActionState(updateInvoiceSequence, emptyNumberingFormState);
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreInvoiceSequence,
    emptyNumberingFormState,
  );
  const handled = useRef<typeof state | null>(null);
  const handledRestore = useRef<typeof restoreState | null>(null);
  const behind = row.id !== null && row.nextNumber < row.floor;
  const proposedLabel = parsedNext.ok ? formatSequenceNumber(row.period, parsedNext.nextNumber) : null;

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    setConfirm(false);
    setNextNumber(String(Math.max(state.saved.nextNumber, state.saved.floor)));
    onSaved(state.saved);
  }, [state, onSaved]);

  useEffect(() => {
    if (!restoreState.saved || handledRestore.current === restoreState) return;
    handledRestore.current = restoreState;
    onSaved(restoreState.saved);
  }, [restoreState, onSaved]);

  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">{row.periodLabel}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Period {row.period}</p>
        </div>
        <p className="text-sm">
          Next invoice number{" "}
          <span className="font-mono font-medium">
            {row.pending && row.issuedCount > 0
              ? formatSequenceNumber(row.period, row.floor)
              : row.nextInvoiceNumber}
          </span>
        </p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {row.issuedCount === 0
          ? "No invoices have been numbered in this month."
          : `${row.issuedCount} invoice${row.issuedCount === 1 ? "" : "s"} already numbered in this month.`}
        {row.updatedAt ? ` ${companyUpdatedLabel(row.updatedAt)}.` : ""}
      </p>
      {behind ? (
        <p className="mt-3 text-sm text-destructive">
          The counter is behind invoices already issued. Set the next number to at least {row.floor} (
          {formatSequenceNumber(row.period, row.floor)}) before creating another invoice this month.
        </p>
      ) : null}
      {state.error ? <div className="mt-3"><SettingsNotice tone="error">{state.error}</SettingsNotice></div> : null}
      {state.fieldErrors.next_number ? (
        <p className="mt-3 text-sm text-destructive">{state.fieldErrors.next_number}</p>
      ) : null}
      {restoreState.error ? <div className="mt-3"><SettingsNotice tone="error">{restoreState.error}</SettingsNotice></div> : null}
      {state.saved && !state.error ? <div className="mt-3"><SettingsNotice tone="success">Numbering saved.</SettingsNotice></div> : null}
      {restoreState.saved && !restoreState.error ? (
        <div className="mt-3"><SettingsNotice tone="success">Numbering counter restored.</SettingsNotice></div>
      ) : null}
      {canEdit && row.pending && row.issuedCount > 0 ? (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (restorePending) return;
            const formData = new FormData(event.currentTarget);
            startTransition(() => restoreAction(formData));
          }}
        >
          <input type="hidden" name="period" value={row.period} />
          <p className="text-sm text-muted-foreground">
            Invoices in this month already exist, but the counter row is missing. Restoring it keeps the next number at{" "}
            {formatSequenceNumber(row.period, row.floor)} so issued numbers are not reused.
          </p>
          <Button type="submit" className="mt-3 w-full sm:w-auto" disabled={restorePending}>
            {restorePending ? <Loader2 className="animate-spin" /> : null}
            {restorePending ? "Restoring…" : `Restore counter to ${formatSequenceNumber(row.period, row.floor)}`}
          </Button>
        </form>
      ) : null}
      {canEdit && row.pending && row.issuedCount === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          The first invoice dated this month will be {formatSequenceNumber(row.period, 1)}. The counter is created automatically.
        </p>
      ) : null}
      {canEdit && row.id ? (
        confirm ? (
          <form
            className="mt-4 rounded-lg border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              const formData = new FormData(event.currentTarget);
              startTransition(() => formAction(formData));
            }}
          >
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="next_number" value={nextNumber} />
            <p className="text-sm font-medium">
              Set the next invoice number for {row.periodLabel} to {proposedLabel ?? nextNumber}?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Issued numbers stay reserved. The counter cannot move below {row.floor}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" disabled={pending || !proposedLabel}>
                {pending ? "Saving…" : "Update numbering"}
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          </form>
          ) : (
          <div className="mt-4 grid gap-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="grid gap-2 text-sm font-medium">
                Next number
                <Input
                  inputMode="numeric"
                  value={nextNumber}
                  onChange={(event) => {
                    setNextNumber(event.target.value);
                    setConfirm(false);
                  }}
                  className="w-full tabular-nums sm:w-32"
                  min={row.floor}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirm(true)}
                disabled={!parsedNext.ok}
                className="w-full sm:w-auto"
              >
                Save numbering
              </Button>
            </div>
            {!parsedNext.ok ? <p className="text-sm text-destructive">{parsedNext.error}</p> : null}
          </div>
        )
      ) : null}
    </article>
  );
}

export function InvoiceNumberingSection({
  sequences,
  canEdit,
}: {
  sequences: InvoiceSequenceRow[];
  canEdit: boolean;
}) {
  const [rows, setRows] = useState(sequences);

  function onSaved(saved: InvoiceSequenceRow) {
    setRows((current) => {
      const withoutPending = current.filter((row) => row.period !== saved.period);
      return [saved, ...withoutPending].sort((left, right) => right.period.localeCompare(left.period));
    });
  }

  return (
    <SettingsSection
      title="Invoice numbering"
      description="Each month uses YYYYMM plus a sequence that restarts at 01. September 2026 starts at 20260901. October 2026 starts at 20261001. Numbers are assigned when an invoice is created and cannot be reused."
    >
      <div className="grid gap-4">
        {rows.map((row) => (
          <SequenceCard key={row.period} row={row} canEdit={canEdit} onSaved={onSaved} />
        ))}
      </div>
    </SettingsSection>
  );
}
