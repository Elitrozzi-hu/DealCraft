-- `getSuccessCasesByIndustry` used to fetch every `success_case` row and filter
-- in-memory (a straight port of the old `fs`-based reader's substring match).
-- With persistence in place there's no reason to pull the whole table for a
-- filtered read — push the same bidirectional, case-insensitive substring
-- match into the query itself.
create or replace function success_cases_by_industry(p_industry text)
returns setof success_case
language sql
stable
set search_path = public
as $$
  select *
  from success_case
  where
    (content->'es'->>'industry') ilike '%' || p_industry || '%'
    or p_industry ilike '%' || (content->'es'->>'industry') || '%'
    or (content->'en'->>'industry') ilike '%' || p_industry || '%'
    or p_industry ilike '%' || (content->'en'->>'industry') || '%'
$$;
