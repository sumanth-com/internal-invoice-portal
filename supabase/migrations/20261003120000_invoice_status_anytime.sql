-- A status-only update from the invoice list may move an invoice between
-- draft, issued, paid, and cancelled. Payment rows are left as they are.

create or replace function public.guard_invoice_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recorded numeric(14, 2);
  v_status_only boolean;
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
    and new.gst_rate is not distinct from old.gst_rate;

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

    insert into public.invoice_audit_log (invoice_id, actor_id, action, metadata)
    values (
      new.id,
      auth.uid(),
      coalesce(v_action, 'updated'::public.invoice_audit_action),
      jsonb_build_object('from_status', old.status, 'to_status', new.status)
    );
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
