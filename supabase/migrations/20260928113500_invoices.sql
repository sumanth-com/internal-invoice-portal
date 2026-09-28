-- Invoice headers.
-- The database assigns invoice_number and never accepts a client-supplied value.
-- The number cannot be changed, and invoice_date must stay in that number's month.
-- subtotal, gst_amount, total, and amount_in_words are maintained from line items.
-- Active members can read and create drafts. An internal user can edit a draft,
-- issue it, or mark an issued invoice paid. Only an admin can cancel or delete a draft.

create type public.invoice_status as enum ('draft', 'issued', 'paid', 'cancelled');

set check_function_bodies = off;

create or replace function public.rupees_in_words(p_value bigint)
returns text
language plpgsql
immutable
as $$
declare
  ones text[] := array[
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  tens text[] := array[
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];
  v_number bigint := p_value;
  v_words text := '';
  v_chunk bigint;
  v_chunk_words text;
begin
  if p_value < 0 then
    raise exception 'Amount in words requires a non-negative amount';
  end if;

  if p_value = 0 then
    return 'Zero';
  end if;

  if v_number >= 10000000 then
    v_chunk := v_number / 10000000;
    v_number := v_number % 10000000;
    v_chunk_words := public.rupees_in_words(v_chunk);
    v_words := v_chunk_words || ' Crore';
  end if;

  if v_number >= 100000 then
    v_chunk := v_number / 100000;
    v_number := v_number % 100000;
    v_chunk_words := case
      when v_chunk < 20 then ones[v_chunk::integer + 1]
      else tens[(v_chunk / 10)::integer + 1]
        || case
          when v_chunk % 10 = 0 then ''
          else ' ' || ones[(v_chunk % 10)::integer + 1]
        end
    end;
    v_words := concat_ws(' ', v_words, v_chunk_words || ' Lakh');
  end if;

  if v_number >= 1000 then
    v_chunk := v_number / 1000;
    v_number := v_number % 1000;
    v_chunk_words := case
      when v_chunk < 20 then ones[v_chunk::integer + 1]
      else tens[(v_chunk / 10)::integer + 1]
        || case
          when v_chunk % 10 = 0 then ''
          else ' ' || ones[(v_chunk % 10)::integer + 1]
        end
    end;
    v_words := concat_ws(' ', v_words, v_chunk_words || ' Thousand');
  end if;

  if v_number >= 100 then
    v_chunk := v_number / 100;
    v_number := v_number % 100;
    v_words := concat_ws(' ', v_words, ones[v_chunk::integer + 1] || ' Hundred');
  end if;

  if v_number > 0 then
    v_chunk_words := case
      when v_number < 20 then ones[v_number::integer + 1]
      else tens[(v_number / 10)::integer + 1]
        || case
          when v_number % 10 = 0 then ''
          else ' ' || ones[(v_number % 10)::integer + 1]
        end
    end;
    v_words := concat_ws(' ', v_words, v_chunk_words);
  end if;

  return btrim(v_words);
end;
$$;

create or replace function public.amount_in_words(p_amount numeric)
returns text
language plpgsql
immutable
as $$
declare
  v_amount numeric(14, 2);
  v_rupees bigint;
  v_paise integer;
  v_words text;
begin
  if p_amount is null then
    return null;
  end if;

  if p_amount < 0 then
    raise exception 'Amount in words requires a non-negative amount';
  end if;

  v_amount := round(p_amount, 2);
  v_rupees := trunc(v_amount)::bigint;
  v_paise := ((v_amount - v_rupees) * 100)::integer;

  if v_rupees = 0 then
    v_words := 'Rupees Zero';
  else
    v_words := 'Rupees ' || public.rupees_in_words(v_rupees);
  end if;

  if v_paise > 0 then
    v_words := v_words || ' and Paise ' || public.rupees_in_words(v_paise);
  end if;

  return v_words || ' Only';
end;
$$;

set check_function_bodies = on;

revoke all on function public.rupees_in_words(bigint) from public, anon;
revoke all on function public.amount_in_words(numeric) from public, anon;
grant execute on function public.rupees_in_words(bigint) to authenticated;
grant execute on function public.amount_in_words(numeric) to authenticated;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  beneficiary_id uuid not null references public.beneficiaries (id) on delete restrict,
  bank_account_id uuid references public.bank_accounts (id) on delete restrict,
  status public.invoice_status not null default 'draft',
  invoice_date date not null default current_date,
  due_date date,
  bill_from text,
  bill_to text,
  currency char(3) not null default 'INR',
  payment_terms text,
  notes text,
  gst_enabled boolean not null default true,
  gst_rate numeric(5, 2) not null default 18,
  subtotal numeric(14, 2) not null default 0,
  gst_amount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  amount_in_words text not null default 'Rupees Zero Only',
  issued_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_invoice_number_unique unique (invoice_number),
  constraint invoices_number_matches_month check (
    invoice_number ~ '^[0-9]{8,}$'
    and left(invoice_number, 6) = to_char(invoice_date, 'YYYYMM')
  ),
  constraint invoices_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint invoices_due_date_order check (due_date is null or due_date >= invoice_date),
  constraint invoices_gst_rate_range check (gst_rate >= 0 and gst_rate <= 100),
  constraint invoices_totals_nonnegative check (
    subtotal >= 0 and gst_amount >= 0 and total >= 0
  )
);

