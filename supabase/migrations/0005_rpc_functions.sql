-- Transactional/guarded writes for `deal_analysis`. `supabase-js` has no
-- client-side transaction API, so the atomicity these mutations require (a
-- Postgres advisory lock spanning a read + write, shared across the "refresh
-- analysis" and "refresh signals/brief" call paths) can only be achieved inside
-- a single plpgsql function invoked via `supabase.rpc(...)`.

-- Flips the current `is_latest` row for `p_deal_id` to false and inserts the new
-- version, inside one advisory-locked transaction. Called on cold start (no prior
-- analysis) and on an explicit refresh (prior analysis exists).
create or replace function refresh_deal_analysis(
  p_deal_id uuid,
  p_result jsonb,
  p_cold_start boolean,
  p_generated_at timestamptz
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

  insert into deal_analysis (deal_id, is_latest, cold_start, result, generated_at)
  values (p_deal_id, true, p_cold_start, p_result, p_generated_at)
  returning * into v_new_row;

  return v_new_row;
end;
$$;

-- Guarded update of the `is_latest` analysis's signals. Takes the SAME advisory
-- lock as `refresh_deal_analysis` (keyed on the row's `deal_id`, looked up from
-- `p_id` first) so a concurrent "refresh análisis" and "refresh signals" are
-- serialized rather than racing inside the same transaction window. The
-- `where is_latest` guard additionally detects (rather than just prevents) a
-- stale write if the row stopped being latest between the lookup and the update.
-- Returns the number of rows affected — 0 means the write was skipped as stale.
create or replace function update_deal_analysis_signals(
  p_id uuid,
  p_signals jsonb,
  p_schema_version smallint
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_deal_id uuid;
  v_affected integer;
begin
  select deal_id into v_deal_id from deal_analysis where id = p_id;
  if v_deal_id is null then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_deal_id::text));

  update deal_analysis
  set signals = p_signals,
      signals_fetched_at = now(),
      signals_schema_version = p_schema_version
  where id = p_id
    and is_latest;

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$$;

-- Same pattern as update_deal_analysis_signals, for the pre-call brief.
create or replace function update_deal_analysis_pre_call_brief(
  p_id uuid,
  p_brief jsonb,
  p_schema_version smallint
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_deal_id uuid;
  v_affected integer;
begin
  select deal_id into v_deal_id from deal_analysis where id = p_id;
  if v_deal_id is null then
    return 0;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_deal_id::text));

  update deal_analysis
  set pre_call_brief = p_brief,
      pre_call_brief_generated_at = now(),
      pre_call_brief_schema_version = p_schema_version
  where id = p_id
    and is_latest;

  get diagnostics v_affected = row_count;
  return v_affected;
end;
$$;
