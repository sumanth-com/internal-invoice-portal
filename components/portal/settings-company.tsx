"use client";

import { saveCompanySettings } from "@/app/(portal)/settings/actions";
import {
  fieldProps,
  SettingsField,
  SettingsNotice,
  SettingsSection,
  settingsTextareaClass,
} from "@/components/portal/settings-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateInvoiceFormOptions } from "@/lib/invoice-options-store";
import {
  companyUpdatedLabel,
  emptyCompanyFormState,
  type CompanyDetails,
  type CompanyProfile,
} from "@/lib/settings";
import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

function ReadOnlyDetails({ company }: { company: CompanyProfile }) {
  const rows: { label: string; value: string }[] = [
    { label: "Company name", value: company.legalName },
    { label: "Trade name", value: company.tradeName },
    { label: "Address line 1", value: company.addressLine1 },
    { label: "Address line 2", value: company.addressLine2 },
    { label: "City", value: company.city },
    { label: "State", value: company.state },
    { label: "Postal code", value: company.postalCode },
    { label: "Country", value: company.country },
    { label: "Phone", value: company.phone },
    { label: "Email", value: company.email },
    { label: "Website", value: company.website },
    { label: "GSTIN", value: company.gstin },
    { label: "PAN", value: company.pan },
    { label: "Currency", value: company.defaultCurrency },
    { label: "Payment terms", value: company.defaultPaymentTerms },
    { label: "Invoice notes", value: company.invoiceNotes },
  ];

  if (!company.exists) {
    return <p className="text-sm text-muted-foreground">Company details have not been added yet.</p>;
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className={row.label === "Payment terms" || row.label === "Invoice notes" ? "sm:col-span-2" : undefined}>
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CompanySettingsSection({
  company,
  canEdit,
  onSaved,
}: {
  company: CompanyProfile;
  canEdit: boolean;
  onSaved: (details: CompanyDetails) => void;
}) {
  const [values, setValues] = useState(company);
  const [state, formAction, pending] = useActionState(saveCompanySettings, emptyCompanyFormState);
  const handled = useRef<typeof state | null>(null);
  const errors = state.fieldErrors;
  const updated = companyUpdatedLabel(values.updatedAt);

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    setValues((current) => ({ ...current, ...state.saved, exists: true }));
    onSaved(state.saved);
    invalidateInvoiceFormOptions();
  }, [state, onSaved]);

  function setField<Key extends keyof CompanyProfile>(key: Key, value: CompanyProfile[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <SettingsSection
      title="Company details"
      description="Printed as Bill From on new invoices. Existing invoices keep the Bill From already saved on them."
    >
      {canEdit ? (
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
            <SettingsNotice tone="success">Company details saved.</SettingsNotice>
          ) : null}
          <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
            <SettingsField id="legal_name" label="Company name" required error={errors.legal_name} className="sm:col-span-2">
              <Input
                {...fieldProps("legal_name", errors.legal_name)}
                value={values.legalName}
                onChange={(event) => setField("legalName", event.target.value)}
                maxLength={200}
                required
                autoComplete="organization"
              />
            </SettingsField>
            <SettingsField id="trade_name" label="Trade name" error={errors.trade_name} className="sm:col-span-2">
              <Input
                {...fieldProps("trade_name", errors.trade_name)}
                value={values.tradeName}
                onChange={(event) => setField("tradeName", event.target.value)}
                maxLength={200}
              />
            </SettingsField>
            <SettingsField id="address_line1" label="Address line 1" error={errors.address_line1}>
              <Input
                {...fieldProps("address_line1", errors.address_line1)}
                value={values.addressLine1}
                onChange={(event) => setField("addressLine1", event.target.value)}
                maxLength={200}
                autoComplete="address-line1"
              />
            </SettingsField>
            <SettingsField id="address_line2" label="Address line 2" error={errors.address_line2}>
              <Input
                {...fieldProps("address_line2", errors.address_line2)}
                value={values.addressLine2}
                onChange={(event) => setField("addressLine2", event.target.value)}
                maxLength={200}
                autoComplete="address-line2"
              />
            </SettingsField>
            <SettingsField id="city" label="City" error={errors.city}>
              <Input
                {...fieldProps("city", errors.city)}
                value={values.city}
                onChange={(event) => setField("city", event.target.value)}
                maxLength={80}
                autoComplete="address-level2"
              />
            </SettingsField>
            <SettingsField id="state" label="State" error={errors.state}>
              <Input
                {...fieldProps("state", errors.state)}
                value={values.state}
                onChange={(event) => setField("state", event.target.value)}
                maxLength={80}
                autoComplete="address-level1"
              />
            </SettingsField>
            <SettingsField id="postal_code" label="Postal code" error={errors.postal_code}>
              <Input
                {...fieldProps("postal_code", errors.postal_code)}
                value={values.postalCode}
                onChange={(event) => setField("postalCode", event.target.value)}
                maxLength={12}
                autoComplete="postal-code"
              />
            </SettingsField>
            <SettingsField id="country" label="Country" error={errors.country}>
              <Input
                {...fieldProps("country", errors.country)}
                value={values.country}
                onChange={(event) => setField("country", event.target.value)}
                maxLength={80}
                autoComplete="country-name"
              />
            </SettingsField>
            <SettingsField id="phone" label="Phone" error={errors.phone}>
              <Input
                {...fieldProps("phone", errors.phone)}
                value={values.phone}
                onChange={(event) => setField("phone", event.target.value)}
                maxLength={30}
                autoComplete="tel"
              />
            </SettingsField>
            <SettingsField id="email" label="Email" error={errors.email}>
              <Input
                {...fieldProps("email", errors.email)}
                type="email"
                value={values.email}
                onChange={(event) => setField("email", event.target.value)}
                maxLength={160}
                autoComplete="email"
              />
            </SettingsField>
            <SettingsField id="website" label="Website" error={errors.website} className="sm:col-span-2">
              <Input
                {...fieldProps("website", errors.website)}
                value={values.website}
                onChange={(event) => setField("website", event.target.value)}
                maxLength={200}
                autoComplete="url"
                placeholder="https://"
              />
            </SettingsField>
            <SettingsField id="gstin" label="GSTIN" error={errors.gstin}>
              <Input
                {...fieldProps("gstin", errors.gstin)}
                value={values.gstin}
                onChange={(event) => setField("gstin", event.target.value.toUpperCase())}
                maxLength={15}
                autoCapitalize="characters"
              />
            </SettingsField>
            <SettingsField id="pan" label="PAN" error={errors.pan}>
              <Input
                {...fieldProps("pan", errors.pan)}
                value={values.pan}
                onChange={(event) => setField("pan", event.target.value.toUpperCase())}
                maxLength={10}
                autoCapitalize="characters"
              />
            </SettingsField>
            <SettingsField id="default_currency" label="Currency" error={errors.default_currency}>
              <Input
                {...fieldProps("default_currency", errors.default_currency)}
                value={values.defaultCurrency}
                onChange={(event) => setField("defaultCurrency", event.target.value.toUpperCase())}
                maxLength={3}
                className="uppercase"
              />
            </SettingsField>
            <SettingsField
              id="default_payment_terms"
              label="Default payment terms"
              error={errors.default_payment_terms}
              className="sm:col-span-2"
            >
              <textarea
                {...fieldProps("default_payment_terms", errors.default_payment_terms)}
                value={values.defaultPaymentTerms}
                onChange={(event) => setField("defaultPaymentTerms", event.target.value)}
                maxLength={2000}
                rows={3}
                className={settingsTextareaClass}
              />
            </SettingsField>
            <SettingsField id="invoice_notes" label="Default invoice notes" error={errors.invoice_notes} className="sm:col-span-2">
              <textarea
                {...fieldProps("invoice_notes", errors.invoice_notes)}
                value={values.invoiceNotes}
                onChange={(event) => setField("invoiceNotes", event.target.value)}
                maxLength={2000}
                rows={3}
                className={settingsTextareaClass}
              />
            </SettingsField>
          </fieldset>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{updated ?? "Not saved yet"}</p>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Saving…" : "Save company details"}
            </Button>
          </div>
        </form>
      ) : (
        <ReadOnlyDetails company={company} />
      )}
    </SettingsSection>
  );
}
