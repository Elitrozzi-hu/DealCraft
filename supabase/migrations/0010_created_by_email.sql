-- Attribution column for "deals analyzed per user". Only `deal_analysis` is
-- tagged (cost is deal-centric — attributed via llm_call.deal_id →
-- deal_analysis.created_by_email), NOT `llm_call`. Nullable + optional so
-- pre-existing rows stay null and existing callers/tests keep working; the BFF
-- always passes `session.user.email` on new cold-start/refresh writes.
alter table deal_analysis add column created_by_email text;

create index deal_analysis_created_by_email_idx on deal_analysis (created_by_email);

-- Recreate `refresh_deal_analysis` with the new optional attribution param so
-- the cold-start/refresh write path can stamp `created_by_email` atomically
-- inside the same advisory-locked transaction (mirrors the original in 0005).
-- `CREATE OR REPLACE` can't change a function's signature (Postgres would
-- create an overload and leave the 4-arg version orphaned, silently writing
-- null attribution for any 4-arg caller), so the old signature is dropped
-- explicitly first.
drop function if exists refresh_deal_analysis(uuid, jsonb, boolean, timestamptz);

create or replace function refresh_deal_analysis(
  p_deal_id uuid,
  p_result jsonb,
  p_cold_start boolean,
  p_generated_at timestamptz,
  p_created_by_email text
)
returns deal_analysis
language plpgsql
set search_path = public
as $$
declare
  v_new_row deal_analysis;
begin
  perform pg_advisory_xact_lock(hashtext(p_deal_id::text));

  update deal_analysis
  set is_latest = false
  where deal_id = p_deal_id
    and is_latest;

  insert into deal_analysis (deal_id, is_latest, cold_start, result, generated_at, created_by_email)
  values (p_deal_id, true, p_cold_start, p_result, p_generated_at, p_created_by_email)
  returning * into v_new_row;

  return v_new_row;
end;
$$;

