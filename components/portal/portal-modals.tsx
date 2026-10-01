"use client";

import { BeneficiaryForm } from "@/components/portal/beneficiary-form";
import { InvoiceForm } from "@/components/portal/invoice-form";
import { Modal, ModalBody, ModalFooter } from "@/components/portal/modal";
import { Button } from "@/components/ui/button";
import type { Beneficiary } from "@/lib/beneficiary";
import { invoiceToday } from "@/lib/invoice";
import {
  prefetchInvoiceFormOptions,
  upsertInvoiceBeneficiary,
  useInvoiceFormOptions,
} from "@/lib/invoice-options-store";
import { cn } from "@/lib/utils";
import { UserPlus } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type BeneficiarySavedHandler = (beneficiary: Beneficiary, mode: "create" | "edit") => void;

type BeneficiaryRequest = {
  beneficiary?: Beneficiary;
  onSaved?: (beneficiary: Beneficiary) => void;
};

type Notice = { id: number; message: string; tone: "success" | "error" };

type PortalModalsValue = {
  openCreateInvoice: () => void;
  openBeneficiary: (request?: BeneficiaryRequest) => void;
  notify: (message: string, tone?: Notice["tone"]) => void;
  subscribeBeneficiarySaved: (handler: BeneficiarySavedHandler) => () => void;
};

const PortalModalsContext = createContext<PortalModalsValue | null>(null);

export function usePortalModals() {
  const value = useContext(PortalModalsContext);
  if (!value) throw new Error("usePortalModals must be used inside PortalModalsProvider.");
  return value;
}

export function useBeneficiarySaved(handler: BeneficiarySavedHandler) {
  const { subscribeBeneficiarySaved } = usePortalModals();
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(
    () => subscribeBeneficiarySaved((beneficiary, mode) => latest.current(beneficiary, mode)),
    [subscribeBeneficiarySaved],
  );
}

function FormSkeleton() {
  return (
    <ModalBody>
      <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]" aria-hidden>
        <div className="flex flex-col gap-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="h-9 animate-pulse rounded-md bg-muted" />
                <div className="h-9 animate-pulse rounded-md bg-muted" />
                <div className="h-9 animate-pulse rounded-md bg-muted sm:col-span-2" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl border bg-card shadow-sm" />
      </div>
      <p className="sr-only" role="status">
        Loading the invoice form…
      </p>
    </ModalBody>
  );
}

function CreateInvoiceContent({
  openBeneficiary,
  onClose,
}: {
  openBeneficiary: (request?: BeneficiaryRequest) => void;
  onClose: () => void;
}) {
  const { data, error, retry } = useInvoiceFormOptions(true);
  const [today] = useState(invoiceToday);

  if (!data) {
    if (!error) return <FormSkeleton />;
    return (
      <>
        <ModalBody>
          <div className="p-6">
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={retry}>
            Try again
          </Button>
        </ModalFooter>
      </>
    );
  }

  if (data.beneficiaries.length === 0) {
    return (
      <>
        <ModalBody>
          <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <UserPlus className="size-5 text-muted-foreground" />
            </span>
            <h3 className="mt-4 text-base font-semibold">Add a beneficiary first</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every invoice is raised to an active beneficiary. Add one and it will be ready to select here.
            </p>
            <Button type="button" className="mt-6" onClick={() => openBeneficiary()}>
              <UserPlus />
              Add beneficiary
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </>
    );
  }

  return (
    <InvoiceForm
      mode="create"
      variant="modal"
      beneficiaries={data.beneficiaries}
      bankAccounts={data.bankAccounts}
      defaults={data.defaults}
      today={today}
      onAddBeneficiary={(onSaved) => openBeneficiary({ onSaved })}
    />
  );
}

function Notices({ notices, dismiss }: { notices: Notice[]; dismiss: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof element.showPopover !== "function") return;
    if (notices.length === 0) {
      if (element.matches(":popover-open")) element.hidePopover();
      return;
    }
    if (element.matches(":popover-open")) element.hidePopover();
    element.showPopover();
  }, [notices]);

  return (
    <div
      ref={ref}
      popover="manual"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 top-auto m-0 w-auto flex-col gap-2 overflow-visible border-0 bg-transparent p-0 sm:left-auto sm:right-6 sm:w-96 [&:popover-open]:flex"
    >
      {notices.map((notice) => (
        <p
          key={notice.id}
          role={notice.tone === "error" ? "alert" : "status"}
          onClick={() => dismiss(notice.id)}
          className={cn(
            "cursor-default rounded-lg border px-4 py-3 text-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
            notice.tone === "error"
              ? "border-destructive/30 bg-card text-destructive"
              : "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
          )}
        >
          {notice.message}
        </p>
      ))}
    </div>
  );
}

