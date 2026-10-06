"use client";

import { PageHeader } from "@/components/portal/skeletons";
import { Modal, ModalBody, ModalFooter } from "@/components/portal/modal";
import { usePortalModals } from "@/components/portal/portal-modals";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deletePortalNotifications,
  listPortalNotifications,
  markAllPortalNotificationsRead,
  setPortalNotificationRead,
} from "@/app/(portal)/notifications/actions";
import {
  NOTIFICATION_REFRESH_EVENT,
  formatNotificationTime,
  type NotificationKind,
  type PortalNotification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Ban,
  Bell,
  CircleCheck,
  FilePenLine,
  FileText,
  Mail,
  MoreHorizontal,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

const icons: Record<NotificationKind, ComponentType<{ className?: string }>> = {
  invoice_issued: FileText,
  invoice_paid: CircleCheck,
  invoice_cancelled: Ban,
  invoice_draft: FilePenLine,
  beneficiary_created: UserPlus,
  beneficiary_updated: UserRound,
  invoice_email: Mail,
  user_invited: UserPlus,
};

const kindLabel: Record<NotificationKind, string> = {
  invoice_issued: "Issued invoice",
  invoice_paid: "Paid invoice",
  invoice_cancelled: "Cancelled invoice",
  invoice_draft: "Draft invoice",
  beneficiary_created: "Beneficiary added",
  beneficiary_updated: "Beneficiary updated",
  invoice_email: "Invoice email",
  user_invited: "User invitation",
};

type NotificationContextValue = {
  items: PortalNotification[];
  unreadCount: number;
  status: "loading" | "ready" | "error";
  reload: () => Promise<void>;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markAllRead: () => void;
  removeMany: (ids: string[]) => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const request = useRef(0);

  const reload = useCallback(async () => {
    const id = ++request.current;
    const result = await listPortalNotifications();
    if (id !== request.current) return;
    if (!result.ok) {
      setStatus("error");
      return;
    }
    setItems(result.items);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void reload();
    const onRefresh = () => void reload();
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
  }, [reload]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const markRead = useCallback((id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    void setPortalNotificationRead(id, true).then((result) => {
      if (!result.ok) void reload();
    });
  }, [reload]);

  const markUnread = useCallback((id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: false } : item)));
    void setPortalNotificationRead(id, false).then((result) => {
      if (!result.ok) void reload();
    });
  }, [reload]);

  const markAllRead = useCallback(() => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    void markAllPortalNotificationsRead().then((result) => {
      if (!result.ok) void reload();
    });
  }, [reload]);

  const removeMany = useCallback(async (ids: string[]) => {
    const removing = new Set(ids);
    const previous = items;
    setItems((current) => current.filter((item) => !removing.has(item.id)));
    const result = await deletePortalNotifications(ids);
    if (!result.ok) {
      setItems(previous);
      return false;
    }
    return true;
  }, [items]);

  const value = useMemo(
    () => ({ items, unreadCount, status, reload, markRead, markUnread, markAllRead, removeMany }),
    [items, unreadCount, status, reload, markRead, markUnread, markAllRead, removeMany],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationCenter() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  return value;
}

export function RefreshNotificationsOnNavigate() {
  const pathname = usePathname();
  const { reload } = useNotificationCenter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === null) {
      last.current = pathname;
      return;
    }
    if (last.current === pathname) return;
    last.current = pathname;
    void reload();
  }, [pathname, reload]);

  return null;
}

function subjectLabel(kind: NotificationKind) {
  if (kind === "beneficiary_created" || kind === "beneficiary_updated") return "Beneficiary";
  if (kind === "user_invited") return "User";
  return "Invoice";
}

