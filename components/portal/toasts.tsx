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
import { createPortal } from "react-dom";

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
  { icon: typeof CircleCheck; panel: string; iconClass: string; closeClass: string; align: string }
> = {
  success: {
    icon: CircleCheck,
    panel: "border-transparent bg-emerald-600 text-white shadow-md",
    iconClass: "text-white",
    closeClass: "text-white/80 hover:bg-white/15 hover:text-white",
    align: "items-center",
  },
  error: {
    icon: CircleAlert,
    panel: "border-red-200 bg-card text-red-950 shadow-lg dark:border-red-900 dark:text-red-100",
    iconClass: "text-red-600 dark:text-red-400",
    closeClass: "text-current/70 hover:bg-black/5 hover:text-current dark:hover:bg-white/10",
    align: "items-start",
  },
  warning: {
    icon: TriangleAlert,
    panel: "border-amber-200 bg-card text-amber-950 shadow-lg dark:border-amber-900 dark:text-amber-100",
    iconClass: "text-amber-600 dark:text-amber-400",
    closeClass: "text-current/70 hover:bg-black/5 hover:text-current dark:hover:bg-white/10",
    align: "items-start",
  },
  info: {
    icon: Info,
    panel: "border-sky-200 bg-card text-sky-950 shadow-lg dark:border-sky-900 dark:text-sky-100",
    iconClass: "text-sky-600 dark:text-sky-400",
    closeClass: "text-current/70 hover:bg-black/5 hover:text-current dark:hover:bg-white/10",
    align: "items-start",
  },
};

const SUCCESS_TOAST_MS = 3800;
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

  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    const active = new Set<string>();
    for (const toast of toasts) {
      if (toast.leaving) continue;
      const key = `${toast.id}:${toast.nonce}`;
      active.add(key);
      if (timers.current.has(key)) continue;
      const delay = toast.tone === "success" ? SUCCESS_TOAST_MS : TOAST_MS;
      timers.current.set(
        key,
        window.setTimeout(() => dismiss(toast.id), delay),
      );
    }
    for (const [key, timer] of timers.current) {
      if (active.has(key)) continue;
      window.clearTimeout(timer);
      timers.current.delete(key);
    }
  }, [toasts, dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

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
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const pick = () => {
      const open = document.querySelectorAll("dialog[open]");
      const next = (open[open.length - 1] as HTMLElement | undefined) ?? document.body;
      setHost((current) => (current === next ? current : next));
    };
    pick();
    const observer = new MutationObserver(pick);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => observer.disconnect();
  }, []);

  if (!host || toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[300] flex w-[min(26.25rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col gap-2 overflow-y-auto"
    >
      {toasts.map((toast) => {
        const tone = tones[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full gap-3 rounded-lg border px-4 py-3 text-sm",
              tone.align,
              tone.panel,
              toast.leaving
                ? "animate-out fade-out-0 slide-out-to-right-4 duration-200 fill-mode-forwards motion-reduce:animate-none"
                : "animate-in fade-in-0 slide-in-from-top-2 slide-in-from-right-4 duration-200 motion-reduce:animate-none",
            )}
          >
            <Icon className={cn("size-4 shrink-0", toast.tone === "success" ? "" : "mt-0.5", tone.iconClass)} aria-hidden />
            <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className={cn("shrink-0 rounded-md p-0.5 transition-colors", tone.closeClass)}
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>,
    host,
  );
}
