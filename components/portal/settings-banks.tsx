"use client";

import {
  deleteBankAccount,
  saveBankAccount,
  setBankAccountActive,
} from "@/app/(portal)/settings/actions";
import {
  fieldProps,
  SettingsField,
  SettingsNotice,
  SettingsSection,
} from "@/components/portal/settings-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateInvoiceFormOptions } from "@/lib/invoice-options-store";
import {
  emptyBankFormState,
  emptyBankMutationState,
  sortBankAccounts,
  type SettingsBankAccount,
} from "@/lib/settings";
import { Loader2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

function BankForm({
  account,
  onSaved,
  onCancel,
}: {
  account: SettingsBankAccount | null;
  onSaved: (account: SettingsBankAccount, clearedDefaultId: string | null) => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveBankAccount, emptyBankFormState);
  const handled = useRef<typeof state | null>(null);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (!state.saved || handled.current === state) return;
    handled.current = state;
    onSaved(state.saved, state.clearedDefaultId ?? null);
    invalidateInvoiceFormOptions();
  }, [state, onSaved]);

  return (
    <form
      className="grid gap-4 rounded-lg border bg-muted/30 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      {state.error ? <SettingsNotice tone="error">{state.error}</SettingsNotice> : null}
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <SettingsField id="account_holder_name" label="Account name" required error={errors.account_holder_name}>
          <Input
            {...fieldProps("account_holder_name", errors.account_holder_name)}
            defaultValue={account?.accountHolderName ?? ""}
            maxLength={160}
            required
            autoComplete="organization"
          />
        </SettingsField>
        <SettingsField id="bank_name" label="Bank name" required error={errors.bank_name}>
          <Input
            {...fieldProps("bank_name", errors.bank_name)}
            defaultValue={account?.bankName ?? ""}
            maxLength={120}
            required
          />
        </SettingsField>
        <SettingsField id="account_number" label="Account number" required error={errors.account_number}>
          <Input
            {...fieldProps("account_number", errors.account_number)}
            defaultValue={account?.accountNumber ?? ""}
            maxLength={40}
            required
            className="font-mono"
          />
        </SettingsField>
        <SettingsField id="ifsc_code" label="IFSC" error={errors.ifsc_code}>
          <Input
            {...fieldProps("ifsc_code", errors.ifsc_code)}
            defaultValue={account?.ifscCode ?? ""}
            maxLength={11}
            autoCapitalize="characters"
            className="uppercase"
          />
        </SettingsField>
        <SettingsField id="swift_code" label="SWIFT" error={errors.swift_code}>
          <Input
            {...fieldProps("swift_code", errors.swift_code)}
            defaultValue={account?.swiftCode ?? ""}
            maxLength={11}
            autoCapitalize="characters"
            className="uppercase"
          />
        </SettingsField>
        <SettingsField id="branch" label="Branch" error={errors.branch}>
          <Input {...fieldProps("branch", errors.branch)} defaultValue={account?.branch ?? ""} maxLength={120} />
        </SettingsField>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={account?.isActive ?? true}
            className="mt-0.5 size-4 rounded border border-input"
          />
          <span>Active. Inactive accounts are hidden when creating an invoice.</span>
        </label>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="is_default"
              defaultChecked={account?.isDefault ?? false}
              className="mt-0.5 size-4 rounded border border-input"
            />
            <span>Default account for new invoices.</span>
          </label>
          {errors.is_default ? <p className="mt-2 text-sm text-destructive">{errors.is_default}</p> : null}
        </div>
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Saving…" : account ? "Save bank account" : "Add bank account"}
        </Button>
      </div>
    </form>
  );
}