function NotificationMenu({
  item,
  onRead,
  onUnread,
  onDelete,
}: {
  item: PortalNotification;
  onRead: () => void;
  onUnread: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-full"
          aria-label={`Actions for ${item.title}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {item.read ? (
          <DropdownMenuItem onSelect={onUnread}>Mark as unread</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onRead}>Mark as read</DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationSkeleton() {
  return (
    <div className="divide-y" role="status" aria-label="Loading notifications">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-start gap-2.5 px-3 py-3">
          <span className="mt-1 size-4 animate-pulse rounded-sm bg-muted" />
          <span className="mt-1 size-3.5 animate-pulse rounded-sm bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-4 w-2/3 animate-pulse rounded bg-muted" />
            <span className="block h-3 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyNotifications({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 text-center", compact ? "py-16" : "min-h-64 flex-1")}>
      <span className="flex size-11 items-center justify-center rounded-full border bg-muted text-muted-foreground">
        <Bell className="size-4" />
      </span>
      <p className="mt-4 text-sm font-medium">No notifications</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Invoice, beneficiary, email, and invitation updates will appear here.
      </p>
    </div>
  );
}

function NotificationError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center px-6 py-16 text-center" role="alert">
      <p className="text-sm font-medium">Notifications could not be loaded.</p>
      <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function DetailPanel({
  item,
  onBack,
  onRead,
  onUnread,
  onDelete,
}: {
  item: PortalNotification | null;
  onBack: () => void;
  onRead: () => void;
  onUnread: () => void;
  onDelete: () => void;
}) {
  const Icon = item ? icons[item.kind] : Bell;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      {item ? (
        <div key={item.id} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b px-5 py-4 sm:px-8">
            <Button type="button" variant="ghost" size="sm" className="-ml-2 lg:hidden" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug">{item.title}</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <p className="max-w-2xl text-sm leading-6">{item.message}</p>
            <dl className="mt-8 max-w-lg divide-y border-y">
              <DetailField label="Status" value={item.read ? "Read" : "Unread"} />
              <DetailField label="Type" value={kindLabel[item.kind]} />
              <DetailField label="When" value={formatNotificationTime(item.createdAt)} />
              {item.subject ? <DetailField label={subjectLabel(item.kind)} value={item.subject} /> : null}
            </dl>
          </div>
          <div className="flex flex-wrap justify-end gap-1 border-t px-5 py-3 sm:px-8">
            {item.read ? (
              <Button type="button" variant="ghost" size="sm" onClick={onUnread}>
                Mark as unread
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={onRead}>
                Mark as read
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-64 flex-1 flex-col items-center justify-center px-6 text-center">
          <Bell className="size-4 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Select a notification</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Choose a notification from the list to view its details.
          </p>
        </div>
      )}
    </section>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  );
}

export function NotificationCenter() {
  const { items, unreadCount, status, reload, markRead, markUnread, markAllRead, removeMany } = useNotificationCenter();
  const { notify } = usePortalModals();
  const selectAllId = useId();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const ignoreRowClick = useRef(false);

  const selectedItems = items.filter((item) => selected.has(item.id));
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const someSelected = selectedItems.length > 0 && !allSelected;
  const openItem = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    setSelected((current) => {
      const ids = new Set(items.map((item) => item.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        if (ids.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [items]);

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
      setMobileDetail(false);
    }
  }, [items, selectedId]);

  function openNotification(item: PortalNotification) {
    setSelectedId(item.id);
    setMobileDetail(true);
    if (!item.read) markRead(item.id);
  }

  function toggleAll(checked: boolean | "indeterminate") {
    setSelected(checked === true ? new Set(items.map((item) => item.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean | "indeterminate") {
    setSelected((current) => {
      const next = new Set(current);
      if (checked === true) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function askDelete(ids: string[]) {
    if (ids.length === 0) return;
    setPendingDelete(ids);
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    const ids = pendingDelete;
    const removing = new Set(ids);
    if (selectedId && removing.has(selectedId)) {
      const index = items.findIndex((item) => item.id === selectedId);
      const remaining = items.filter((item) => !removing.has(item.id));
      const next = remaining[index] ?? remaining[index - 1] ?? null;
      setSelectedId(next?.id ?? null);
      if (!next) setMobileDetail(false);
    }
    setDeleting(true);
    const ok = await removeMany(ids);
    setDeleting(false);
    if (!ok) {
      notify("The notification could not be deleted.", "error");
      void reload();
      return;
    }
    setSelected(new Set());
    setPendingDelete(null);
    notify(ids.length > 1 ? "Notifications deleted successfully." : "Notification deleted successfully.");
  }

  function markEverythingRead() {
    markAllRead();
    setSelected(new Set());
    notify("Notifications marked as read.");
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Notifications"
          description="Updates for issued, paid, cancelled, and draft invoices, beneficiaries, emails, and invitations."
        />
      </div>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card lg:flex-row">
        {status === "error" ? (
          <NotificationError onRetry={() => void reload()} />
        ) : status === "loading" ? (
          <NotificationSkeleton />
        ) : (
          <>
            <div className={cn("flex min-h-0 w-full flex-col lg:max-w-[26rem] lg:border-r", mobileDetail && "hidden lg:flex")}>
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
                <Checkbox
                  id={selectAllId}
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  disabled={items.length === 0}
                  onCheckedChange={toggleAll}
                  aria-label="Select all notifications"
                />
                <label htmlFor={selectAllId} className="text-sm text-muted-foreground">
                  Select all
                </label>
                {selectedItems.length > 0 ? (
                  <span className="text-sm text-muted-foreground">{selectedItems.length} selected</span>
                ) : null}
                <div className="ml-auto flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={selectedItems.length === 0}
                    onClick={() => askDelete(selectedItems.map((item) => item.id))}
                  >
                    <Trash2 className="size-3.5" />
                    Bulk delete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={items.length === 0 || unreadCount === 0}
                    onClick={markEverythingRead}
                  >
                    Mark all as read
                  </Button>
                </div>
              </div>
              {items.length === 0 ? (
                <EmptyNotifications compact />
              ) : (
                <ul className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
                  {items.map((item) => {
                    const Icon = icons[item.kind];
                    const active = item.id === selectedId;
                    return (
                      <li key={item.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-muted/40",
                            active && "bg-muted/60",
                          )}
                          onClick={() => {
                            if (ignoreRowClick.current) {
                              ignoreRowClick.current = false;
                              return;
                            }
                            openNotification(item);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openNotification(item);
                            }
                          }}
                        >
                          <span className="mt-0.5" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(item.id)}
                              onCheckedChange={(checked) => toggleOne(item.id, checked)}
                              aria-label={`Select ${item.title}`}
                            />
                          </span>
                          <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              {!item.read ? (
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                              ) : (
                                <span className="mt-1.5 size-1.5 shrink-0" aria-hidden />
                              )}
                              <span className={cn("min-w-0 flex-1 truncate text-sm leading-5", item.read ? "text-foreground/80" : "font-semibold")}>
                                {item.title}
                              </span>
                              <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                                {formatNotificationTime(item.createdAt)}
                              </span>
                            </span>
                            <span className="mt-0.5 line-clamp-1 block pl-3.5 text-sm text-muted-foreground">{item.message}</span>
                          </span>
                          <NotificationMenu
                            item={item}
                            onRead={() => {
                              ignoreRowClick.current = true;
                              markRead(item.id);
                              notify("Notification marked as read.");
                            }}
                            onUnread={() => {
                              ignoreRowClick.current = true;
                              markUnread(item.id);
                            }}
                            onDelete={() => {
                              ignoreRowClick.current = true;
                              askDelete([item.id]);
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className={cn("min-h-0 min-w-0 flex-1", !mobileDetail && "hidden lg:flex")}>
              <DetailPanel
                item={openItem}
                onBack={() => setMobileDetail(false)}
                onRead={() => {
                  if (!openItem) return;
                  markRead(openItem.id);
                  notify("Notification marked as read.");
                }}
                onUnread={() => openItem && markUnread(openItem.id)}
                onDelete={() => openItem && askDelete([openItem.id])}
              />
            </div>
          </>
        )}
      </section>
      <Modal
        open={pendingDelete !== null}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        title={pendingDelete && pendingDelete.length > 1 ? "Delete notifications?" : "Delete notification?"}
        description={
          pendingDelete && pendingDelete.length > 1
            ? "These notifications will be permanently removed."
            : "This notification will be permanently removed."
        }
        size="md"
      >
        <ModalBody className="bg-card">
          <span className="sr-only">Confirm notification deletion.</span>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" disabled={deleting} onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
