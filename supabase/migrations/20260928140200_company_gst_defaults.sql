-- Company-level GST defaults for future drafts.
-- Existing invoices keep their own gst_enabled and gst_rate values.

alter table public.company_settings
  add column default_gst_enabled boolean not null default true,
  add column default_gst_rate numeric(5, 2) not null default 18,
  add constraint company_settings_default_gst_rate_range
    check (default_gst_rate >= 0 and default_gst_rate <= 100);

comment on column public.company_settings.default_gst_enabled is
  'Default GST toggle copied onto a new draft. Existing invoices are independent.';
comment on column public.company_settings.default_gst_rate is
  'Default GST percent for a new draft. Must be from 0 to 100.';
