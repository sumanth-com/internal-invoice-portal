-- Each active member sees and changes only the invoices, beneficiaries,
-- payments, and notifications they own. Company settings, bank accounts,
-- GST defaults, and invoice numbering stay organization-wide.
-- Existing created_by values are left in place. Financial columns are not rewritten.

create index if not exists invoices_created_by_idx
on public.invoices (created_by);

create index if not exists beneficiaries_created_by_idx
on public.beneficiaries (created_by);

alter table public.portal_notifications
  add column user_id uuid references public.profiles (id) on delete cascade;

update public.portal_notifications as notification
set user_id = profile.id
from public.profiles as profile
where notification.user_id is null
  and lower(profile.email) = 'marketing@ifranchise.in';

do $$
begin
  if exists (select 1 from public.portal_notifications where user_id is null) then
    raise exception 'Existing notifications could not be assigned to their owner';
  end if;
end;
$$;

alter table public.portal_notifications
  alter column user_id set not null;

create index portal_notifications_user_created_idx
on public.portal_notifications (user_id, created_at desc);

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
    or new.user_id is distinct from old.user_id
    or new.id is distinct from old.id
  then
    raise exception 'Notification content cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.portal_notifications_set_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  elsif new.user_id is null then
    raise exception 'Notification owner is required';
  end if;
  return new;
end;
$$;

drop trigger if exists portal_notifications_set_owner on public.portal_notifications;

create trigger portal_notifications_set_owner
before insert on public.portal_notifications
for each row
execute function public.portal_notifications_set_owner();

drop policy if exists portal_notifications_select on public.portal_notifications;
drop policy if exists portal_notifications_insert on public.portal_notifications;
drop policy if exists portal_notifications_update on public.portal_notifications;
drop policy if exists portal_notifications_delete on public.portal_notifications;

create policy portal_notifications_select
on public.portal_notifications
for select
to authenticated
using (public.is_active_member() and user_id = auth.uid());

create policy portal_notifications_insert
on public.portal_notifications
for insert
to authenticated
with check (public.is_active_member() and user_id = auth.uid());

create policy portal_notifications_update
on public.portal_notifications
for update
to authenticated
using (public.is_active_member() and user_id = auth.uid())
with check (public.is_active_member() and user_id = auth.uid());

create policy portal_notifications_delete
on public.portal_notifications
for delete
to authenticated
using (public.is_active_member() and user_id = auth.uid());

drop policy if exists invoices_select_members on public.invoices;
drop policy if exists invoices_insert_members on public.invoices;
drop policy if exists invoices_update_members on public.invoices;
drop policy if exists invoices_delete_admin_draft on public.invoices;

create policy invoices_select_owner
on public.invoices
for select
to authenticated
using (public.is_active_member() and created_by = auth.uid());

create policy invoices_insert_owner
on public.invoices
for insert
to authenticated
with check (public.is_active_member() and created_by = auth.uid());

create policy invoices_update_owner
on public.invoices
for update
to authenticated
using (public.is_active_member() and created_by = auth.uid())
with check (public.is_active_member() and created_by = auth.uid());

create policy invoices_delete_own_draft
on public.invoices
for delete
to authenticated
using (public.is_admin() and status = 'draft' and created_by = auth.uid());

drop policy if exists beneficiaries_select_members on public.beneficiaries;
drop policy if exists beneficiaries_insert_members on public.beneficiaries;
drop policy if exists beneficiaries_update_members on public.beneficiaries;
drop policy if exists beneficiaries_delete_admin on public.beneficiaries;

create policy beneficiaries_select_owner
on public.beneficiaries
for select
to authenticated
using (public.is_active_member() and created_by = auth.uid());

create policy beneficiaries_insert_owner
on public.beneficiaries
for insert
to authenticated
with check (public.is_active_member() and created_by = auth.uid());

create policy beneficiaries_update_owner
on public.beneficiaries
for update
to authenticated
using (public.is_active_member() and created_by = auth.uid())
with check (public.is_active_member() and created_by = auth.uid());

