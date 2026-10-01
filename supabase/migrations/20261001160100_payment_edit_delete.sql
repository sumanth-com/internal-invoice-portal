-- Payments can be corrected or removed by an active member.
-- Amount, date, mode, and reference rules stay the same.
-- A payment still cannot move to another invoice, and the recorded total
-- still cannot exceed the invoice total.
-- If payments no longer cover a paid invoice, it returns to issued.

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

  select status, total
  into v_status, v_total
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

  if v_recorded + new.amount > v_total then
    raise exception 'Payments cannot exceed the invoice total';
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
  v_total numeric(14, 2);
  v_recorded numeric(14, 2);
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);

  select status, total
  into v_status, v_total
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

  if v_status = 'issued' and v_recorded >= v_total then
    update public.invoices
    set status = 'paid'
    where id = v_invoice_id
      and status = 'issued';
  elsif v_status = 'paid' and v_recorded < v_total then
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

drop trigger if exists invoice_payments_mark_paid on public.invoice_payments;

create trigger invoice_payments_mark_paid
after insert or update or delete on public.invoice_payments
for each row
execute function public.mark_invoice_paid_when_covered();

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
  then
    select coalesce(sum(amount), 0)
    into v_recorded
    from public.invoice_payments
    where invoice_id = new.id;

    if v_recorded < new.total then
      return new;
    end if;
  end if;

  raise exception 'Internal users can edit a draft, issue it, or mark an issued invoice as paid';
end;
$$;

create or replace function public.audit_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.invoice_payments;
  v_action public.invoice_audit_action;
begin
  if tg_op = 'DELETE' then
    v_row := old;
    v_action := 'payment_deleted';
  elsif tg_op = 'UPDATE' then
    v_row := new;
    v_action := 'payment_updated';
  else
    v_row := new;
    v_action := 'payment_recorded';
  end if;

  insert into public.invoice_audit_log (invoice_id, actor_id, action, metadata)
  values (
    v_row.invoice_id,
    auth.uid(),
    v_action,
    jsonb_build_object(
      'payment_id', v_row.id,
      'amount', v_row.amount,
      'payment_date', v_row.payment_date,
      'payment_mode', v_row.payment_mode,
      'reference', v_row.reference
    )
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_payments_audit on public.invoice_payments;

create trigger invoice_payments_audit
after insert or update or delete on public.invoice_payments
for each row
execute function public.audit_invoice_payment();

grant update, delete on table public.invoice_payments to authenticated;

create policy invoice_payments_update_members
on public.invoice_payments
for update
to authenticated
using (public.is_active_member())
with check (public.is_active_member());

create policy invoice_payments_delete_members
on public.invoice_payments
for delete
to authenticated
using (public.is_active_member());

comment on table public.invoice_payments is
  'Payments for issued invoices. Active members can record, correct, or remove them. A covered total marks the invoice paid.';
