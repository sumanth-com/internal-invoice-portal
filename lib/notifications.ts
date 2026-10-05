export const NOTIFICATION_KINDS = [
  "invoice_issued",
  "invoice_paid",
  "invoice_cancelled",
  "invoice_draft",
  "beneficiary_created",
  "beneficiary_updated",
  "invoice_email",
  "user_invited",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export function isNotificationKind(value: string): value is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value);
}

export type PortalNotification = {
  id: string;
  title: string;
  message: string;
  subject: string | null;
  createdAt: string;
  read: boolean;
  kind: NotificationKind;
};

export const NOTIFICATION_REFRESH_EVENT = "portal-notifications-refresh";

export function requestNotificationRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATION_REFRESH_EVENT));
}

export function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
