-- Financial-year invoice numbers coexist with the existing YYYYMM numbers.
-- New invoices are IF/26-27/0001. Existing numbers such as 20260901 stay as they are.
-- The FY 26-27 counter starts at 0001 and is not seeded from those old numbers.
-- Balance due is invoice total minus TDS. Amount in words follows that balance.
-- Karnataka supply uses CGST 9% and SGST 9%. Every other supply uses IGST 18%.

create or replace function public.financial_year_label(p_date date)
returns text
language sql
immutable
as $$
  select case
    when p_date is null then null
    when extract(month from p_date)::integer >= 4 then
      to_char(p_date, 'YY') || '-' || to_char((p_date + interval '1 year')::date, 'YY')
    else
      to_char((p_date - interval '1 year')::date, 'YY') || '-' || to_char(p_date, 'YY')
  end;
$$;

create or replace function public.invoice_number_matches_date(p_number text, p_date date)
returns boolean
language sql
immutable
as $$
  select
    (
      p_number ~ '^[0-9]{8,}$'
      and left(p_number, 6) = to_char(p_date, 'YYYYMM')
    )
    or (
      p_number ~ '^IF/[0-9]{2}-[0-9]{2}/[0-9]{4}$'
      and substring(p_number from 4 for 5) = public.financial_year_label(p_date)
    );
$$;

create or replace function public.invoice_is_karnataka_supply(
  p_state text,
  p_code text,
  p_place text
)
returns boolean
language sql
immutable
as $$
  select
    btrim(coalesce(p_code, '')) = '29'
    or lower(btrim(coalesce(p_state, ''))) in ('karnataka', 'ka')
    or lower(btrim(coalesce(p_place, ''))) in ('karnataka', 'ka');
$$;

revoke all on function public.financial_year_label(date) from public, anon;
revoke all on function public.invoice_number_matches_date(text, date) from public, anon;
revoke all on function public.invoice_is_karnataka_supply(text, text, text) from public, anon;
grant execute on function public.financial_year_label(date) to authenticated;
grant execute on function public.invoice_number_matches_date(text, date) to authenticated;
grant execute on function public.invoice_is_karnataka_supply(text, text, text) to authenticated;

alter table public.invoice_sequences
  drop constraint invoice_sequences_period_format;

alter table public.invoice_sequences
  add constraint invoice_sequences_period_format check (
    period ~ '^[0-9]{4}(0[1-9]|1[0-2])$'
    or period ~ '^[0-9]{2}-[0-9]{2}$'
  );

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

  v_period := public.financial_year_label(p_invoice_date);

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

  return 'IF/' || v_period || '/' || lpad(v_next::text, 4, '0');
end;
$$;

comment on table public.invoice_sequences is
  'Monthly counters remain for historical YYYYMM numbers. New invoices use a financial-year counter such as 26-27, starting at IF/26-27/0001.';

alter table public.invoices
  add column place_of_supply text,
  add column supply_state text,
  add column state_code text,
  add column client_gstin text,
  add column deal_reference text,
  add column cgst_amount numeric(14, 2) not null default 0,
  add column sgst_amount numeric(14, 2) not null default 0,
  add column igst_amount numeric(14, 2) not null default 0,
  add column tds_amount numeric(14, 2) not null default 0,
  add column balance_due numeric(14, 2)
    generated always as (total - tds_amount) stored;

alter table public.invoices
  drop constraint invoices_number_matches_month;

alter table public.invoices
  add constraint invoices_number_matches_period check (
    public.invoice_number_matches_date(invoice_number, invoice_date)
  );

alter table public.invoices
  add constraint invoices_state_code_format check (
    state_code is null or state_code ~ '^[0-9]{2}$'
  );

alter table public.invoices
  add constraint invoices_tax_split_nonnegative check (
    cgst_amount >= 0 and sgst_amount >= 0 and igst_amount >= 0 and tds_amount >= 0
  );

alter table public.invoices
  add constraint invoices_tds_within_total check (tds_amount <= total);

comment on column public.invoices.invoice_number is
  'Database-assigned. Historical numbers stay YYYYMM, such as 20260901. New numbers are IF/26-27/0001.';
comment on column public.invoices.balance_due is
  'Invoice total minus TDS. Amount in words uses this figure.';
comment on column public.invoice_items.hsn is
  'SAC code for a service line. Older rows may contain an HSN/SAC value.';

create or replace function public.recalculate_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(14, 2);
  v_cgst numeric(14, 2);
  v_sgst numeric(14, 2);
  v_igst numeric(14, 2);
  v_gst_amount numeric(14, 2);
  v_total numeric(14, 2);
  v_gst_enabled boolean;
  v_tds numeric(14, 2);
  v_state text;
  v_code text;
  v_place text;
  v_karnataka boolean;