create index invoices_beneficiary_id_idx on public.invoices (beneficiary_id);
create index invoices_bank_account_id_idx on public.invoices (bank_account_id);
create index invoices_status_idx on public.invoices (status);
create index invoices_invoice_date_idx on public.invoices (invoice_date);

create trigger invoices_set_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is not null and btrim(new.invoice_number) <> '' then
    raise exception 'Invoice numbers are assigned by the database';
  end if;

  new.invoice_number := public.allocate_invoice_number(new.invoice_date);
  return new;
end;
$$;

create trigger invoices_assign_number
before insert on public.invoices
for each row
execute function public.assign_invoice_number();

create or replace function public.guard_invoice_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('invoices.syncing_totals', true) = '1' then
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

create trigger invoices_guard_changes
before insert or update on public.invoices
for each row
execute function public.guard_invoice_changes();

alter table public.invoices enable row level security;

revoke all on table public.invoices from anon, public;
grant select, insert, update, delete on table public.invoices to authenticated;

create policy invoices_select_members
on public.invoices
for select
to authenticated
using (public.is_active_member());

create policy invoices_insert_members
on public.invoices
for insert
to authenticated
with check (public.is_active_member());

create policy invoices_update_members
on public.invoices
for update
to authenticated
using (public.is_active_member())
with check (public.is_active_member());

create policy invoices_delete_admin_draft
on public.invoices
for delete
to authenticated
using (public.is_admin() and status = 'draft');

create or replace function public.mark_invoice_deleting()
returns trigger
language plpgsql
as $$
begin
  perform set_config('invoices.deleting_id', old.id::text, true);
  return old;
end;
$$;

create trigger invoices_mark_deleting
before delete on public.invoices
for each row
execute function public.mark_invoice_deleting();

comment on column public.invoices.invoice_number is
  'Database-assigned YYYYMM sequence, such as 20260901. Unique and immutable.';
comment on column public.invoices.bill_from is
  'Issuer block printed on the invoice.';
comment on column public.invoices.bill_to is
  'Recipient block printed on the invoice.';
comment on column public.invoices.gst_enabled is
  'When false, GST amount is zero and the total equals the subtotal.';
comment on column public.invoices.gst_rate is
  'GST percent applied to the subtotal when GST is enabled. Default 18.';
comment on column public.invoices.amount_in_words is
  'Words for the invoice total, maintained by the database.';
comment on table public.invoices is
  'Invoice header. Totals and amount in words are maintained from invoice_items.';
