-- Single round-trip metrics aggregation for the admin dashboard. Returns one
-- JSONB object with camelCase keys (no snake→camel mapping layer in
-- supabase.ts). `STABLE` + read-only. Only `analysesOverTime` honors the time
-- params — every other aggregation is an all-time snapshot.
--
-- `p_trend_bucket` is one of 'day' | 'week' | 'month'. When `p_trend_since` is
-- null the trend spans all rows.
create or replace function get_admin_metrics(
  p_trend_since timestamptz,
  p_trend_bucket text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'totalDealsAnalyzed',
      (select count(distinct da.deal_id) from deal_analysis da where da.is_latest),
    'totalCost',
      (select coalesce(sum(l.cost_usd), 0) from llm_call l),
    'costPerDeal',
      jsonb_build_object(
        'avg',   (select coalesce(avg(t.cost), 0) from (
                    select sum(l.cost_usd) as cost from llm_call l group by l.deal_id
                  ) t),
        'min',   (select coalesce(min(t.cost), 0) from (
                    select sum(l.cost_usd) as cost from llm_call l group by l.deal_id
                  ) t),
        'max',   (select coalesce(max(t.cost), 0) from (
                    select sum(l.cost_usd) as cost from llm_call l group by l.deal_id
                  ) t),
        'topDeals',
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'dealId', x.deal_id,
              'name', x.name,
              'cost', x.cost
            ) order by x.cost desc)
            from (
              select l.deal_id,
                     d.resolved_name as name,
                     sum(l.cost_usd) as cost
              from llm_call l
              join deal d on d.id = l.deal_id
              where l.deal_id is not null
              group by l.deal_id, d.resolved_name
              order by cost desc
              limit 20
            ) x
          ), '[]'::jsonb)
      ),
    'costPerProvider',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'provider', t.provider,
          'cost', t.cost,
          'calls', t.calls
        ) order by t.cost desc)
        from (
          select l.provider,
                 sum(l.cost_usd) as cost,
                 count(*) as calls
          from llm_call l
          group by l.provider
          order by cost desc
        ) t
      ), '[]'::jsonb),
    'costByTask',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'task', t.task,
          'cost', t.cost,
          'calls', t.calls
        ) order by t.cost desc)
        from (
          select l.task::text as task,
                 sum(l.cost_usd) as cost,
                 count(*) as calls
          from llm_call l
          group by l.task
          order by cost desc
        ) t
      ), '[]'::jsonb),
    'topModels',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'model', t.model,
          'cost', t.cost,
          'calls', t.calls
        ) order by t.cost desc)
        from (
          select l.model,
                 sum(l.cost_usd) as cost,
                 count(*) as calls
          from llm_call l
          group by l.model
          order by cost desc
        ) t
      ), '[]'::jsonb),
    'dealsByUser',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'user', coalesce(t.created_by_email, 'unknown'),
          'deals', t.deals
        ) order by t.deals desc)
        from (
          select coalesce(da.created_by_email, 'unknown') as created_by_email,
                 count(distinct da.deal_id) as deals
          from deal_analysis da
          where da.is_latest
          group by da.created_by_email
          order by deals desc
        ) t
      ), '[]'::jsonb),
    'dealsByStage',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'stage', coalesce(t.stage, 'unknown'),
          'deals', t.deals
        ) order by t.deals desc)
        from (
          select coalesce(d.stage, 'unknown') as stage,
                 count(distinct da.deal_id) as deals
          from deal_analysis da
          join deal d on d.id = da.deal_id
          where da.is_latest
          group by d.stage
          order by deals desc
        ) t
      ), '[]'::jsonb),
    'dealsByRegion',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'region', coalesce(t.region, 'unknown'),
          'deals', t.deals
        ) order by t.deals desc)
        from (
          select coalesce(d.region, 'unknown') as region,
                 count(distinct da.deal_id) as deals
          from deal_analysis da
          join deal d on d.id = da.deal_id
          where da.is_latest
          group by d.region
          order by deals desc
        ) t
      ), '[]'::jsonb),
    'dealsByIndustry',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'industry', coalesce(t.industry, 'unknown'),
          'deals', t.deals
        ) order by t.deals desc)
        from (
          select coalesce(d.industry, 'unknown') as industry,
                 count(distinct da.deal_id) as deals
          from deal_analysis da
          join deal d on d.id = da.deal_id
          where da.is_latest
          group by d.industry
          order by deals desc
        ) t
      ), '[]'::jsonb),
    'analysesOverTime',
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket', to_char(t.b, CASE p_trend_bucket
                                   WHEN 'day'   THEN 'YYYY-MM-DD'
                                   WHEN 'week'  THEN 'IYYY-IW'
                                   WHEN 'month' THEN 'YYYY-MM'
                                   ELSE 'YYYY-MM'
                                 END),
          'count', t.cnt
        ) order by t.b)
        from (
          select
            date_trunc(coalesce(p_trend_bucket, 'month'), da.created_at) as b,
            count(*) as cnt
          from deal_analysis da
          where p_trend_since is null or da.created_at >= p_trend_since
          group by 1
          order by 1
        ) t
      ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
