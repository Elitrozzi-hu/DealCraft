import { Chip } from "@/components/ui";
import { useT } from "@/i18n";
import { DISCOVERY_TRIGGER_QUESTIONS } from "@/lib/discovery-playbook";

export function TriggerQuestionsTab() {
  const t = useT();

  return (
    <div>
      {DISCOVERY_TRIGGER_QUESTIONS.map((q, i) => (
        <div key={q.id} className="flex gap-2.5 border-b border-line py-2.5 last:border-b-0">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cold-soft text-[10.5px] font-bold text-cold">
            {i + 1}
          </div>
          <div>
            <div className="mb-1">
              <Chip tone={q.category === "context" ? "cold" : "risk"}>
                {t(
                  q.category === "context"
                    ? "discovery.pill.context"
                    : "discovery.pill.painPriority",
                )}
              </Chip>
            </div>
            <div className="text-[12.8px] leading-[1.45] text-ink">{t(q.textKey)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
