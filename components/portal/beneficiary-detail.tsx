import { DeleteBeneficiaryButton } from "@/components/portal/delete-beneficiary-button";
import { BeneficiaryNotice } from "@/components/portal/beneficiary-notice";
import { Badge } from "@/components/ui/badge";
import { EditBeneficiaryButton } from "@/components/portal/modal-triggers";
import {
  formatBeneficiaryAddress,
  formatBeneficiaryDate,
  type Beneficiary,
} from "@/lib/beneficiary";
import Link from "next/link";
import type { ReactNode } from "react";

function display(value: string | null) {
  const text = value?.trim();
  return text || "—";
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export function BeneficiaryMissing() {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Beneficiary not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This beneficiary does not exist, or you cannot view it.
      </p>
      <Link href="/beneficiaries" className="mt-4 inline-block text-sm font-medium underline">
        Back to beneficiaries
      </Link>
    </section>
  );
}

export function BeneficiaryDetail({
  beneficiary,
  isAdmin,
  hasInvoices,
  notice,
  autoOpenEdit = false,
}: {
  beneficiary: Beneficiary;
  isAdmin: boolean;
  hasInvoices: boolean;
  notice: "created" | "updated" | "deleted" | null;
  autoOpenEdit?: boolean;
}) {
  const address = formatBeneficiaryAddress(beneficiary);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/beneficiaries" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Beneficiaries
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {beneficiary.legalName}
          </h1>
          <div className="mt-2">
            <Badge variant={beneficiary.isActive ? "secondary" : "outline"}>
              {beneficiary.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <EditBeneficiaryButton
            beneficiary={beneficiary}
            autoOpen={autoOpenEdit}
            variant="default"
          />
          {isAdmin && !hasInvoices ? (
            <DeleteBeneficiaryButton id={beneficiary.id} name={beneficiary.legalName} />
          ) : null}
        </div>
      </div>

      {notice ? <BeneficiaryNotice notice={notice} /> : null}

      {isAdmin && hasInvoices ? (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          This beneficiary is used on invoices, so it cannot be deleted. Mark it inactive instead.
        </p>
      ) : null}

      <section className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <DetailItem label="Client legal name">{display(beneficiary.contactName)}</DetailItem>
          <DetailItem label="Email">{display(beneficiary.email)}</DetailItem>
          <DetailItem label="Phone">{display(beneficiary.phone)}</DetailItem>
          <DetailItem label="GSTIN">{display(beneficiary.gstin)}</DetailItem>
          <DetailItem label="PAN">{display(beneficiary.pan)}</DetailItem>
          <DetailItem label="Billing address">
            {address.length > 0 ? (
              <span className="block whitespace-pre-line">{address.join("\n")}</span>
            ) : (
              "—"
            )}
          </DetailItem>
          <DetailItem label="Notes">
            <span className="block whitespace-pre-line">{display(beneficiary.notes)}</span>
          </DetailItem>
          <DetailItem label="Added">{formatBeneficiaryDate(beneficiary.createdAt)}</DetailItem>
        </dl>
      </section>
    </div>
  );
}
