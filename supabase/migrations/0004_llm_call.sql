-- Per-call cost/usage ledger for every LLM invocation the app makes, so cost can
-- be attributed back to a deal/analysis version. `call_id` is generated at the
-- call-site (before the LLM call runs) so a retried request dedupes cleanly via
-- `ON CONFLICT (call_id) DO NOTHING` instead of double-counting.
create type llm_task as enum (
  'company-research',
  'company-signals',
  'pre-call-brief',
  'chat',
  'lusha-pain-extraction'
);

create table llm_call (
  id uuid primary key default gen_random_uuid(),
  call_id uuid unique not null,

  deal_id uuid references deal(id) on delete set null,
  deal_analysis_id uuid references deal_analysis(id) on delete set null,

  task llm_task not null,
  provider text not null,
  model text not null,

  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  cost_usd numeric(10, 6),

  created_at timestamptz not null default now()
);

create index llm_call_deal_id_idx on llm_call (deal_id);
create index llm_call_deal_analysis_id_idx on llm_call (deal_analysis_id);

alter table llm_call enable row level security;