function AccountCard({
  account,
  canEdit,
  onEdit,
  onChanged,
}: {
  account: SettingsBankAccount;
  canEdit: boolean;
  onEdit: () => void;
  onChanged: (next: SettingsBankAccount[] | ((current: SettingsBankAccount[]) => SettingsBankAccount[])) => void;
}) {
  const [confirm, setConfirm] = useState<"delete" | "deactivate" | null>(null);
  const [activeState, activeAction, activePending] = useActionState(
    setBankAccountActive,
    emptyBankMutationState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteBankAccount,
    emptyBankMutationState,
  );
  const handledActive = useRef<typeof activeState | null>(null);
  const handledDelete = useRef<typeof deleteState | null>(null);
  const pending = activePending || deletePending;

  useEffect(() => {
    if (!activeState.saved || handledActive.current === activeState) return;
    handledActive.current = activeState;
    const saved = activeState.saved;
    onChanged((current) =>
      sortBankAccounts(
        current.map((item) =>
          item.id === saved.id ? { ...saved, invoiceCount: item.invoiceCount } : item,
        ),
      ),
    );
    setConfirm(null);
    invalidateInvoiceFormOptions();
  }, [activeState, onChanged]);

  useEffect(() => {
    if (!deleteState.deletedId || handledDelete.current === deleteState) return;
    handledDelete.current = deleteState;
    const deletedId = deleteState.deletedId;
    onChanged((current) => current.filter((item) => item.id !== deletedId));
    invalidateInvoiceFormOptions();
  }, [deleteState, onChanged]);

  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{account.accountHolderName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{account.bankName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {account.isDefault ? <Badge>Default</Badge> : null}
          {account.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Account number</dt>
          <dd className="mt-1 break-all font-mono">{account.accountNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">IFSC</dt>
          <dd className="mt-1">{account.ifscCode || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">SWIFT</dt>
          <dd className="mt-1">{account.swiftCode || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Branch</dt>
          <dd className="mt-1">{account.branch || "—"}</dd>
        </div>
      </dl>
      {account.invoiceCount > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Used on {account.invoiceCount} invoice{account.invoiceCount === 1 ? "" : "s"}. It can be deactivated, not deleted.
        </p>
      ) : null}
      {activeState.error ? <div className="mt-3"><SettingsNotice tone="error">{activeState.error}</SettingsNotice></div> : null}
      {deleteState.error ? <div className="mt-3"><SettingsNotice tone="error">{deleteState.error}</SettingsNotice></div> : null}
      {canEdit ? (
        <div className="mt-4 flex flex-col gap-2">
          {confirm === "delete" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (pending) return;
                const formData = new FormData(event.currentTarget);
                startTransition(() => deleteAction(formData));
              }}
              className="rounded-lg border border-destructive/30 p-3"
            >
              <input type="hidden" name="id" value={account.id} />
              <p className="text-sm font-medium">Delete this bank account?</p>
              <p className="mt-1 text-sm text-muted-foreground">This cannot be undone.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="submit" variant="destructive" disabled={pending}>
                  {deletePending ? "Deleting…" : "Delete account"}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
          {confirm === "deactivate" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (pending) return;
                const formData = new FormData(event.currentTarget);
                startTransition(() => activeAction(formData));
              }}
              className="rounded-lg border p-3"
            >
              <input type="hidden" name="id" value={account.id} />
              <input type="hidden" name="is_active" value="false" />
              <p className="text-sm font-medium">Deactivate this bank account?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New invoices will not offer it.
                {account.isDefault ? " It will also stop being the default account." : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="submit" disabled={pending}>
                  {activePending ? "Saving…" : "Deactivate"}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
          {confirm === null ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                Edit
              </Button>
              {account.isActive ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirm("deactivate")}>
                  Deactivate
                </Button>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (pending) return;
                    const formData = new FormData(event.currentTarget);
                    startTransition(() => activeAction(formData));
                  }}
                >
                  <input type="hidden" name="id" value={account.id} />
                  <input type="hidden" name="is_active" value="true" />
                  <Button type="submit" variant="outline" size="sm" disabled={pending}>
                    {activePending ? "Saving…" : "Activate"}
                  </Button>
                </form>
              )}
              {account.invoiceCount === 0 ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirm("delete")}>
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function BankAccountsSection({
  banks,
  canEdit,
}: {
  banks: SettingsBankAccount[];
  canEdit: boolean;
}) {
  const [accounts, setAccounts] = useState(banks);
  const [editor, setEditor] = useState<string | "new" | null>(null);

  function saveAccount(saved: SettingsBankAccount, clearedDefaultId: string | null) {
    setAccounts((current) => {
      const exists = current.some((account) => account.id === saved.id);
      const next = exists
        ? current.map((account) =>
            account.id === saved.id ? { ...saved, invoiceCount: account.invoiceCount } : account,
          )
        : [...current, saved];
      return sortBankAccounts(
        next.map((account) =>
          account.id === clearedDefaultId ? { ...account, isDefault: false } : account,
        ),
      );
    });
    setEditor(null);
  }

  return (
    <SettingsSection
      title="Bank accounts"
      description="Receiving accounts that can be printed on an invoice. New invoices select the active default account."
    >
      <div className="grid gap-4">
        {accounts.length === 0 && editor !== "new" ? (
          <p className="text-sm text-muted-foreground">No bank accounts yet.</p>
        ) : null}
        {accounts.map((account) =>
          editor === account.id ? (
            <BankForm
              key={account.id}
              account={account}
              onSaved={saveAccount}
              onCancel={() => setEditor(null)}
            />
          ) : (
            <AccountCard
              key={account.id}
              account={account}
              canEdit={canEdit}
              onEdit={() => setEditor(account.id)}
              onChanged={setAccounts}
            />
          ),
        )}
        {canEdit && editor === "new" ? (
          <BankForm key="new" account={null} onSaved={saveAccount} onCancel={() => setEditor(null)} />
        ) : null}
        {canEdit && editor === null ? (
          <Button type="button" onClick={() => setEditor("new")} className="w-full sm:w-auto">
            Add bank account
          </Button>
        ) : null}
      </div>
    </SettingsSection>
  );
}
