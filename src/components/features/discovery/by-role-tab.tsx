import { useState } from "react";
import type { DiscoveryRole } from "@/types";
import { useT } from "@/i18n";
import { DISCOVERY_ROLE_GROUPS } from "@/lib/discovery-playbook";
import { AccordionItem } from "./accordion-item";

export function ByRoleTab() {
  const t = useT();
  const [activeRole, setActiveRole] = useState<DiscoveryRole | "all">("all");

  const groups = DISCOVERY_ROLE_GROUPS.filter(
    (g) => activeRole === "all" || g.role === activeRole,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveRole("all")}
          className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 ${
            activeRole === "all"
              ? "border-violet bg-violet text-white"
              : "border-line bg-panel text-cold hover:bg-cold-soft"
          }`}
        >
          {t("discovery.role.all")}
        </button>
        {DISCOVERY_ROLE_GROUPS.map((g) => (
          <button
            key={g.role}
            type="button"
            onClick={() => setActiveRole(g.role)}
            className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 ${
              activeRole === g.role
                ? "border-violet bg-violet text-white"
                : "border-line bg-panel text-cold hover:bg-cold-soft"
            }`}
          >
            {t(g.labelKey)}
          </button>
        ))}
      </div>

      <div>
        {groups.map((g) => (
          <AccordionItem
            key={`${g.role}-${activeRole}`}
            defaultOpen={activeRole !== "all"}
            title={
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: g.dotColor }}
                />
                {t(g.labelKey)}
              </span>
            }
          >
            <div className="flex flex-col gap-2.5 pl-4">
              {g.questions.map((q, i) => (
                <div key={q.id} className="flex gap-2">
                  <span className="mt-px flex-shrink-0 text-[11px] font-bold text-cold">
                    {i + 1}.
                  </span>
                  <div className="text-[12.8px] leading-[1.45] text-ink">
                    {t(q.textKey)}
                  </div>
                </div>
              ))}
            </div>
          </AccordionItem>
        ))}
      </div>
    </div>
  );
}
