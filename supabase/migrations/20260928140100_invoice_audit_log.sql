-- Invoice action history. Row changes are written by triggers.
-- Duplicate, PDF download, email, and export are written only through
-- public.record_invoice_audit(). Clients cannot change the log directly.

create type public.invoice_audit_action as enum (
  'created',
  'updated',
  'issued',
  'payment_recorded',
  'paid',
  'cancelled',
  'duplicated',
  'pdf_downloaded',
  'emailed',
  'exported'
);

create table public.invoice_audit_log (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action public.invoice_audit_action not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint invoice_audit_log_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index invoice_audit_log_invoice_id_created_at_idx
on public.invoice_audit_log (invoice_id, created_at);

create or replace function public.prevent_invoice_audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE'
    and current_setting('invoices.deleting_id', true) = old.invoice_id::text
  then
    return old;
  end if;

  raise exception 'Audit records cannot be changed';
end;
$$;

create trigger invoice_audit_log_prevent_changes
before update or delete on public.invoice_audit_log
for each row
execute function public.prevent_invoice_audit_changes();

create or replace function public.audit_invoice_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action public.invoice_audit_action;
begin
  if tg_op = 'INSERT' then
    insert into public.invoice_audit_log (invoice_id, actor_id, action)
    values (new.id, auth.uid(), 'created');
    return new;
  end if;

  if new.status is distinct from old.status then
    v_action := case
      when old.status = 'draft' and new.status = 'issued' then 'issued'::public.invoice_audit_action
      when old.status = 'issued' and new.status = 'paid' then 'paid'::public.invoice_audit_action
      when new.status = 'cancelled' then 'cancelled'::public.invoice_audit_action
      else null
    end;

    if v_action is not null then
      insert into public.invoice_audit_log (invoice_id, actor_id, action, metadata)
      values (
        new.id,
        auth.uid(),
        v_action,
        jsonb_build_object('from_status', old.status, 'to_status', new.status)
      );
    end if;
  end if;

  if new.beneficiary_id is distinct from old.beneficiary_id
    or new.bank_account_id is distinct from old.bank_account_id
    or new.invoice_date is distinct from old.invoice_date
    or new.due_date is distinct from old.due_date
    or new.bill_from is distinct from old.bill_from
    or new.bill_to is distinct from old.bill_to
    or new.currency is distinct from old.currency
    or new.payment_terms is distinct from old.payment_terms
    or new.notes is distinct from old.notes
    or new.gst_enabled is distinct from old.gst_enabled
    or new.gst_rate is distinct from old.gst_rate
    or new.subtotal is distinct from old.subtotal
    or new.gst_amount is distinct from old.gst_amount
    or new.total is distinct from old.total
    or new.amount_in_words is distinct from old.amount_in_words
  then
    insert into public.invoice_audit_log (invoice_id, actor_id, action)
    values (new.id, auth.uid(), 'updated');
  end if;

  return new;
end;
$$;

create trigger invoices_audit_change
after insert or update on public.invoices
for each row
execute function public.audit_invoice_change();

create or replace function public.audit_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.invoice_audit_log (invoice_id, actor_id, action, metadata)
  values (
    new.invoice_id,
    auth.uid(),
    'payment_recorded',
    jsonb_build_object(
      'payment_id', new.id,
      'amount', new.amount,
      'payment_date', new.payment_date,
      'payment_mode', new.payment_mode,
      'reference', new.reference
    )
  );

  return new;
end;
$$;

create trigger invoice_payments_audit
after insert on public.invoice_payments
for each row
execute function public.audit_invoice_payment();

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

revoke all on function public.record_invoice_audit(uuid, public.invoice_audit_action, jsonb)
  from public, anon;
grant execute on function public.record_invoice_audit(uuid, public.invoice_audit_action, jsonb)
  to authenticated;

alter table public.invoice_audit_log enable row level security;

revoke all on table public.invoice_audit_log from anon, public;
grant select on table public.invoice_audit_log to authenticated;

create policy invoice_audit_log_select_members
on public.invoice_audit_log
for select
to authenticated
using (public.is_active_member());

comment on table public.invoice_audit_log is
  'Append-only invoice actions. Members can read. Clients cannot write rows directly.';
comment on function public.record_invoice_audit(uuid, public.invoice_audit_action, jsonb) is
  'Records duplicate, PDF download, email, and export actions for an active member.';
