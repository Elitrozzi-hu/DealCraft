-- Versioned analysis snapshots for a `deal`. Only one row per `deal_id` may have
-- `is_latest = true` at a time; that flip + insert happens atomically inside the
-- `refresh_deal_analysis` RPC (migration 0005), never via two separate client calls.
create table deal_analysis (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deal(id) on delete restrict,

  is_latest boolean not null,
  cold_start boolean not null,

  result jsonb not null,
  result_schema_version smallint not null default 1,

  signals jsonb,
  signals_fetched_at timestamptz,
  signals_schema_version smallint,

  pre_call_brief jsonb,
  pre_call_brief_generated_at timestamptz,
  pre_call_brief_schema_version smallint,

  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index deal_analysis_one_latest_per_deal
  on deal_analysis (deal_id)
  where is_latest;

create index deal_analysis_deal_id_idx on deal_analysis (deal_id);

create trigger deal_analysis_set_updated_at
  before update on deal_analysis
  for each row
  execute function set_updated_at();

alter table deal_analysis enable row level security;
