-- Removes the 'lusha-pain-extraction' value from `llm_task`. The Lusha provider
-- never actually used its LLM-generated pain points — `enrichmentResultSchema`
-- dropped the `painPoints` field when Pains was purged from the product
-- (see "remove Pains tab and purge pain data from the entire pipeline"), so the
-- call was silently discarding its own output. Removed the dead call itself in
-- `src/lib/enrichment/providers/lusha.ts`; this migration removes the now-unused
-- enum value to match. Postgres has no `ALTER TYPE ... DROP VALUE`, so the type
-- is rebuilt — safe here since `llm_call` has no rows using this value yet.
alter type llm_task rename to llm_task_old;

create type llm_task as enum (
  'company-research',
  'company-signals',
  'pre-call-brief',
  'chat'
);

alter table llm_call
  alter column task type llm_task using task::text::llm_task;

drop type llm_task_old;