create policy beneficiaries_delete_own_admin
on public.beneficiaries
for delete
to authenticated
using (public.is_admin() and created_by = auth.uid());

drop policy if exists invoice_items_select_members on public.invoice_items;
drop policy if exists invoice_items_insert_draft_or_admin on public.invoice_items;
drop policy if exists invoice_items_update_draft_or_admin on public.invoice_items;
drop policy if exists invoice_items_delete_draft_or_admin on public.invoice_items;

create policy invoice_items_select_owner
on public.invoice_items
for select
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
  )
);

create policy invoice_items_insert_own_draft
on public.invoice_items
for insert
to authenticated
with check (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
      and invoices.status = 'draft'
  )
);

create policy invoice_items_update_own_draft
on public.invoice_items
for update
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
      and invoices.status = 'draft'
  )
)
with check (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
      and invoices.status = 'draft'
  )
);

create policy invoice_items_delete_own_draft
on public.invoice_items
for delete
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.created_by = auth.uid()
      and invoices.status = 'draft'
  )
);

drop policy if exists invoice_payments_select_members on public.invoice_payments;
drop policy if exists invoice_payments_insert_members on public.invoice_payments;
drop policy if exists invoice_payments_update_members on public.invoice_payments;
drop policy if exists invoice_payments_delete_members on public.invoice_payments;

create policy invoice_payments_select_owner
on public.invoice_payments
for select
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_payments.invoice_id
      and invoices.created_by = auth.uid()
  )
);

create policy invoice_payments_insert_owner
on public.invoice_payments
for insert
to authenticated
with check (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_payments.invoice_id
      and invoices.created_by = auth.uid()
      and invoices.status = 'issued'
  )
);

create policy invoice_payments_update_owner
on public.invoice_payments
for update
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_payments.invoice_id
      and invoices.created_by = auth.uid()
  )
)
with check (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_payments.invoice_id
      and invoices.created_by = auth.uid()
  )
);

create policy invoice_payments_delete_owner
on public.invoice_payments
for delete
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_payments.invoice_id
      and invoices.created_by = auth.uid()
  )
);

drop policy if exists invoice_audit_log_select_members on public.invoice_audit_log;

create policy invoice_audit_log_select_owner
on public.invoice_audit_log
for select
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_audit_log.invoice_id
      and invoices.created_by = auth.uid()
  )
);

drop policy if exists profiles_select_own_or_members on public.profiles;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create or replace function public.record_invoice_audit(
  p_invoice_id uuid,
  p_action public.invoice_audit_action,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_active_member() then
    raise exception 'Only an active member can record this invoice action';
  end if;

  if p_action not in (
    'duplicated'::public.invoice_audit_action,
    'pdf_downloaded'::public.invoice_audit_action,
    'emailed'::public.invoice_audit_action,
    'exported'::public.invoice_audit_action
  ) then
    raise exception 'This invoice action is recorded automatically';
  end if;

  if not exists (
    select 1
    from public.invoices
    where id = p_invoice_id
      and created_by = auth.uid()
  ) then
    raise exception 'Invoice does not exist';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    p_metadata := '{}'::jsonb;
  end if;

  insert into public.invoice_audit_log (invoice_id, actor_id, action, metadata)
  values (
    p_invoice_id,
    auth.uid(),
    p_action,
    p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.recalculate_invoice(uuid) from public, anon, authenticated;

create or replace function public.organization_invoice_refs()
returns table (invoice_number text, bank_account_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select invoices.invoice_number, invoices.bank_account_id
  from public.invoices
  where public.is_admin();
$$;

revoke all on function public.organization_invoice_refs() from public, anon;
grant execute on function public.organization_invoice_refs() to authenticated;

comment on function public.organization_invoice_refs() is
  'Invoice numbers and bank links for admin numbering and shared bank checks. It does not grant invoice access.';
