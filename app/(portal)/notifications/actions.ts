"use server";

import { isNotificationKind, type PortalNotification } from "@/lib/notifications";
import { activeOwnerId } from "@/lib/owner-scope";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  message: string;
  subject: string | null;
  read_at: string | null;
  created_at: string;
};

function mapRow(row: NotificationRow): PortalNotification | null {
  if (!isNotificationKind(row.kind)) return null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    message: row.message,
    subject: row.subject,
    createdAt: row.created_at,
    read: row.read_at !== null,
  };
}

function isId(value: string) {
  return UUID_PATTERN.test(value);
}

async function authorized() {
  const ownerId = await activeOwnerId();
  if (!ownerId) return null;
  return { supabase: await createClient(), ownerId };
}

export async function listPortalNotifications(): Promise<
  { ok: true; items: PortalNotification[] } | { ok: false; error: string }
> {
  const access = await authorized();
  if (!access) return { ok: false, error: "You do not have permission to view notifications." };

  const { data, error } = await access.supabase
    .from("portal_notifications")
    .select("id, kind, title, message, subject, read_at, created_at")
    .eq("user_id", access.ownerId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { ok: false, error: "Notifications could not be loaded." };
  const items = ((data ?? []) as NotificationRow[]).flatMap((row) => {
    const item = mapRow(row);
    return item ? [item] : [];
  });
  return { ok: true, items };
}

export async function setPortalNotificationRead(
  id: string,
  read: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isId(id)) return { ok: false, error: "This notification was not found." };
  const access = await authorized();
  if (!access) return { ok: false, error: "You do not have permission to update notifications." };

  const { data, error } = await access.supabase
    .from("portal_notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", access.ownerId)
    .select("id");

  if (error || !data?.length) return { ok: false, error: "The notification could not be updated." };
  return { ok: true };
}

export async function markAllPortalNotificationsRead(): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await authorized();
  if (!access) return { ok: false, error: "You do not have permission to update notifications." };

  const { error } = await access.supabase
    .from("portal_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", access.ownerId)
    .is("read_at", null);

  if (error) return { ok: false, error: "Notifications could not be marked as read." };
  return { ok: true };
}

export async function deletePortalNotifications(
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const unique = [...new Set(ids)].filter(isId);
  if (unique.length === 0) return { ok: false, error: "This notification was not found." };
  const access = await authorized();
  if (!access) return { ok: false, error: "You do not have permission to delete notifications." };

  const { error } = await access.supabase
    .from("portal_notifications")
    .delete()
    .eq("user_id", access.ownerId)
    .in("id", unique);
  if (error) return { ok: false, error: "The notification could not be deleted." };
  return { ok: true };
}
