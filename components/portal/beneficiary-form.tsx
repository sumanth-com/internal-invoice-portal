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
import { uploadBeneficiaryLogo } from "@/lib/beneficiary-logo-client";
import { inspectBeneficiaryLogo } from "@/lib/beneficiary-logo";
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
import { ImagePlus, Loader2 } from "lucide-react";
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
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">{children}</div>
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
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const shownLogo = previewUrl ?? (logoRemoved ? null : beneficiary?.logoUrl ?? null);
  const action = mode === "create" ? createBeneficiary : updateBeneficiary;
  const [state, formAction, pending] = useActionState<
    BeneficiaryFormState,
    FormData
  >(action, emptyBeneficiaryFormState);
  const errors = state.fieldErrors;
  useActionToast(state, state.error, "error");
  const handled = useRef<BeneficiaryFormState | null>(null);
  const { setBusy, setDirty } = modal;

  const saving = pending || uploading;

  useEffect(() => {
    if (pending) setUploading(false);
  }, [pending]);

  useEffect(() => {
    setBusy(saving);
  }, [saving, setBusy]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  async function chooseLogo(next: File | undefined) {
    setLogoError(null);
    if (!next) return;
    const inspected = inspectBeneficiaryLogo(new Uint8Array(await next.arrayBuffer()));
    if ("error" in inspected) {
      setLogoError(inspected.error);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreviewUrl(url);
    setLogoFile(next);
    setLogoRemoved(false);
    setDirty(true);
  }

  function clearLogo() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
    setLogoFile(null);
    setLogoRemoved(true);
    setLogoError(null);
    if (fileRef.current) fileRef.current.value = "";
    setDirty(true);
  }

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
        if (saving) return;
        const formData = new FormData(event.currentTarget);
        const chosen = logoFile;
        void (async () => {
          if (chosen) {
            setUploading(true);
            try {
              formData.set("logo_path", await uploadBeneficiaryLogo(chosen));
            } catch (error) {
              setLogoError(error instanceof Error ? error.message : "The logo could not be uploaded.");
              setUploading(false);
              return;
            }
          } else if (logoRemoved) {
            formData.set("remove_logo", "1");
          }
          startTransition(() => formAction(formData));
        })();
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
        <fieldset disabled={saving} className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-white"
              aria-label={shownLogo ? "Change logo" : "Add logo"}
            >
              {shownLogo ? (
                <img src={shownLogo} alt="" className="size-full object-contain p-1.5" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" />
              )}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-primary"
            >
              {shownLogo ? "Change logo" : "Add logo"}
            </button>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, and other image formats. 4 MB maximum.
            </p>
            {shownLogo ? (
              <button type="button" onClick={clearLogo} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Remove logo
              </button>
            ) : null}
            {logoError ? (
              <p role="alert" className="text-sm text-destructive">
                {logoError}
              </p>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void chooseLogo(event.target.files?.[0])}
            />
          </div>
          <Section title="Company">
            <Field
              id="legal_name"
              label="Company / legal name"
              required
              error={errors.legal_name}
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
        <Button type="button" variant="outline" disabled={saving} onClick={modal.requestClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {saving ? "Saving…" : mode === "create" ? "Add beneficiary" : "Save changes"}
        </Button>
      </ModalFooter>
    </form>
  );
}
