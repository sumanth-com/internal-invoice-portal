"use client";

import { saveGstDefaults } from "@/app/(portal)/settings/actions";
import {
  fieldProps,
  SettingsField,
  SettingsNotice,
  SettingsSection,
} from "@/components/portal/settings-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateInvoiceFormOptions } from "@/lib/invoice-options-store";
import { emptyGstFormState, type GstDefaults } from "@/lib/settings";
import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

function rateText(rate: number) {
  return Number(rate.toFixed(2)).toString();
}

export function GstDefaultsSection({
  defaults,
  exists,
  canEdit,
  onSaved,
}: {
  defaults: GstDefaults;
  exists: boolean;
  canEdit: boolean;
  onSaved: (defaults: GstDefaults) => void;
}) {
  const [enabled, setEnabled] = useState(defaults.defaultGstEnabled);
  const [rate, setRate] = useState(rateText(defaults.defaultGstRate));
  const [state, formAction, pending] = useActionState(saveGstDefaults, emptyGstFormState);
  const handled = useRef<typeof state | null>(null);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    setEnabled(state.saved.defaultGstEnabled);
    setRate(rateText(state.saved.defaultGstRate));
    onSaved(state.saved);
    invalidateInvoiceFormOptions();
  }, [state, onSaved]);

  return (
    <SettingsSection
      title="GST defaults"
      description="Applied only when a new invoice is created. Existing invoices keep their own GST settings."
    >
      <div className="grid gap-4">
        {!exists ? (
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? "Save company details first. Until then, new invoices use GST at 18%."
              : "GST defaults have not been saved. New invoices use GST at 18%."}
          </p>
        ) : null}
        {canEdit && exists ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              const formData = new FormData(event.currentTarget);
              startTransition(() => formAction(formData));
            }}
          >
            {state.error ? <SettingsNotice tone="error">{state.error}</SettingsNotice> : null}
            {state.saved && !state.error ? (
              <SettingsNotice tone="success">GST defaults saved. They apply to new invoices only.</SettingsNotice>
            ) : null}
            <fieldset disabled={pending} className="grid gap-4 sm:max-w-sm">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="default_gst_enabled"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  className="mt-0.5 size-4 rounded border border-input"
                />
                <span>
                  <span className="font-medium">GST enabled for new invoices</span>
                  <span className="mt-1 block text-muted-foreground">
                    The default rate is 18%. You can use any rate from 0 to 100.
                  </span>
                </span>
              </label>
              <SettingsField id="default_gst_rate" label="Default GST rate (%)" error={errors.default_gst_rate}>
                <Input
                  {...fieldProps("default_gst_rate", errors.default_gst_rate)}
                  inputMode="decimal"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  className="tabular-nums"
                />
              </SettingsField>
            </fieldset>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Saving…" : "Save GST defaults"}
            </Button>
          </form>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">GST for new invoices</dt>
              <dd className="mt-1 text-sm">{defaults.defaultGstEnabled ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Default rate</dt>
              <dd className="mt-1 text-sm tabular-nums">{rateText(defaults.defaultGstRate)}%</dd>
            </div>
          </dl>
        )}
      </div>
    </SettingsSection>
  );
}
