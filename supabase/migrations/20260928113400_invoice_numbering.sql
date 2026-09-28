-- Monthly invoice numbers: YYYYMM plus a sequence that restarts at 01 each month.
-- September 2026: 20260901, 20260902. October 2026: 20261001.
-- Each month has its own counter so a later month cannot reset an earlier one.
-- Members can read counters. Only an admin can edit them directly.
-- public.allocate_invoice_number() locks the month row and issues the next number.

create table public.invoice_sequences (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  next_number integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint invoice_sequences_period_unique unique (period),
  constraint invoice_sequences_period_format check (
    period ~ '^[0-9]{4}(0[1-9]|1[0-2])$'
  ),
  constraint invoice_sequences_next_number_positive check (next_number > 0)
);

create trigger invoice_sequences_set_updated_at
before update on public.invoice_sequences
for each row
execute function public.set_updated_at();

create or replace function public.allocate_invoice_number(p_invoice_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text;
  v_next integer;
begin
  if p_invoice_date is null then
    raise exception 'Invoice date is required to allocate an invoice number';
  end if;

  if not public.is_active_member() then
    raise exception 'Only an active member can allocate an invoice number';
  end if;

  v_period := to_char(p_invoice_date, 'YYYYMM');

  insert into public.invoice_sequences (period, next_number)
  values (v_period, 1)
  on conflict (period) do nothing;

  select next_number
  into v_next
  from public.invoice_sequences
  where period = v_period
  for update;

  update public.invoice_sequences
  set next_number = v_next + 1
  where period = v_period;

  return v_period || lpad(v_next::text, 2, '0');
end;
$$;

revoke all on function public.allocate_invoice_number(date) from public, anon;
grant execute on function public.allocate_invoice_number(date) to authenticated;

alter table public.invoice_sequences enable row level security;

revoke all on table public.invoice_sequences from anon, public;
grant select, insert, update, delete on table public.invoice_sequences to authenticated;

create policy invoice_sequences_select_members
on public.invoice_sequences
for select
to authenticated
using (public.is_active_member());

create policy invoice_sequences_insert_admin
on public.invoice_sequences
for insert
to authenticated
with check (public.is_admin());

create policy invoice_sequences_update_admin
on public.invoice_sequences
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy invoice_sequences_delete_admin
on public.invoice_sequences
for delete
to authenticated
using (public.is_admin());

comment on table public.invoice_sequences is
  'One counter per calendar month. 202609 yields 20260901, then 20260902. The next month starts at 20261001.';