function DismissModalsOnNavigate({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    onNavigate();
  }, [onNavigate, pathname]);

  return null;
}

export function PortalModalsProvider({ children }: { children: ReactNode }) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceSession, setInvoiceSession] = useState(0);
  const [beneficiaryOpen, setBeneficiaryOpen] = useState(false);
  const [beneficiaryRequest, setBeneficiaryRequest] = useState<
    (BeneficiaryRequest & { session: number }) | null
  >(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const subscribers = useRef(new Set<BeneficiarySavedHandler>());
  const noticeId = useRef(0);
  const dismissOnNavigate = useCallback(() => {
    setInvoiceOpen(false);
    setBeneficiaryOpen(false);
  }, []);

  const notify = useCallback((message: string, tone: Notice["tone"] = "success") => {
    noticeId.current += 1;
    const id = noticeId.current;
    setNotices((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setNotices((current) => current.filter((notice) => notice.id !== id));
    }, 4000);
  }, []);

  const openCreateInvoice = useCallback(() => {
    prefetchInvoiceFormOptions();
    setInvoiceSession((session) => session + 1);
    setInvoiceOpen(true);
  }, []);

  const openBeneficiary = useCallback((request: BeneficiaryRequest = {}) => {
    setBeneficiaryRequest((current) => ({ ...request, session: (current?.session ?? 0) + 1 }));
    setBeneficiaryOpen(true);
  }, []);

  const subscribeBeneficiarySaved = useCallback((handler: BeneficiarySavedHandler) => {
    subscribers.current.add(handler);
    return () => {
      subscribers.current.delete(handler);
    };
  }, []);

  const closeInvoice = useCallback(() => setInvoiceOpen(false), []);
  const closeBeneficiary = useCallback(() => setBeneficiaryOpen(false), []);

  const handleBeneficiarySaved = useCallback(
    (beneficiary: Beneficiary) => {
      const mode = beneficiaryRequest?.beneficiary ? "edit" : "create";
      upsertInvoiceBeneficiary(beneficiary);
      beneficiaryRequest?.onSaved?.(beneficiary);
      subscribers.current.forEach((handler) => handler(beneficiary, mode));
      setBeneficiaryOpen(false);
      notify(mode === "create" ? "Beneficiary added." : "Beneficiary saved.");
    },
    [beneficiaryRequest, notify],
  );

  const value = useMemo(
    () => ({ openCreateInvoice, openBeneficiary, notify, subscribeBeneficiarySaved }),
    [openCreateInvoice, openBeneficiary, notify, subscribeBeneficiarySaved],
  );

  const editing = Boolean(beneficiaryRequest?.beneficiary);

  return (
    <PortalModalsContext.Provider value={value}>
      <Suspense fallback={null}>
        <DismissModalsOnNavigate onNavigate={dismissOnNavigate} />
      </Suspense>
      {children}

      <Modal
        open={invoiceOpen}
        onClose={closeInvoice}
        size="xl"
        title="Create invoice"
        description="Save a draft. The invoice number is assigned by the database when the draft is saved."
        discardMessage="This invoice has not been saved. Closing now discards it."
      >
        <CreateInvoiceContent
          key={invoiceSession}
          openBeneficiary={openBeneficiary}
          onClose={closeInvoice}
        />
      </Modal>

      <Modal
        open={beneficiaryOpen}
        onClose={closeBeneficiary}
        title={editing ? "Edit beneficiary" : "Add beneficiary"}
        description={
          editing
            ? "Update contact, billing, and tax details. Existing invoices keep the details they were issued with."
            : "Record the company an invoice will be raised to."
        }
        discardMessage={
          editing
            ? "Your edits to this beneficiary have not been saved."
            : "This beneficiary has not been saved."
        }
      >
        {beneficiaryRequest ? (
          <BeneficiaryForm
            key={beneficiaryRequest.session}
            mode={editing ? "edit" : "create"}
            beneficiary={beneficiaryRequest.beneficiary}
            variant="modal"
            onSaved={handleBeneficiarySaved}
          />
        ) : null}
      </Modal>

      <Notices
        notices={notices}
        dismiss={(id) => setNotices((current) => current.filter((notice) => notice.id !== id))}
      />
    </PortalModalsContext.Provider>
  );
}
