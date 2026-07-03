
create or replace function sync_deal_from_hubspot(
  p_hubspot_deal_id text,
  p_resolved_name text,
  p_domain text,
  p_region text,
  p_stage text,
  p_amount numeric,
  p_segment text,
  p_industry text,
  p_last_activity text,
  p_integraciones text,
  p_integration_modules text,
  p_modulos_de_interes text,
  p_pain_detected text
)
returns deal
language plpgsql
set search_path = public
as $$
declare
  v_row deal;
begin
  if p_hubspot_deal_id is not null then
    insert into deal (
      hubspot_deal_id, resolved_name, domain, region, stage, amount, segment,
      industry, last_activity, integraciones, integration_modules,
      modulos_de_interes, pain_detected, last_searched_at
    )
    values (
      p_hubspot_deal_id, p_resolved_name, p_domain, p_region, p_stage, p_amount,
      p_segment, p_industry, p_last_activity, p_integraciones,
      p_integration_modules, p_modulos_de_interes, p_pain_detected, now()
    )
    on conflict (hubspot_deal_id) where hubspot_deal_id is not null
    do update set
      resolved_name = excluded.resolved_name,
      domain = excluded.domain,
      region = excluded.region,
      stage = excluded.stage,
      amount = excluded.amount,
      segment = excluded.segment,
      industry = excluded.industry,
      last_activity = excluded.last_activity,
      integraciones = excluded.integraciones,
      integration_modules = excluded.integration_modules,
      modulos_de_interes = excluded.modulos_de_interes,
      pain_detected = excluded.pain_detected,
      last_searched_at = excluded.last_searched_at
    returning * into v_row;
  else
    insert into deal (
      resolved_name, domain, region, stage, amount, segment,
      industry, last_activity, integraciones, integration_modules,
      modulos_de_interes, pain_detected, last_searched_at
    )
    values (
      p_resolved_name, p_domain, p_region, p_stage, p_amount,
      p_segment, p_industry, p_last_activity, p_integraciones,
      p_integration_modules, p_modulos_de_interes, p_pain_detected, now()
    )
    on conflict (company_key) where hubspot_deal_id is null
    do update set
      resolved_name = excluded.resolved_name,
      domain = excluded.domain,
      region = excluded.region,
      stage = excluded.stage,
      amount = excluded.amount,
      segment = excluded.segment,
      industry = excluded.industry,
      last_activity = excluded.last_activity,
      integraciones = excluded.integraciones,
      integration_modules = excluded.integration_modules,
      modulos_de_interes = excluded.modulos_de_interes,
      pain_detected = excluded.pain_detected,
      last_searched_at = excluded.last_searched_at
    returning * into v_row;
  end if;

  return v_row;
end;
$$;
