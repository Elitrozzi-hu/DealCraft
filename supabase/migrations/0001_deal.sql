-- Shared trigger function to keep `updated_at` current on any UPDATE.
-- Reused by every table in this schema that carries created_at/updated_at.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- "Hub" table: one row per resolved company/deal. Cold-start rows are keyed by
-- `company_key` (derived from the resolved name); once a HubSpot deal exists,
-- `hubspot_deal_id` becomes the primary lookup key.
create table deal (
  id uuid primary key default gen_random_uuid(),

  hubspot_deal_id text,
  resolved_name text not null,
  company_key text generated always as (
    lower(regexp_replace(trim(resolved_name), '\s+', ' ', 'g'))
  ) stored,

  -- Flat SYNC columns, refreshed from HubSpot on every search (cold, reopen, or refresh).
  domain text,
  region text,
  stage text,
  amount numeric,
  segment text,
  industry text,
  last_activity text,
  integraciones text,
  integration_modules text,
  modulos_de_interes text,
  pain_detected text,

  last_searched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A deal can only be looked up by one of the two keys at a time: once it has a
-- HubSpot id, that's authoritative; the company_key uniqueness only guards the
-- pre-HubSpot cold-start window.
create unique index deal_hubspot_deal_id_key
  on deal (hubspot_deal_id)
  where hubspot_deal_id is not null;

create unique index deal_company_key_cold_start_key
  on deal (company_key)
  where hubspot_deal_id is null;

create trigger deal_set_updated_at
  before update on deal
  for each row
  execute function set_updated_at();

alter table deal enable row level security;