begin
  if current_setting('invoices.deleting_id', true) = p_invoice_id::text then
    return;
  end if;

  select gst_enabled, tds_amount, supply_state, state_code, place_of_supply
  into v_gst_enabled, v_tds, v_state, v_code, v_place
  from public.invoices
  where id = p_invoice_id;

  if not found then
    return;
  end if;

  select coalesce(sum(line_subtotal), 0)
  into v_subtotal
  from public.invoice_items
  where invoice_id = p_invoice_id;

  v_karnataka := public.invoice_is_karnataka_supply(v_state, v_code, v_place);

  if v_gst_enabled and v_karnataka then
    v_cgst := round(v_subtotal * 9 / 100, 2);
    v_sgst := round(v_subtotal * 9 / 100, 2);
    v_igst := 0;
  elsif v_gst_enabled then
    v_cgst := 0;
    v_sgst := 0;
    v_igst := round(v_subtotal * 18 / 100, 2);
  else
    v_cgst := 0;
    v_sgst := 0;
    v_igst := 0;
  end if;

  v_gst_amount := v_cgst + v_sgst + v_igst;
  v_total := v_subtotal + v_gst_amount;

  if v_tds > v_total then
    raise exception 'TDS cannot exceed the invoice total';
  end if;

  perform set_config('invoices.syncing_totals', '1', true);

  update public.invoices
  set
    subtotal = v_subtotal,
    cgst_amount = v_cgst,
    sgst_amount = v_sgst,
    igst_amount = v_igst,
    gst_amount = v_gst_amount,
    gst_rate = case when v_gst_enabled then 18 else 0 end,
    total = v_total,
    amount_in_words = public.amount_in_words(v_total - v_tds)
  where id = p_invoice_id;

  perform set_config('invoices.syncing_totals', '0', true);
end;
$$;

create or replace function public.recalculate_invoice_after_gst_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('invoices.syncing_totals', true) = '1' then
    return null;
  end if;

  if new.gst_enabled is distinct from old.gst_enabled
    or new.gst_rate is distinct from old.gst_rate
    or new.tds_amount is distinct from old.tds_amount
    or new.place_of_supply is distinct from old.place_of_supply
    or new.supply_state is distinct from old.supply_state
    or new.state_code is distinct from old.state_code
  then
    perform public.recalculate_invoice(new.id);
  end if;

  return null;
end;
$$;

drop trigger if exists invoices_recalculate_on_gst_change on public.invoices;

create trigger invoices_recalculate_on_tax_change
after update of gst_enabled, gst_rate, tds_amount, place_of_supply, supply_state, state_code
on public.invoices
for each row
execute function public.recalculate_invoice_after_gst_change();

create or replace function public.guard_invoice_payment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.invoice_status;
  v_due numeric(14, 2);
  v_recorded numeric(14, 2);
begin
  if not public.is_active_member() then
    raise exception 'Only an active member can record a payment';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.invoice_id is distinct from old.invoice_id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Payment records cannot be changed';
    end if;
  end if;

  select status, total - tds_amount
  into v_status, v_due
  from public.invoices
  where id = new.invoice_id
  for update;

  if not found then
    raise exception 'Invoice does not exist';
  end if;

  if tg_op = 'INSERT' and v_status <> 'issued' then
    raise exception 'Payments are allowed only for issued invoices';
  end if;

  if tg_op = 'UPDATE' and v_status not in ('issued', 'paid') then
    raise exception 'Payments are allowed only for issued invoices';
  end if;

  select coalesce(sum(amount), 0)
  into v_recorded
  from public.invoice_payments
  where invoice_id = new.invoice_id
    and (tg_op = 'INSERT' or id <> new.id);

  if v_recorded + new.amount > v_due then
    raise exception 'Payments cannot exceed the balance due';
  end if;

  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  end if;

  return new;
end;
$$;

create or replace function public.mark_invoice_paid_when_covered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_status public.invoice_status;
  v_due numeric(14, 2);
  v_recorded numeric(14, 2);
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);

  select status, total - tds_amount
  into v_status, v_due
  from public.invoices
  where id = v_invoice_id
    and status in ('issued', 'paid');

  if not found then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0)
  into v_recorded
  from public.invoice_payments
  where invoice_id = v_invoice_id;

  if v_status = 'issued' and v_recorded >= v_due then
    update public.invoices
    set status = 'paid'
    where id = v_invoice_id
      and status = 'issued';
  elsif v_status = 'paid' and v_recorded < v_due then
    perform set_config('invoices.adjusting_payment', '1', true);
    update public.invoices
    set status = 'issued',
        paid_at = null
    where id = v_invoice_id
      and status = 'paid';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace view public.invoice_balances
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
      (invoices.total - invoices.tds_amount) - coalesce(payments.amount_paid, 0),
      0
    )::numeric(14, 2)
  end as outstanding,
  case
    when invoices.status = 'draft' then 'draft'
    when invoices.status = 'cancelled' then 'cancelled'
    when coalesce(payments.amount_paid, 0) <= 0 then 'unpaid'
    when coalesce(payments.amount_paid, 0) < (invoices.total - invoices.tds_amount) then 'partial'
    else 'paid'
  end as payment_status
