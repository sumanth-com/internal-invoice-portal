-- Recorded payments against issued invoices.
-- An invoice stays issued until recorded payments cover its total, then it becomes paid.
-- Payment status values such as partial live on invoice_balances, not on invoice_status.
-- Payment rows are insert-only. Existing invoice numbering and role rules are unchanged.

create type public.payment_mode as enum (
  'neft',
  'rtgs',
  'imps',
  'upi',
  'cheque',
  'cash',
  'other'
);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  amount numeric(14, 2) not null,
  payment_date date not null default current_date,
  payment_mode public.payment_mode not null,
  reference text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invoice_payments_amount_positive check (amount > 0),
  constraint invoice_payments_reference_not_blank check (
    reference is null or length(btrim(reference)) > 0
  )
);

create index invoice_payments_invoice_id_idx
on public.invoice_payments (invoice_id);

create or replace function public.guard_invoice_payment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.invoice_status;
  v_total numeric(14, 2);
  v_recorded numeric(14, 2);
begin
  if tg_op <> 'INSERT' then
    raise exception 'Payment records cannot be changed';
  end if;

  if not public.is_active_member() then
    raise exception 'Only an active member can record a payment';
  end if;

  select status, total
  into v_status, v_total
  from public.invoices
  where id = new.invoice_id
  for update;

  if not found then
    raise exception 'Invoice does not exist';
  end if;

  if v_status <> 'issued' then
    raise exception 'Payments are allowed only for issued invoices';
  end if;

  select coalesce(sum(amount), 0)
  into v_recorded
  from public.invoice_payments
  where invoice_id = new.invoice_id;

  if v_recorded + new.amount > v_total then
    raise exception 'Payments cannot exceed the invoice total';
  end if;

  new.created_by = auth.uid();
  return new;
end;
$$;

create trigger invoice_payments_guard_changes
before insert or update or delete on public.invoice_payments
for each row
execute function public.guard_invoice_payment_changes();

create or replace function public.mark_invoice_paid_when_covered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric(14, 2);
  v_recorded numeric(14, 2);
begin
  select total
  into v_total
  from public.invoices
  where id = new.invoice_id
    and status = 'issued';

  if not found then
    return new;
  end if;

  select coalesce(sum(amount), 0)
  into v_recorded
  from public.invoice_payments
  where invoice_id = new.invoice_id;

  if v_recorded >= v_total then
    update public.invoices
    set status = 'paid'
    where id = new.invoice_id
      and status = 'issued';
  end if;

  return new;
end;
$$;

create trigger invoice_payments_mark_paid
after insert on public.invoice_payments
for each row
execute function public.mark_invoice_paid_when_covered();

