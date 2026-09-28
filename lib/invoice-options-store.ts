"use client";

import { fetchInvoiceFormOptions } from "@/app/(portal)/invoices/actions";
import type { Beneficiary } from "@/lib/beneficiary";
import type {
  BankAccountOption,
  CompanyInvoiceDefaults,
  InvoicePartyOption,
} from "@/lib/invoice";
import { useCallback, useEffect, useSyncExternalStore } from "react";

export type InvoiceFormOptions = {
  beneficiaries: InvoicePartyOption[];
  bankAccounts: BankAccountOption[];
  defaults: CompanyInvoiceDefaults;
};

type Snapshot = {
  data: InvoiceFormOptions | null;
  error: string | null;
  loading: boolean;
};

const FRESH_FOR_MS = 60_000;

let snapshot: Snapshot = { data: null, error: null, loading: false };
let loadedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadInvoiceFormOptions({ force = false } = {}) {
  if (inflight) return inflight;
  if (!force && snapshot.data && Date.now() - loadedAt < FRESH_FOR_MS) {
    return Promise.resolve();
  }

  publish({ loading: true, error: snapshot.data ? snapshot.error : null });
  inflight = fetchInvoiceFormOptions()
    .then((result) => {
      if (result.ok) {
        loadedAt = Date.now();
        publish({ data: result.data, error: null, loading: false });
      } else {
        publish({ error: result.error, loading: false });
      }
    })
    .catch(() => {
      publish({ error: "The invoice form could not be loaded.", loading: false });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function prefetchInvoiceFormOptions() {
  void loadInvoiceFormOptions();
}

export function upsertInvoiceBeneficiary(beneficiary: Beneficiary) {
  if (!snapshot.data) return;
  const others = snapshot.data.beneficiaries.filter((item) => item.id !== beneficiary.id);
  const beneficiaries = beneficiary.isActive
    ? [...others, beneficiary].sort((left, right) =>
        left.legalName.localeCompare(right.legalName, "en"),
      )
    : others;
  publish({ data: { ...snapshot.data, beneficiaries } });
}

const serverSnapshot: Snapshot = { data: null, error: null, loading: false };

export function useInvoiceFormOptions(active: boolean) {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot,
  );

  useEffect(() => {
    if (active) void loadInvoiceFormOptions();
  }, [active]);

  const retry = useCallback(() => {
    void loadInvoiceFormOptions({ force: true });
  }, []);

  return { ...state, retry };
}
