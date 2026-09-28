"use client";

import {
  createBeneficiary,
  updateBeneficiary,
} from "@/app/(portal)/beneficiaries/actions";
import { ModalBody, ModalFooter, useModal } from "@/components/portal/modal";
import {
  emptyBeneficiaryFormState,
  type Beneficiary,
  type BeneficiaryField,
  type BeneficiaryFormState,
} from "@/lib/beneficiary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
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
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
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
  const action = mode === "create" ? createBeneficiary : updateBeneficiary;
  const [state, formAction, pending] = useActionState<
    BeneficiaryFormState,
    FormData
  >(action, emptyBeneficiaryFormState);
  const errors = state.fieldErrors;
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
      className="flex min-h-0 flex-1 flex-col"
    >
      {mode === "edit" && beneficiary ? (
        <input type="hidden" name="id" value={beneficiary.id} />
      ) : null}

      <ModalBody>
        <fieldset disabled={pending} className="flex flex-col gap-5 p-4 sm:p-6">
          {state.error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </p>
          ) : null}

          <Section title="Company" description="The legal name appears on invoices raised to this beneficiary.">
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
            <Field id="contact_name" label="Contact person" error={errors.contact_name}>
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
            <Field id="phone" label="Phone" error={errors.phone}>
              <Input
                {...textProps("phone", errors.phone)}
                type="tel"
                defaultValue={beneficiary?.phone ?? ""}
                maxLength={30}
                autoComplete="tel"
              />
            </Field>
          </Section>

          <Section title="Tax details" description="PAN must match characters 3–12 of the GSTIN when both are entered.">
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
            <Field
              id="address_line1"
              label="Address line 1"
              error={errors.address_line1}
              className="sm:col-span-2"
            >
              <Input
                {...textProps("address_line1", errors.address_line1)}
                defaultValue={beneficiary?.addressLine1 ?? ""}
                maxLength={200}
                autoComplete="address-line1"
              />
            </Field>
            <Field
              id="address_line2"
              label="Address line 2"
              error={errors.address_line2}
              className="sm:col-span-2"
            >
              <Input
                {...textProps("address_line2", errors.address_line2)}
                defaultValue={beneficiary?.addressLine2 ?? ""}
                maxLength={200}
                autoComplete="address-line2"
              />
            </Field>
            <Field id="city" label="City" error={errors.city}>
              <Input
                {...textProps("city", errors.city)}
                defaultValue={beneficiary?.city ?? ""}
                maxLength={80}
                autoComplete="address-level2"
              />
            </Field>
            <Field id="state" label="State" error={errors.state}>
              <Input
                {...textProps("state", errors.state)}
                defaultValue={beneficiary?.state ?? ""}
                maxLength={80}
                autoComplete="address-level1"
              />
            </Field>
            <Field id="postal_code" label="Postal code" error={errors.postal_code}>
              <Input
                {...textProps("postal_code", errors.postal_code)}
                defaultValue={beneficiary?.postalCode ?? ""}
                maxLength={12}
                autoComplete="postal-code"
              />
            </Field>
            <Field id="country" label="Country" error={errors.country}>
              <Input
                {...textProps("country", errors.country)}
                defaultValue={beneficiary?.country ?? "India"}
                maxLength={80}
                autoComplete="country-name"
              />
            </Field>
          </Section>

          <Section title="Notes and status">
            <Field id="notes" label="Notes" error={errors.notes} className="sm:col-span-2">
              <textarea
                {...textProps("notes", errors.notes)}
                defaultValue={beneficiary?.notes ?? ""}
                maxLength={2000}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={beneficiary?.isActive ?? true}
                className="mt-0.5 size-4 rounded border border-input"
              />
              <span>
                <span className="font-medium">Active</span>
                <span className="mt-1 block text-muted-foreground">
                  Inactive beneficiaries stay on file and can be left out of new work.
                </span>
              </span>
            </label>
          </Section>
        </fieldset>
      </ModalBody>

      <ModalFooter>
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
