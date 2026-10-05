"use client";

import { saveCompanySettings } from "@/app/(portal)/settings/actions";
import { useActionToast } from "@/components/portal/toasts";
import { usePortalModals } from "@/components/portal/portal-modals";
import {
  fieldProps,
  SettingsField,
  SettingsSection,
} from "@/components/portal/settings-fields";
import { ChoiceSelect, SuggestField } from "@/components/portal/suggest-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateInvoiceFormOptions } from "@/lib/invoice-options-store";
import {
  companyUpdatedLabel,
  emptyCompanyFormState,
  type CompanyDetails,
  type CompanyProfile,
} from "@/lib/settings";
import {
  cityOptions,
  composePhone,
  COUNTRIES,
  DIAL_CODES,
  postalOptions,
  splitStoredPhone,
  stateOptions,
} from "@/lib/settings-places";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Save } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

function ReadOnlyDetails({ company }: { company: CompanyProfile }) {
  const rows: { label: string; value: string }[] = [
    { label: "Company name", value: company.tradeName || company.legalName },
    { label: "Legal name", value: company.legalName },
    { label: "Website", value: company.website },
    { label: "Address line 1", value: company.addressLine1 },
    { label: "Address line 2", value: company.addressLine2 },
    { label: "State", value: company.state },
    { label: "City", value: company.city },
    { label: "Postal code", value: company.postalCode },
    { label: "Country", value: company.country },
    { label: "Phone", value: company.phone },
    { label: "Email", value: company.email },
  ];

  if (!company.exists) {
    return <p className="text-sm text-muted-foreground">Company details have not been added yet.</p>;
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
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
  const initialPhone = splitStoredPhone(company.phone, company.country);
  const [values, setValues] = useState(company);
  const [dial, setDial] = useState(initialPhone.dial);
  const [national, setNational] = useState(initialPhone.number);
  const [editing, setEditing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(saveCompanySettings, emptyCompanyFormState);
  const handled = useRef<typeof state | null>(null);
  const { notify } = usePortalModals();
  const errors = state.fieldErrors;
  const updated = companyUpdatedLabel(canEdit ? values.updatedAt : company.updatedAt);
  useActionToast(state, state.error, "error");

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    notify("Settings saved successfully.");
    setValues((current) => ({ ...current, ...state.saved, exists: true }));
    const nextPhone = splitStoredPhone(state.saved.phone, state.saved.country);
    setDial(nextPhone.dial);
    setNational(nextPhone.number);
    setEditing(false);
    onSaved(state.saved);
    invalidateInvoiceFormOptions();
  }, [notify, state, onSaved]);

  function setField<Key extends keyof CompanyProfile>(key: Key, value: CompanyProfile[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <SettingsSection
      title="Company details"
      description="Printed as Bill From on new invoices. Existing invoices keep the Bill From already saved on them."
      meta={
        <div className="flex items-center gap-2">
          <span>{updated ?? "Not saved yet"}</span>
          {canEdit ? (
            <Button
              type={editing ? "submit" : "button"}
              form="company-settings"
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer"
              aria-label={
                pending ? "Saving company details" : editing ? "Save company details" : "Edit company details"
              }
              disabled={pending}
              onClick={
                editing
                  ? undefined
                  : () => {
                      setEditing(true);
                      requestAnimationFrame(() => nameRef.current?.focus());
                    }
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : editing ? <Save /> : <Pencil />}
            </Button>
          ) : null}
        </div>
      }
    >
      {canEdit ? (
        <form
          id="company-settings"
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (pending) return;
            const formData = new FormData(event.currentTarget);
            startTransition(() => formAction(formData));
          }}
        >
          <input type="hidden" name="phone" value={composePhone(dial, national)} />
          <fieldset
            inert={!editing || pending ? true : undefined}
            className={cn(
              "grid gap-4 sm:grid-cols-2",
              !editing && "cursor-default [&_button]:cursor-default [&_input]:cursor-default",
            )}
          >
            <SettingsField id="trade_name" label="Company name" error={errors.trade_name}>
              <Input
                ref={nameRef}
                {...fieldProps("trade_name", errors.trade_name)}
                value={values.tradeName}
                onChange={(event) => setField("tradeName", event.target.value)}
                maxLength={200}
                autoComplete="organization"
              />
            </SettingsField>
            <SettingsField id="legal_name" label="Legal name" required error={errors.legal_name}>
              <Input
                {...fieldProps("legal_name", errors.legal_name)}
                value={values.legalName}
                onChange={(event) => setField("legalName", event.target.value)}
                maxLength={200}
                required
                autoComplete="organization"
              />
            </SettingsField>
            <SettingsField id="website" label="Website" error={errors.website}>
              <Input
                {...fieldProps("website", errors.website)}
                value={values.website}
                onChange={(event) => setField("website", event.target.value)}
                maxLength={200}
                autoComplete="url"
                placeholder="https://"
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
            <SettingsField id="state" label="State" error={errors.state}>
              <SuggestField
                id="state"
                name="state"
                label="State"
                value={values.state}
                onValue={(next) => setField("state", next)}
                options={stateOptions(values.country)}
                maxLength={80}
                invalid={Boolean(errors.state)}
                describedBy={errors.state ? "state-error" : undefined}
              />
            </SettingsField>
            <SettingsField id="city" label="City" error={errors.city}>
              <SuggestField
                id="city"
                name="city"
                label="City"
                value={values.city}
                onValue={(next) => setField("city", next)}
                options={cityOptions(values.country, values.state)}
                maxLength={80}
                invalid={Boolean(errors.city)}
                describedBy={errors.city ? "city-error" : undefined}
              />
            </SettingsField>
            <SettingsField id="postal_code" label="Postal code" error={errors.postal_code}>
              <SuggestField
                id="postal_code"
                name="postal_code"
                label="Postal code"
                value={values.postalCode}
                onValue={(next) => setField("postalCode", next)}
                options={postalOptions(values.country, values.state, values.city)}
                maxLength={12}
                invalid={Boolean(errors.postal_code)}
                describedBy={errors.postal_code ? "postal_code-error" : undefined}
              />
            </SettingsField>
            <SettingsField id="country" label="Country" error={errors.country}>
              <SuggestField
                id="country"
                name="country"
                label="Country"
                value={values.country}
                onValue={(next) => setField("country", next)}
                options={COUNTRIES}
                maxLength={80}
                invalid={Boolean(errors.country)}
                describedBy={errors.country ? "country-error" : undefined}
              />
            </SettingsField>
            <SettingsField id="phone-number" label="Phone" error={errors.phone}>
              <div className="flex gap-2">
                <ChoiceSelect
                  id="phone-code"
                  label="Country code"
                  value={dial}
                  onValue={setDial}
                  choices={DIAL_CODES.map((item) => ({
                    value: item.code,
                    label: item.country,
                  }))}
                  className="w-[5.5rem] shrink-0"
                  menuClassName="min-w-64"
                />
                <Input
                  id="phone-number"
                  value={national}
                  onChange={(event) => setNational(event.target.value)}
                  maxLength={24}
                  autoComplete="tel-national"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "phone-number-error" : undefined}
                  className="min-w-0"
                />
              </div>
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
          </fieldset>
        </form>
      ) : (
        <ReadOnlyDetails company={company} />
      )}
    </SettingsSection>
  );
}