-- Replaces the previous guard. Direct issued → paid is allowed only when
-- recorded payments already cover the total. paid_at is still set here.
create or replace function public.guard_invoice_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recorded numeric(14, 2);
begin
  if current_setting('invoices.syncing_totals', true) = '1' then
    if tg_op = 'UPDATE' then
      select coalesce(sum(amount), 0)
      into v_recorded
      from public.invoice_payments
      where invoice_id = new.id;

      if new.total < v_recorded then
        raise exception 'Invoice total cannot fall below recorded payments';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
    new.subtotal = 0;
    new.gst_amount = 0;
    new.total = 0;
    new.amount_in_words = public.amount_in_words(0);
    if new.status <> 'draft' then
      raise exception 'Invoices must be created as drafts';
    end if;
    return new;
  end if;

  new.updated_by = auth.uid();
  new.subtotal = old.subtotal;
  new.gst_amount = old.gst_amount;
  new.total = old.total;
  new.amount_in_words = old.amount_in_words;

  if new.invoice_number is distinct from old.invoice_number then
    raise exception 'Invoice numbers cannot be changed';
  end if;

  if left(new.invoice_number, 6) is distinct from to_char(new.invoice_date, 'YYYYMM') then
    raise exception 'Invoice date must stay in the month of the invoice number';
  end if;

  if new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.id is distinct from old.id
  then
    raise exception 'Invoice identity columns cannot be changed';
  end if;

  if new.status = 'issued' and old.status is distinct from 'issued' then
    new.issued_at = coalesce(old.issued_at, now());
  end if;

  if new.status = 'paid' and old.status is distinct from 'paid' then
    new.paid_at = coalesce(old.paid_at, now());
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at = coalesce(old.cancelled_at, now());
  end if;

  if new.status in ('issued', 'paid') then
    if new.bank_account_id is null then
      raise exception 'A bank account is required before issuing an invoice';
    end if;
    if new.bill_from is null or length(btrim(new.bill_from)) = 0
      or new.bill_to is null or length(btrim(new.bill_to)) = 0
    then
      raise exception 'Bill-from and bill-to are required before issuing an invoice';
    end if;
    if not exists (
      select 1 from public.invoice_items where invoice_id = new.id
    ) then
      raise exception 'At least one line item is required before issuing an invoice';
    end if;
  end if;

  if old.status = 'cancelled' then
    raise exception 'Cancelled invoices cannot be changed';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'issued')
      or (old.status = 'issued' and new.status = 'paid')
      or (public.is_admin() and new.status = 'cancelled')
    ) then
      raise exception 'Invalid invoice status change';
    end if;
  end if;

  if old.status = 'issued' and new.status = 'paid' then
    select coalesce(sum(amount), 0)
    into v_recorded
    from public.invoice_payments
    where invoice_id = new.id;

    if v_recorded < new.total then
      raise exception 'Invoice can be marked paid only when payments cover the total';
    end if;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.status = 'draft' and new.status in ('draft', 'issued') then
    return new;
  end if;

  if old.status = 'issued'
    and new.status = 'paid'
    and new.beneficiary_id is not distinct from old.beneficiary_id
    and new.bank_account_id is not distinct from old.bank_account_id
    and new.invoice_date is not distinct from old.invoice_date
    and new.due_date is not distinct from old.due_date
    and new.bill_from is not distinct from old.bill_from
    and new.bill_to is not distinct from old.bill_to
    and new.currency is not distinct from old.currency
    and new.payment_terms is not distinct from old.payment_terms
    and new.notes is not distinct from old.notes
    and new.gst_enabled is not distinct from old.gst_enabled
    and new.gst_rate is not distinct from old.gst_rate
  then
    return new;
  end if;

  raise exception 'Internal users can edit a draft, issue it, or mark an issued invoice as paid';
end;
$$;

alter table public.invoice_payments enable row level security;

revoke all on table public.invoice_payments from anon, public;
grant select, insert on table public.invoice_payments to authenticated;

create policy invoice_payments_select_members
on public.invoice_payments
for select
to authenticated
using (public.is_active_member());

create policy invoice_payments_insert_members
on public.invoice_payments
for insert
to authenticated
with check (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_payments.invoice_id
      and invoices.status = 'issued'
  )
);

create view public.invoice_balances
with (security_invoker = true)
as
select
  invoices.id as invoice_id,
  invoices.status,
  invoices.total,
  coalesce(payments.amount_paid, 0)::numeric(14, 2) as amount_paid,
  case
    when invoices.status in ('draft', 'cancelled') then 0::numeric(14, 2)
    else greatest(
      invoices.total - coalesce(payments.amount_paid, 0),
      0
    )::numeric(14, 2)
  end as outstanding,
  case
    when invoices.status = 'draft' then 'draft'
    when invoices.status = 'cancelled' then 'cancelled'
    when coalesce(payments.amount_paid, 0) <= 0 then 'unpaid'
    when coalesce(payments.amount_paid, 0) < invoices.total then 'partial'
    else 'paid'
  end as payment_status
from public.invoices
left join (
  select invoice_id, sum(amount) as amount_paid
  from public.invoice_payments
  group by invoice_id
) as payments on payments.invoice_id = invoices.id;

revoke all on table public.invoice_balances from anon, public;
grant select on table public.invoice_balances to authenticated;

comment on table public.invoice_payments is
  'Insert-only payments for issued invoices. A covered total marks the invoice paid.';
comment on view public.invoice_balances is
  'Outstanding balance and payment status. partial is not an invoice status.';
comment on column public.invoices.paid_at is
  'Set when recorded payments cover the invoice total.';
