-- Invoice line items.
-- Each line stores HSN, description, quantity, and rate.
-- Line subtotal is quantity times rate.
-- Invoice subtotal, GST amount, total, and amount in words are recalculated
-- from the lines and the invoice GST settings.
-- Line items can be changed only while the invoice is a draft.
-- An issued or paid invoice must keep at least one line.

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position integer not null,
  hsn text,
  description text not null,
  quantity numeric(12, 3) not null,
  rate numeric(14, 2) not null,
  line_subtotal numeric(14, 2) generated always as (round(quantity * rate, 2)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_items_position_unique unique (invoice_id, position),
  constraint invoice_items_position_positive check (position > 0),
  constraint invoice_items_description_not_blank check (length(btrim(description)) > 0),
  constraint invoice_items_quantity_positive check (quantity > 0),
  constraint invoice_items_rate_nonnegative check (rate >= 0)
);

create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

create trigger invoice_items_set_updated_at
before update on public.invoice_items
for each row
execute function public.set_updated_at();

create or replace function public.guard_invoice_item_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_status public.invoice_status;
  parent_id uuid;
begin
  parent_id := coalesce(new.invoice_id, old.invoice_id);

  select status
  into parent_status
  from public.invoices
  where id = parent_id;

  if parent_status is null then
    if tg_op = 'DELETE'
      and current_setting('invoices.deleting_id', true) = parent_id::text
    then
      return old;
    end if;
    raise exception 'Invoice does not exist';
  end if;

  if tg_op = 'UPDATE' and new.invoice_id is distinct from old.invoice_id then
    raise exception 'An invoice item cannot be moved to another invoice';
  end if;

  if parent_status <> 'draft' then
    if tg_op = 'DELETE'
      and parent_status in ('issued', 'paid')
      and (
        select count(*)
        from public.invoice_items
        where invoice_id = parent_id
      ) <= 1
    then
      raise exception 'An issued invoice must keep at least one line item';
    end if;
    raise exception 'Invoice items can only be changed while the invoice is a draft';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger invoice_items_guard_changes
before insert or update or delete on public.invoice_items
for each row
execute function public.guard_invoice_item_changes();

create or replace function public.recalculate_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(14, 2);
  v_gst_amount numeric(14, 2);
  v_total numeric(14, 2);
  v_gst_enabled boolean;
  v_gst_rate numeric(5, 2);
begin
  if current_setting('invoices.deleting_id', true) = p_invoice_id::text then
    return;
  end if;

  select gst_enabled, gst_rate
  into v_gst_enabled, v_gst_rate
  from public.invoices
  where id = p_invoice_id;

  if not found then
    return;
  end if;

  select coalesce(sum(line_subtotal), 0)
  into v_subtotal
  from public.invoice_items
  where invoice_id = p_invoice_id;

  if v_gst_enabled then
    v_gst_amount := round(v_subtotal * v_gst_rate / 100, 2);
  else
    v_gst_amount := 0;
  end if;

  v_total := v_subtotal + v_gst_amount;

  perform set_config('invoices.syncing_totals', '1', true);

  update public.invoices
  set
    subtotal = v_subtotal,
    gst_amount = v_gst_amount,
    total = v_total,
    amount_in_words = public.amount_in_words(v_total)
  where id = p_invoice_id;

  perform set_config('invoices.syncing_totals', '0', true);
end;
$$;

create or replace function public.sync_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end;
$$;

create trigger invoice_items_sync_totals
after insert or update or delete on public.invoice_items
for each row
execute function public.sync_invoice_totals();

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
  then
    perform public.recalculate_invoice(new.id);
  end if;

  return null;
end;
$$;

create trigger invoices_recalculate_on_gst_change
after update of gst_enabled, gst_rate on public.invoices
for each row
execute function public.recalculate_invoice_after_gst_change();

revoke all on function public.recalculate_invoice(uuid) from public, anon;
grant execute on function public.recalculate_invoice(uuid) to authenticated;

alter table public.invoice_items enable row level security;

revoke all on table public.invoice_items from anon, public;
grant select, insert, update, delete on table public.invoice_items to authenticated;

create policy invoice_items_select_members
on public.invoice_items
for select
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
  )
);

create policy invoice_items_insert_draft_or_admin
on public.invoice_items
for insert
to authenticated
with check (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.status = 'draft'
  )
);

create policy invoice_items_update_draft_or_admin
on public.invoice_items
for update
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.status = 'draft'
  )
)
with check (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.status = 'draft'
  )
);

create policy invoice_items_delete_draft_or_admin
on public.invoice_items
for delete
to authenticated
using (
  public.is_active_member()
  and exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.status = 'draft'
  )
);

comment on column public.invoice_items.hsn is
  'HSN or SAC code for the line.';
comment on column public.invoice_items.description is
  'Item or service description.';
comment on column public.invoice_items.rate is
  'Rate per unit.';
comment on table public.invoice_items is
  'Invoice lines. line_subtotal is quantity times rate.';
