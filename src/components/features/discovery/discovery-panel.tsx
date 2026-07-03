import { useState } from "react";
import { Card, Chip } from "@/components/ui";
import { useT, type MessageKey } from "@/i18n";
import { ByRoleTab } from "./by-role-tab";
import { ObjectionsTab } from "./objections-tab";
import { TriggerQuestionsTab } from "./trigger-questions-tab";

type DiscoverySubTab = "trigger" | "byRole" | "objections";

const SUB_TABS: [DiscoverySubTab, MessageKey][] = [
  ["trigger", "discovery.subtab.trigger"],
  ["byRole", "discovery.subtab.byRole"],
  ["objections", "discovery.subtab.objections"],
];

export function DiscoveryPanel() {
  const t = useT();
  const [sub, setSub] = useState<DiscoverySubTab>("trigger");

  return (
    <Card
      pad="md"
      title={t("discovery.header.title")}
      right={<Chip tone="violet">{t("discovery.header.badge")}</Chip>}
      sub={t("discovery.header.sub")}
    >
      <div role="tablist" className="mb-3 flex gap-4 border-b border-line">
        {SUB_TABS.map(([key, labelKey]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={sub === key}
            onClick={() => setSub(key)}
            className={`-mb-px border-b-2 pb-2 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 ${
              sub === key
                ? "border-violet text-ink"
                : "border-transparent text-cold hover:text-ink"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {sub === "trigger" && <TriggerQuestionsTab />}
      {sub === "byRole" && <ByRoleTab />}
      {sub === "objections" && <ObjectionsTab />}
    </Card>
  );
}
