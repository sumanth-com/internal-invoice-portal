-- Show legacy YYYYMM invoice numbers in the financial-year format.
-- 20260901 dated 28 September 2026 becomes IF/26-27/0901. The last four
-- digits stay unique, and issued IF/26-27/0001-style numbers are left alone.

do $$
declare
  legacy record;
  next_number text;
begin
  alter table public.invoices disable trigger invoices_guard_changes;

  for legacy in
    select id, invoice_number, invoice_date
    from public.invoices
    where invoice_number ~ '^[0-9]{8,}$'
    order by invoice_number
  loop
    next_number :=
      'IF/' || public.financial_year_label(legacy.invoice_date) || '/' || right(legacy.invoice_number, 4);

    if next_number is null or next_number !~ '^IF/[0-9]{2}-[0-9]{2}/[0-9]{4}$' then
      raise exception 'Invoice % cannot be shown in the financial-year format', legacy.invoice_number;
    end if;

    if exists (
      select 1
      from public.invoices
      where invoice_number = next_number
        and id <> legacy.id
    ) then
      raise exception 'Invoice number % is already in use', next_number;
    end if;

    update public.invoices
    set invoice_number = next_number
    where id = legacy.id;
  end loop;

  alter table public.invoices enable trigger invoices_guard_changes;
exception
  when others then
    alter table public.invoices enable trigger invoices_guard_changes;
    raise;
end $$;

comment on column public.invoices.invoice_number is
  'Database-assigned financial-year number, such as IF/26-27/0001. Legacy YYYYMM numbers are stored in that format too.';
