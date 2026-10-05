"use client";

import { saveDefaultCurrency, saveGstDefaults } from "@/app/(portal)/settings/actions";
import { useActionToast } from "@/components/portal/toasts";
import { usePortalModals } from "@/components/portal/portal-modals";
import {
  fieldProps,
  SettingsField,
  SettingsSection,
} from "@/components/portal/settings-fields";
import { ChoiceSelect } from "@/components/portal/suggest-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateInvoiceFormOptions } from "@/lib/invoice-options-store";
import { emptyCurrencyFormState, emptyGstFormState, type GstDefaults } from "@/lib/settings";
import { currencyChoices, currencyForCountry } from "@/lib/settings-places";
import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

function rateText(rate: number) {
  return Number(rate.toFixed(2)).toString();
}

function CurrencyField({
  currency,
  country,
  exists,
  canEdit,
  onSaved,
}: {
  currency: string;
  country: string;
  exists: boolean;
  canEdit: boolean;
  onSaved: (currency: string) => void;
}) {
  const [value, setValue] = useState(currency);
  const [state, formAction, pending] = useActionState(saveDefaultCurrency, emptyCurrencyFormState);
  const handled = useRef<typeof state | null>(null);
  const countryRef = useRef(country);
  const { notify } = usePortalModals();
  const choices = currencyChoices(country);
  useActionToast(state, state.error, "error");

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    notify("Settings saved successfully.");
    setValue(state.saved);
    onSaved(state.saved);
    invalidateInvoiceFormOptions();
  }, [notify, state, onSaved]);

  useEffect(() => {
    if (countryRef.current === country) return;
    countryRef.current = country;
    const next = currencyForCountry(country);
    setValue(next);
    if (!canEdit || !exists) return;
    const formData = new FormData();
    formData.set("default_currency", next);
    startTransition(() => formAction(formData));
  }, [canEdit, country, exists, formAction]);

  if (!canEdit) {
    return (
      <div>
        <p className="text-xs text-muted-foreground">Currency</p>
        <p className="mt-1 text-sm">{currency || "—"}</p>
      </div>
    );
  }

  function save(next: string) {
    setValue(next);
    if (!exists || pending) return;
    const formData = new FormData();
    formData.set("default_currency", next);
    startTransition(() => formAction(formData));
  }

  return (
    <div>
      <SettingsField id="default_currency" label="Currency" error={state.fieldErrors.default_currency}>
        <ChoiceSelect
          id="default_currency"
          label="Currency"
          value={value}
          onValue={save}
          choices={choices}
          disabled={!exists || pending}
          menuClassName="min-w-56"
        />
      </SettingsField>
    </div>
  );
}

export function GstDefaultsSection({
  defaults,
  currency,
  country,
  exists,
  canEdit,
  onSaved,
  onCurrencySaved,
}: {
  defaults: GstDefaults;
  currency: string;
  country: string;
  exists: boolean;
  canEdit: boolean;
  onSaved: (defaults: GstDefaults) => void;
  onCurrencySaved: (currency: string) => void;
}) {
  const [enabled, setEnabled] = useState(defaults.defaultGstEnabled);
  const [rate, setRate] = useState(rateText(defaults.defaultGstRate));
  const [gstin, setGstin] = useState(defaults.gstin);
  const [pan, setPan] = useState(defaults.pan);
  const [cin, setCin] = useState(defaults.cin);
  const [state, formAction, pending] = useActionState(saveGstDefaults, emptyGstFormState);
  const handled = useRef<typeof state | null>(null);
  const errors = state.fieldErrors;
  const { notify } = usePortalModals();
  useActionToast(state, state.error, "error");

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    notify("Settings saved successfully.");
    setEnabled(state.saved.defaultGstEnabled);
    setRate(rateText(state.saved.defaultGstRate));
    setGstin(state.saved.gstin);
    setCin(state.saved.cin);
    setPan(state.saved.pan);
    onSaved(state.saved);
    invalidateInvoiceFormOptions();
  }, [notify, state, onSaved]);

  return (
    <SettingsSection
      title="GST defaults"
      description="GST rate, currency, GSTIN, PAN, and CIN used when a new invoice is created. The company state decides CGST and SGST for supply in that state, or IGST for every other state. Existing invoices keep the tax amounts already saved on them."
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
            <div className="grid gap-4 sm:grid-cols-2">
            <fieldset disabled={pending} className="contents">
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
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
            <CurrencyField
              currency={currency}
              country={country}
              exists={exists}
              canEdit={canEdit}
              onSaved={onCurrencySaved}
            />
            <fieldset disabled={pending} className="contents">
              <SettingsField id="gstin" label="GSTIN" error={errors.gstin}>
                <Input
                  {...fieldProps("gstin", errors.gstin)}
                  value={gstin}
                  onChange={(event) => setGstin(event.target.value.toUpperCase())}
                  maxLength={15}
                  autoCapitalize="characters"
                  className="uppercase"
                />
              </SettingsField>
              <SettingsField id="pan" label="PAN" error={errors.pan}>
                <Input
                  {...fieldProps("pan", errors.pan)}
                  value={pan}
                  onChange={(event) => setPan(event.target.value.toUpperCase())}
                  maxLength={10}
                  autoCapitalize="characters"
                  className="uppercase"
                />
              </SettingsField>
              <SettingsField id="cin" label="CIN" error={errors.cin}>
                <Input
                  {...fieldProps("cin", errors.cin)}
                  value={cin}
                  onChange={(event) => setCin(event.target.value.toUpperCase())}
                  maxLength={21}
                  autoCapitalize="characters"
                  className="uppercase"
                />
              </SettingsField>
            </fieldset>
            </div>
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
            <div>
              <dt className="text-xs text-muted-foreground">Currency</dt>
              <dd className="mt-1 text-sm">{currency || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">GSTIN</dt>
              <dd className="mt-1 text-sm">{defaults.gstin || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">PAN</dt>
              <dd className="mt-1 text-sm">{defaults.pan || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CIN</dt>
              <dd className="mt-1 text-sm">{defaults.cin || "—"}</dd>
            </div>
          </dl>
        )}
      </div>
    </SettingsSection>
  );
}
