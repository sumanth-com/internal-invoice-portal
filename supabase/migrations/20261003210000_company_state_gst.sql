-- Recalculate GST from the company state in Settings and the invoice GST rate.
-- Intra-state supply splits the rate into CGST and SGST. Interstate supply uses IGST.
-- Existing invoice rows are not updated by this migration.

create or replace function public.normalize_state_name(p_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(btrim(coalesce(p_value, ''))), '\s+', ' ', 'g'), '');
$$;

create or replace function public.gst_state_code(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_text text := upper(btrim(coalesce(p_value, '')));
  v_name text := public.normalize_state_name(p_value);
begin
  if v_text ~ '^[0-9]{2}$' then
    return v_text;
  end if;

  if v_text ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then
    return left(v_text, 2);
  end if;

  return case v_name
    when 'jammu and kashmir' then '01'
    when 'himachal pradesh' then '02'
    when 'punjab' then '03'
    when 'chandigarh' then '04'
    when 'uttarakhand' then '05'
    when 'haryana' then '06'
    when 'delhi' then '07'
    when 'rajasthan' then '08'
    when 'uttar pradesh' then '09'
    when 'bihar' then '10'
    when 'sikkim' then '11'
    when 'arunachal pradesh' then '12'
    when 'nagaland' then '13'
    when 'manipur' then '14'
    when 'mizoram' then '15'
    when 'tripura' then '16'
    when 'meghalaya' then '17'
    when 'assam' then '18'
    when 'west bengal' then '19'
    when 'jharkhand' then '20'
    when 'odisha' then '21'
    when 'chhattisgarh' then '22'
    when 'madhya pradesh' then '23'
    when 'gujarat' then '24'
    when 'dadra and nagar haveli and daman and diu' then '26'
    when 'maharashtra' then '27'
    when 'andhra pradesh' then '37'
    when 'karnataka' then '29'
    when 'goa' then '30'
    when 'lakshadweep' then '31'
    when 'kerala' then '32'
    when 'tamil nadu' then '33'
    when 'puducherry' then '34'
    when 'andaman and nicobar islands' then '35'
    when 'telangana' then '36'
    when 'ladakh' then '38'
    else null
  end;
end;
$$;

create or replace function public.supply_is_intrastate(
  p_company_state text,
  p_company_gstin text,
  p_supply_state text,
  p_state_code text,
  p_place text
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_company_code text;
  v_supply_code text;
  v_company_name text;
  v_supply_name text;
begin
  v_company_code := coalesce(
    public.gst_state_code(p_company_gstin),
    public.gst_state_code(p_company_state)
  );
  v_supply_code := coalesce(
    public.gst_state_code(p_state_code),
    public.gst_state_code(p_supply_state),
    public.gst_state_code(p_place)
  );
  v_company_name := public.normalize_state_name(p_company_state);
  v_supply_name := coalesce(
    public.normalize_state_name(p_supply_state),
    public.normalize_state_name(p_place)
  );

  if v_company_code is not null and v_supply_code is not null then
    return v_company_code = v_supply_code;
  end if;

  return v_company_name is not null
    and v_supply_name is not null
    and v_company_name = v_supply_name;
end;
$$;

revoke all on function public.normalize_state_name(text) from public, anon;
revoke all on function public.gst_state_code(text) from public, anon;
revoke all on function public.supply_is_intrastate(text, text, text, text, text) from public, anon;
grant execute on function public.normalize_state_name(text) to authenticated;
grant execute on function public.gst_state_code(text) to authenticated;
grant execute on function public.supply_is_intrastate(text, text, text, text, text) to authenticated;

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
  v_gst_rate numeric(5, 2);
  v_tds numeric(14, 2);
  v_state text;
  v_code text;
  v_place text;
  v_company_state text;
  v_company_gstin text;
  v_intra boolean;
begin
  if current_setting('invoices.deleting_id', true) = p_invoice_id::text then
    return;
  end if;

  select gst_enabled, gst_rate, tds_amount, supply_state, state_code, place_of_supply
  into v_gst_enabled, v_gst_rate, v_tds, v_state, v_code, v_place
  from public.invoices
  where id = p_invoice_id;

  if not found then
    return;
  end if;

  select state, gstin
  into v_company_state, v_company_gstin
  from public.company_settings
  where id = true;

  select coalesce(sum(line_subtotal), 0)
  into v_subtotal
  from public.invoice_items
  where invoice_id = p_invoice_id;

  v_intra := public.supply_is_intrastate(
    v_company_state,
    v_company_gstin,
    v_state,
    v_code,
    v_place
  );

  if v_gst_enabled and v_intra then
    v_gst_amount := round(v_subtotal * v_gst_rate / 100, 2);
    v_cgst := round(v_subtotal * v_gst_rate / 200, 2);
    v_sgst := v_gst_amount - v_cgst;
    v_igst := 0;
  elsif v_gst_enabled then
    v_cgst := 0;
    v_sgst := 0;
    v_igst := round(v_subtotal * v_gst_rate / 100, 2);
    v_gst_amount := v_igst;
  else
    v_cgst := 0;
    v_sgst := 0;
    v_igst := 0;
    v_gst_amount := 0;
  end if;

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
    total = v_total,
    amount_in_words = public.amount_in_words(v_total - v_tds)
  where id = p_invoice_id;

  perform set_config('invoices.syncing_totals', '0', true);
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
    or new.place_of_supply is distinct from old.place_of_supply
    or new.supply_state is distinct from old.supply_state
    or new.state_code is distinct from old.state_code
    or new.client_gstin is distinct from old.client_gstin
    or new.deal_reference is distinct from old.deal_reference
    or new.tds_amount is distinct from old.tds_amount
    or new.subtotal is distinct from old.subtotal
    or new.cgst_amount is distinct from old.cgst_amount
    or new.sgst_amount is distinct from old.sgst_amount
    or new.igst_amount is distinct from old.igst_amount
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