from public.invoices
left join (
  select invoice_id, sum(amount) as amount_paid
  from public.invoice_payments
  group by invoice_id
) as payments on payments.invoice_id = invoices.id;

create or replace function public.guard_invoice_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recorded numeric(14, 2);
  v_status_only boolean;
  v_due numeric(14, 2);
begin
  if current_setting('invoices.syncing_totals', true) = '1' then
    if tg_op = 'UPDATE' then
      select coalesce(sum(amount), 0)
      into v_recorded
      from public.invoice_payments
      where invoice_id = new.id;

      if new.total - new.tds_amount < v_recorded then
        raise exception 'Invoice balance due cannot fall below recorded payments';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
    new.subtotal = 0;
    new.cgst_amount = 0;
    new.sgst_amount = 0;
    new.igst_amount = 0;
    new.gst_amount = 0;
    new.tds_amount = 0;
    new.total = 0;
    new.amount_in_words = public.amount_in_words(0);
    if new.status <> 'draft' then
      raise exception 'Invoices must be created as drafts';
    end if;
    return new;
  end if;

  new.updated_by = auth.uid();
  new.subtotal = old.subtotal;
  new.cgst_amount = old.cgst_amount;
  new.sgst_amount = old.sgst_amount;
  new.igst_amount = old.igst_amount;
  new.gst_amount = old.gst_amount;
  new.total = old.total;
  new.amount_in_words = old.amount_in_words;

  if new.invoice_number is distinct from old.invoice_number then
    raise exception 'Invoice numbers cannot be changed';
  end if;

  if not public.invoice_number_matches_date(new.invoice_number, new.invoice_date) then
    raise exception 'Invoice date must stay in the period of the invoice number';
  end if;

  if new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.id is distinct from old.id
  then
    raise exception 'Invoice identity columns cannot be changed';
  end if;

  v_status_only :=
    new.status is distinct from old.status
    and public.is_active_member()
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
    and new.place_of_supply is not distinct from old.place_of_supply
    and new.supply_state is not distinct from old.supply_state
    and new.state_code is not distinct from old.state_code
    and new.client_gstin is not distinct from old.client_gstin
    and new.deal_reference is not distinct from old.deal_reference
    and new.tds_amount is not distinct from old.tds_amount;

  if v_status_only then
    if new.status = 'draft' then
      new.issued_at = null;
      new.paid_at = null;
      new.cancelled_at = null;
    elsif new.status = 'issued' then
      new.issued_at = coalesce(old.issued_at, now());
      new.paid_at = null;
      new.cancelled_at = null;
    elsif new.status = 'paid' then
      new.issued_at = coalesce(old.issued_at, now());
      new.paid_at = coalesce(old.paid_at, now());
      new.cancelled_at = null;
    elsif new.status = 'cancelled' then
      new.cancelled_at = coalesce(old.cancelled_at, now());
    end if;
    return new;
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
      or (
        current_setting('invoices.adjusting_payment', true) = '1'
        and old.status = 'paid'
        and new.status = 'issued'
      )
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

    v_due := new.total - new.tds_amount;
    if v_recorded < v_due then
      raise exception 'Invoice can be marked paid only when payments cover the balance due';
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
    and new.place_of_supply is not distinct from old.place_of_supply
    and new.supply_state is not distinct from old.supply_state
    and new.state_code is not distinct from old.state_code
    and new.client_gstin is not distinct from old.client_gstin
    and new.deal_reference is not distinct from old.deal_reference
    and new.tds_amount is not distinct from old.tds_amount
  then
    return new;
  end if;

  if current_setting('invoices.adjusting_payment', true) = '1'
    and old.status = 'paid'
    and new.status = 'issued'
    and new.paid_at is null
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
    and new.place_of_supply is not distinct from old.place_of_supply
    and new.supply_state is not distinct from old.supply_state
    and new.state_code is not distinct from old.state_code
    and new.client_gstin is not distinct from old.client_gstin
    and new.deal_reference is not distinct from old.deal_reference
    and new.tds_amount is not distinct from old.tds_amount
  then
    select coalesce(sum(amount), 0)
    into v_recorded
    from public.invoice_payments
    where invoice_id = new.id;

    if v_recorded < new.total - new.tds_amount then
      return new;
    end if;
  end if;

  raise exception 'Internal users can edit a draft, issue it, or mark an issued invoice as paid';
end;
$$;
