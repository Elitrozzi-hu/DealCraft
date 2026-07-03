-- Published success-case content, seeded once from data/success-cases.json
-- (see scripts/seed-success-cases.ts) and kept in sync afterwards via the
-- Notion webhook (src/lib/server/success-case-sync.ts).
create table success_case (
  id text primary key,
  slug text unique not null,
  content jsonb not null,
  content_schema_version smallint not null default 1,
  synced_at timestamptz
);

alter table success_case enable row level security;
