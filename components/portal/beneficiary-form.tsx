"use client";

import {
  createBeneficiary,
  updateBeneficiary,
} from "@/app/(portal)/beneficiaries/actions";
import { ModalBody, ModalFooter, useModal } from "@/components/portal/modal";
import { useActionToast } from "@/components/portal/toasts";
import {
  emptyBeneficiaryFormState,
  type Beneficiary,
  type BeneficiaryField,
  type BeneficiaryFormState,
} from "@/lib/beneficiary";
import { ChoiceSelect, SuggestField } from "@/components/portal/suggest-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cityOptions,
  composePhone,
  COUNTRIES,
  DIAL_CODES,
  limitNationalPhone,
  phoneDigitBounds,
  phoneDigitHint,
  postalOptions,
  splitStoredPhone,
  stateOptions,
} from "@/lib/settings-places";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

function Field({
  id,
  label,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-3 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function textProps(id: BeneficiaryField, error?: string) {
  return {
    id,
    name: id,
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

export function BeneficiaryForm({
  mode,
  beneficiary,
  onSaved,
}: {
  mode: "create" | "edit";
  beneficiary?: Beneficiary;
  variant: "modal";
  onSaved: (beneficiary: Beneficiary) => void;
}) {
  const modal = useModal();
  const initialPhone = splitStoredPhone(beneficiary?.phone ?? "", beneficiary?.country ?? "India");
  const initialNational = limitNationalPhone(initialPhone.dial, initialPhone.number);
  const [dial, setDial] = useState(initialPhone.dial);
  const [national, setNational] = useState(initialNational);
  const [country, setCountry] = useState(beneficiary?.country ?? "India");
  const [stateName, setStateName] = useState(beneficiary?.state ?? "");
  const [city, setCity] = useState(beneficiary?.city ?? "");
  const [postalCode, setPostalCode] = useState(beneficiary?.postalCode ?? "");
  const action = mode === "create" ? createBeneficiary : updateBeneficiary;
  const [state, formAction, pending] = useActionState<
    BeneficiaryFormState,
    FormData
  >(action, emptyBeneficiaryFormState);
  const errors = state.fieldErrors;
  useActionToast(state, state.error, "error");
  const handled = useRef<BeneficiaryFormState | null>(null);
  const { setBusy, setDirty } = modal;

  useEffect(() => {
    setBusy(pending);
  }, [pending, setBusy]);

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      handled.current = state;
      setDirty(false);
      onSaved(state.saved);
    }
  }, [state, onSaved, setDirty]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      onChange={() => setDirty(true)}
      className="flex min-h-0 flex-auto flex-col"
    >
      {mode === "edit" && beneficiary ? (
        <input type="hidden" name="id" value={beneficiary.id} />
      ) : null}
      <input type="hidden" name="notes" value={beneficiary?.notes ?? ""} />
      <input type="hidden" name="is_active" value={beneficiary?.isActive === false ? "" : "on"} />
      <input type="hidden" name="phone" value={composePhone(dial, national)} />

      <ModalBody>
        <fieldset disabled={pending} className="flex flex-col gap-3 p-4">
          <Section title="Company">
            <Field
              id="legal_name"
              label="Company / legal name"
              required
              error={errors.legal_name}
              className="sm:col-span-2"
            >
              <Input
                {...textProps("legal_name", errors.legal_name)}
                defaultValue={beneficiary?.legalName ?? ""}
                maxLength={200}
                required
                autoComplete="organization"
                data-autofocus
              />
            </Field>
            <Field id="contact_name" label="Client legal name" error={errors.contact_name}>
              <Input
                {...textProps("contact_name", errors.contact_name)}
                defaultValue={beneficiary?.contactName ?? ""}
                maxLength={120}
                autoComplete="name"
              />
            </Field>
            <Field id="email" label="Email" error={errors.email}>
              <Input
                {...textProps("email", errors.email)}
                type="email"
                defaultValue={beneficiary?.email ?? ""}
                maxLength={160}
                autoComplete="email"
              />
            </Field>
            <Field
              id="phone-number"
              label="Mobile number"
              error={errors.phone}
              className="sm:col-span-2"
            >
              <div className="flex gap-2">
                <ChoiceSelect
                  id="phone-code"
                  label="Country code"
                  value={dial}
                  onValue={(next) => {
                    setDial(next);
                    setNational((current) => limitNationalPhone(next, current));
                    setDirty(true);
                  }}
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
                  onChange={(event) => {
                    setNational(limitNationalPhone(dial, event.target.value));
                    setDirty(true);
                  }}
                  inputMode="numeric"
                  maxLength={phoneDigitBounds(dial).max}
                  placeholder={phoneDigitHint(dial)}
                  autoComplete="tel-national"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "phone-number-error" : undefined}
                  className="min-w-0"
                />
              </div>
            </Field>
          </Section>

          <Section title="Tax details">
            <Field id="gstin" label="GSTIN" error={errors.gstin}>
              <Input
                {...textProps("gstin", errors.gstin)}
                defaultValue={beneficiary?.gstin ?? ""}
                maxLength={20}
                spellCheck={false}
                className="uppercase"
                autoComplete="off"
              />
            </Field>
            <Field id="pan" label="PAN" error={errors.pan}>
              <Input
                {...textProps("pan", errors.pan)}
                defaultValue={beneficiary?.pan ?? ""}
                maxLength={12}
                spellCheck={false}
                className="uppercase"
                autoComplete="off"
              />
            </Field>
          </Section>

          <Section title="Billing address">
            <Field id="address_line1" label="Address line 1" error={errors.address_line1}>
              <Input
                {...textProps("address_line1", errors.address_line1)}
                defaultValue={beneficiary?.addressLine1 ?? ""}
                maxLength={200}
                autoComplete="address-line1"
              />
            </Field>
            <Field id="address_line2" label="Address line 2" error={errors.address_line2}>
              <Input
                {...textProps("address_line2", errors.address_line2)}
                defaultValue={beneficiary?.addressLine2 ?? ""}
                maxLength={200}
                autoComplete="address-line2"
              />
            </Field>
            <Field id="state" label="State" error={errors.state}>
              <SuggestField
                id="state"
                name="state"
                label="State"
                value={stateName}
                onValue={(next) => {
                  setStateName(next);
                  setDirty(true);
                }}
                options={stateOptions(country)}
                maxLength={80}
                invalid={Boolean(errors.state)}
                describedBy={errors.state ? "state-error" : undefined}
              />
            </Field>
            <Field id="city" label="City" error={errors.city}>
              <SuggestField
                id="city"
                name="city"
                label="City"
                value={city}
                onValue={(next) => {
                  setCity(next);
                  setDirty(true);
                }}
                options={cityOptions(country, stateName)}
                maxLength={80}
                invalid={Boolean(errors.city)}
                describedBy={errors.city ? "city-error" : undefined}
              />
            </Field>
            <Field id="postal_code" label="Postal code" error={errors.postal_code}>
              <SuggestField
                id="postal_code"
                name="postal_code"
                label="Postal code"
                value={postalCode}
                onValue={(next) => {
                  setPostalCode(next);
                  setDirty(true);
                }}
                options={postalOptions(country, stateName, city)}
                maxLength={12}
                invalid={Boolean(errors.postal_code)}
                describedBy={errors.postal_code ? "postal_code-error" : undefined}
              />
            </Field>
            <Field id="country" label="Country" error={errors.country}>
              <SuggestField
                id="country"
                name="country"
                label="Country"
                value={country}
                onValue={(next) => {
                  setCountry(next);
                  setDirty(true);
                }}
                options={COUNTRIES}
                maxLength={80}
                invalid={Boolean(errors.country)}
                describedBy={errors.country ? "country-error" : undefined}
              />
            </Field>
          </Section>
        </fieldset>
      </ModalBody>

      <ModalFooter className="px-4 py-2.5">
        <Button type="button" variant="outline" disabled={pending} onClick={modal.requestClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Saving…" : mode === "create" ? "Add beneficiary" : "Save changes"}
        </Button>
      </ModalFooter>
    </form>
  );
}
