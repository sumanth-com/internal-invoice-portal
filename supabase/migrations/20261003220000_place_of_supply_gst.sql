-- Place of supply decides intra-state versus interstate GST.
-- A filled state code no longer overrides a different place of supply.

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
    public.gst_state_code(p_place),
    public.gst_state_code(p_state_code),
    public.gst_state_code(p_supply_state)
  );
  v_company_name := public.normalize_state_name(p_company_state);
  v_supply_name := coalesce(
    public.normalize_state_name(p_place),
    public.normalize_state_name(p_supply_state)
  );

  if v_company_code is not null and v_supply_code is not null then
    return v_company_code = v_supply_code;
  end if;

  return v_company_name is not null
    and v_supply_name is not null
    and v_company_name = v_supply_name;
end;
$$;
