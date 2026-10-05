"use client";

import { cn } from "@/lib/utils";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  leaving: boolean;
  nonce: number;
};

const tones: Record<
  ToastTone,
  { icon: typeof CircleCheck; panel: string; iconClass: string }
> = {
  success: {
    icon: CircleCheck,
    panel: "border-emerald-200 bg-card text-emerald-950 dark:border-emerald-900 dark:text-emerald-100",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: CircleAlert,
    panel: "border-red-200 bg-card text-red-950 dark:border-red-900 dark:text-red-100",
    iconClass: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: TriangleAlert,
    panel: "border-amber-200 bg-card text-amber-950 dark:border-amber-900 dark:text-amber-100",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    panel: "border-sky-200 bg-card text-sky-950 dark:border-sky-900 dark:text-sky-100",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
};

const TOAST_MS = 4500;
const TOAST_EXIT_MS = 180;

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToasts must be used inside ToastProvider.");
  return value;
}

export function useActionToast(
  source: unknown,
  message: string | null | undefined,
  tone: ToastTone = "error",
) {
  const { notify } = useToasts();
  const seen = useRef<unknown>(undefined);

  useEffect(() => {
    if (!message) {
      seen.current = undefined;
      return;
    }
    if (seen.current === source) return;
    seen.current = source;
    notify(message, tone);
  }, [source, message, notify, tone]);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const noticeId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => {
      const toast = current.find((item) => item.id === id);
      if (!toast || toast.leaving) return current;
      return current.map((item) => (item.id === id ? { ...item, leaving: true } : item));
    });
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, TOAST_EXIT_MS);
  }, []);

  useEffect(() => {
    const timers = toasts.flatMap((toast) =>
      toast.leaving ? [] : [window.setTimeout(() => dismiss(toast.id), TOAST_MS)],
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, dismiss]);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    const text = message.trim();
    if (!text) return;
    setToasts((current) => {
      const existing = current.find((item) => !item.leaving && item.message === text && item.tone === tone);
      if (existing) {
        return current.map((item) =>
          item.id === existing.id ? { ...item, nonce: item.nonce + 1 } : item,
        );
      }
      noticeId.current += 1;
      return [{ id: noticeId.current, message: text, tone, leaving: false, nonce: 0 }, ...current];
    });
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof element.showPopover !== "function") return;

    const show = () => {
      try {
        if (toasts.length === 0) {
          if (element.matches(":popover-open")) element.hidePopover();
          return;
        }
        if (!element.matches(":popover-open")) element.showPopover();
      } catch {
        // The popover API rejects the call while the document is inactive.
      }
    };

    let frame = 0;
    const lift = () => {
      if (toasts.length === 0) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => show());
    };

    const onToggle = (event: Event) => {
      if (!(event instanceof ToggleEvent) || event.newState !== "closed") return;
      if (document.querySelector("dialog[open]")) lift();
    };

    show();
    element.addEventListener("toggle", onToggle);
    const observer = new MutationObserver((records) => {
      if (!records.some((record) => record.target instanceof HTMLDialogElement)) return;
      lift();
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => {
      window.cancelAnimationFrame(frame);
      element.removeEventListener("toggle", onToggle);
      observer.disconnect();
    };
  }, [toasts.length]);

  return (
    <div
      ref={ref}
      popover="manual"
      aria-live="polite"
      className="fixed bottom-auto left-4 right-4 top-4 z-[200] m-0 flex h-auto max-h-[calc(100dvh-2rem)] w-auto flex-col gap-2 overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:left-auto sm:w-[22.5rem] [&:popover-open]:flex"
    >
      {toasts.map((toast) => {
        const tone = tones[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm shadow-lg",
              tone.panel,
              toast.leaving
                ? "animate-out fade-out-0 slide-out-to-right-4 duration-200 fill-mode-forwards motion-reduce:animate-none"
                : "animate-in fade-in-0 slide-in-from-top-2 slide-in-from-right-4 duration-200 motion-reduce:animate-none",
            )}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", tone.iconClass)} aria-hidden />
            <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-0.5 text-current/70 transition-colors hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
