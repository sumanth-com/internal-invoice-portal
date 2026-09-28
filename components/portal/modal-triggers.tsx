"use client";

import { useBeneficiarySaved, usePortalModals } from "@/components/portal/portal-modals";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { Beneficiary } from "@/lib/beneficiary";
import { prefetchInvoiceFormOptions } from "@/lib/invoice-options-store";
import { Pencil, Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";

type TriggerProps = Omit<ButtonProps, "onClick" | "asChild"> & { children?: ReactNode };

function useAutoOpen(autoOpen: boolean | undefined, open: () => void) {
  const done = useRef(false);
  useEffect(() => {
    if (!autoOpen || done.current) return;
    done.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    open();
  }, [autoOpen, open]);
}

export function CreateInvoiceButton({ children, ...props }: TriggerProps) {
  const { openCreateInvoice } = usePortalModals();

  return (
    <Button
      type="button"
      {...props}
      onPointerEnter={prefetchInvoiceFormOptions}
      onFocus={prefetchInvoiceFormOptions}
      onClick={openCreateInvoice}
    >
      {children ?? (
        <>
          <Plus />
          Create invoice
        </>
      )}
    </Button>
  );
}

export function AddBeneficiaryButton({ children, ...props }: TriggerProps) {
  const { openBeneficiary } = usePortalModals();

  return (
    <Button type="button" {...props} onClick={() => openBeneficiary()}>
      {children ?? (
        <>
          <UserPlus />
          Add beneficiary
        </>
      )}
    </Button>
  );
}

export function EditBeneficiaryButton({
  beneficiary,
  autoOpen,
  ...props
}: TriggerProps & { beneficiary: Beneficiary; autoOpen?: boolean }) {
  const { openBeneficiary } = usePortalModals();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const latest = useRef(beneficiary);
  useEffect(() => {
    latest.current = beneficiary;
  });

  const open = useRef(() =>
    openBeneficiary({
      beneficiary: latest.current,
      onSaved: () => startTransition(() => router.refresh()),
    }),
  ).current;
  useAutoOpen(autoOpen, open);

  return (
    <Button type="button" variant="outline" {...props} onClick={open}>
      <Pencil />
      Edit
    </Button>
  );
}

export function AutoOpenModal({ kind }: { kind: "invoice" | "beneficiary" }) {
  const { openCreateInvoice, openBeneficiary } = usePortalModals();
  const open = useRef(() =>
    kind === "invoice" ? openCreateInvoice() : openBeneficiary(),
  ).current;
  useAutoOpen(true, open);
  return null;
}

export function RefreshOnBeneficiarySaved() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  useBeneficiarySaved(() => startTransition(() => router.refresh()));
  return null;
}
