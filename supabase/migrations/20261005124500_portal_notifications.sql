-- Deletable inbox for important portal events.
-- Invoice audit history stays append-only and is not used as this inbox.

create table public.portal_notifications (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  kind text not null,
  title text not null,
  message text not null,
  subject text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint portal_notifications_kind_check check (
    kind in (
      'invoice_issued',
      'invoice_paid',
      'invoice_cancelled',
      'invoice_draft',
      'beneficiary_created',
      'beneficiary_updated',
      'invoice_email',
      'user_invited'
    )
  ),
  constraint portal_notifications_title_check check (char_length(title) between 1 and 180),
  constraint portal_notifications_message_check check (char_length(message) between 1 and 500)
);

create index portal_notifications_created_at_idx
on public.portal_notifications (created_at desc);

create or replace function public.guard_portal_notification_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.event_key is distinct from old.event_key
    or new.kind is distinct from old.kind
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.subject is distinct from old.subject
    or new.created_at is distinct from old.created_at
    or new.id is distinct from old.id
  then
    raise exception 'Notification content cannot be changed';
  end if;
  return new;
end;
$$;

create trigger portal_notifications_guard_update
before update on public.portal_notifications
for each row
execute function public.guard_portal_notification_update();

alter table public.portal_notifications enable row level security;

revoke all on table public.portal_notifications from public, anon;
grant select, insert, update, delete on table public.portal_notifications to authenticated;

create policy portal_notifications_select
on public.portal_notifications
for select
to authenticated
using (public.is_active_member());

create policy portal_notifications_insert
on public.portal_notifications
for insert
to authenticated
with check (public.is_active_member());

create policy portal_notifications_update
on public.portal_notifications
for update
to authenticated
using (public.is_active_member())
with check (public.is_active_member());

create policy portal_notifications_delete
on public.portal_notifications
for delete
to authenticated
using (public.is_active_member());
