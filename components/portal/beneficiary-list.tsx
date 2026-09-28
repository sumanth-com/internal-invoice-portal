"use client";

import type { Beneficiary, BeneficiaryListData, BeneficiarySummary } from "@/lib/beneficiary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BeneficiaryNotice } from "@/components/portal/beneficiary-notice";
import { useBeneficiarySaved, usePortalModals } from "@/components/portal/portal-modals";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </section>
  );
}

function display(value: string | null) {
  const text = value?.trim();
  return text || "—";
}

function emptyCopy(data: BeneficiaryListData) {
  if (data.search && data.status === "active") {
    return `No active beneficiaries match “${data.search}”.`;
  }
  if (data.search && data.status === "inactive") {
    return `No inactive beneficiaries match “${data.search}”.`;
  }
  if (data.search) return `No beneficiaries match “${data.search}”.`;
  if (data.status === "active") return "No active beneficiaries.";
  if (data.status === "inactive") return "No inactive beneficiaries.";
  return "No beneficiaries yet.";
}

function toSummary(beneficiary: Beneficiary): BeneficiarySummary {
  return {
    id: beneficiary.id,
    legalName: beneficiary.legalName,
    contactName: beneficiary.contactName,
    email: beneficiary.email,
    phone: beneficiary.phone,
    gstin: beneficiary.gstin,
    city: beneficiary.city,
    isActive: beneficiary.isActive,
  };
}

function applySaved(data: BeneficiaryListData, saved: BeneficiarySummary): BeneficiaryListData {
  const previous = data.beneficiaries.find((item) => item.id === saved.id);
  let { total, active, inactive } = data;

  if (!previous) {
    total += 1;
    if (saved.isActive) active += 1;
    else inactive += 1;
  } else if (previous.isActive !== saved.isActive) {
    active += saved.isActive ? 1 : -1;
    inactive += saved.isActive ? -1 : 1;
  }

  const matchesStatus =
    data.status === "all" || (data.status === "active") === saved.isActive;
  const others = data.beneficiaries.filter((item) => item.id !== saved.id);
  const beneficiaries = matchesStatus
    ? [...others, saved].sort((left, right) => left.legalName.localeCompare(right.legalName, "en"))
    : others;

  return { ...data, total, active, inactive, beneficiaries };
}

export function BeneficiaryList({
  data: serverData,
  notice,
}: {
  data: BeneficiaryListData;
  notice: "created" | "updated" | "deleted" | null;
}) {
  const { openBeneficiary } = usePortalModals();
  const [source, setSource] = useState(serverData);
  const [data, setData] = useState(serverData);

  if (source !== serverData) {
    setSource(serverData);
    setData(serverData);
  }

  useBeneficiarySaved((saved) => {
    setData((current) => applySaved(current, toSummary(saved)));
  });

  const filtering = data.search.length > 0 || data.status !== "all";
  const showFirstEmpty = data.total === 0 && !filtering;

  return (
    <>
      {notice ? <BeneficiaryNotice notice={notice} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total beneficiaries" value={data.total} />
        <StatCard label="Active" value={data.active} />
        <StatCard label="Inactive" value={data.inactive} />
      </div>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              {filtering ? "Matching beneficiaries" : "All beneficiaries"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtering
                ? "Beneficiaries matching your search."
                : "Active and inactive beneficiary records."}
            </p>
          </div>
          <form action="/beneficiaries" className="flex w-full flex-col gap-2 sm:flex-row md:max-w-xl">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={data.search}
                placeholder="Search name, contact, email, GSTIN, or PAN"
                aria-label="Search beneficiaries"
                className="pl-8"
              />
            </div>
            <select
              name="status"
              defaultValue={data.status}
              aria-label="Beneficiary status"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>

        {showFirstEmpty ? (
          <div className="px-4 py-10">
            <p className="text-sm text-muted-foreground">No beneficiaries yet.</p>
            <Button type="button" className="mt-4" onClick={() => openBeneficiary()}>
              <Plus />
              Add beneficiary
            </Button>
          </div>
        ) : data.beneficiaries.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            <p>{emptyCopy(data)}</p>
            <Link href="/beneficiaries" className="mt-2 inline-block underline">
              Clear search
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">GSTIN</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.beneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/beneficiaries/${beneficiary.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {beneficiary.legalName}
                      </Link>
                      {beneficiary.city ? (
                        <p className="mt-1 text-xs font-normal text-muted-foreground">
                          {beneficiary.city}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{display(beneficiary.contactName)}</td>
                    <td className="px-4 py-3">{display(beneficiary.email)}</td>
                    <td className="px-4 py-3">{display(beneficiary.phone)}</td>
                    <td className="px-4 py-3">{display(beneficiary.gstin)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={beneficiary.isActive ? "secondary" : "outline"}>
                        {beneficiary.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.truncated ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Showing the first {data.beneficiaries.length} beneficiaries. Refine the search to see more.
              </p>
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {data.beneficiaries.length === 1
                  ? "1 beneficiary."
                  : `${data.beneficiaries.length} beneficiaries.`}
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
