"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

const EXIT_MS = 160;

type ModalContextValue = {
  requestClose: () => void;
  setDirty: (dirty: boolean) => void;
  setBusy: (busy: boolean) => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const value = useContext(ModalContext);
  if (!value) throw new Error("useModal must be used inside a Modal.");
  return value;
}

export function useOptionalModal() {
  return useContext(ModalContext);
}

let openCount = 0;

function lockPageScroll() {
  openCount += 1;
  if (openCount === 1) document.documentElement.style.overflow = "hidden";
  return () => {
    openCount -= 1;
    if (openCount === 0) document.documentElement.style.overflow = "";
  };
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "lg",
  discardMessage = "Your changes will be lost.",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "lg" | "xl";
  discardMessage?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setDirty(false);
      setBusy(false);
      setConfirming(false);
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!mounted || !dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const unlock = lockPageScroll();
    return () => {
      unlock();
      if (dialog.open) dialog.close();
    };
  }, [mounted]);

  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open, dirty]);

  useEffect(() => {
    if (confirming) keepEditingRef.current?.focus();
  }, [confirming]);

  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) {
      setConfirming(true);
      return;
    }
    onClose();
  }, [busy, dirty, onClose]);

  if (!mounted) return null;

  return (
    <ModalContext.Provider value={{ requestClose, setDirty, setBusy }}>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        data-visible={visible}
        onCancel={(event) => {
          event.preventDefault();
          if (confirming) setConfirming(false);
          else requestClose();
        }}
        onClose={(event) => {
          if (!open) return;
          const dialog = event.currentTarget;
          if (dirty || busy) {
            dialog.showModal();
            if (dirty && !busy) setConfirming(true);
          } else {
            onClose();
          }
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
        className={cn(
          "m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-foreground",
          "sm:m-auto sm:w-[94vw]",
          size === "xl" ? "sm:h-[92vh] sm:max-w-[1440px]" : "sm:h-fit sm:max-w-4xl",
          "backdrop:bg-black/50 backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-150",
          "data-[visible=true]:backdrop:opacity-100",
        )}
      >
        <div
          className={cn(
            "relative flex h-full max-h-dvh flex-col overflow-hidden bg-background shadow-2xl sm:max-h-[92vh] sm:rounded-2xl sm:border",
            "transition duration-150 ease-out motion-reduce:transition-none",
            visible ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-3 opacity-0 sm:scale-[0.98]",
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b bg-card px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close"
              disabled={busy}
              onClick={requestClose}
              className="-mr-2 shrink-0"
            >
              <X />
            </Button>
          </header>

          {children}

          {confirming ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 p-4 backdrop-blur-[2px] animate-in fade-in-0 duration-150">
              <div
                role="alertdialog"
                aria-labelledby={`${titleId}-discard`}
                aria-describedby={`${titleId}-discard-description`}
                className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg animate-in zoom-in-95 duration-150"
              >
                <h3 id={`${titleId}-discard`} className="text-base font-semibold">
                  Discard unsaved changes?
                </h3>
                <p id={`${titleId}-discard-description`} className="mt-1 text-sm text-muted-foreground">
                  {discardMessage}
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <Button
                    ref={keepEditingRef}
                    type="button"
                    variant="outline"
                    onClick={() => setConfirming(false)}
                  >
                    Keep editing
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setConfirming(false);
                      onClose();
                    }}
                  >
                    Discard changes
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </dialog>
    </ModalContext.Provider>
  );
}

export function ModalBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/30", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <footer
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6",
        className,
      )}
    >
      {children}
    </footer>
  );
}
