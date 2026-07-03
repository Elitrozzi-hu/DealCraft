import { useState, type ReactNode } from "react";
import { Chip, LinkButton } from "@/components/ui";
import { useT } from "@/i18n";
import { DISCOVERY_OBJECTIONS } from "@/lib/discovery-playbook";
import type { DiscoveryObjection, DiscoveryObjectionId } from "@/types";
import { AccordionItem } from "./accordion-item";

const ICON_PROPS = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "flex-shrink-0 text-cold",
} as const;

const OBJECTION_ICON_PATHS = {
  sinPresupuesto: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.2a2.3 2.3 0 0 1 2.5-1.7c1.3 0 2.3.8 2.3 1.9 0 2.6-4.8 1.7-4.8 4.3 0 1.1 1 1.9 2.3 1.9a2.3 2.3 0 0 0 2.5-1.7" />
    </svg>
  ),
  corporativoDecide: (
    <svg {...ICON_PROPS}>
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <rect x="3" y="17" width="6" height="4" rx="1" />
      <rect x="15" y="17" width="6" height="4" rx="1" />
      <path d="M12 7v4M12 11H6v6M12 11h6v6" />
    </svg>
  ),
  yaTienenHR: (
    <svg {...ICON_PROPS}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 12v-2a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 12v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  noUsanCelular: (
    <svg {...ICON_PROPS}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  whatsappAlcanza: (
    <svg {...ICON_PROPS}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  cambiarSistemasComplejo: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  sinTiempoImplementar: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  noPuedenMoverNomina: (
    <svg {...ICON_PROPS}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  seVeGrande: (
    <svg {...ICON_PROPS}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  ),
  yaTienenSAP: (
    <svg {...ICON_PROPS}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  ),
  seguridadDatos: (
    <svg {...ICON_PROPS}>
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
    </svg>
  ),
  slaSoporte: (
    <svg {...ICON_PROPS}>
      <path d="M3 12a9 9 0 0 1 18 0" />
      <path d="M21 15v2a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
      <path d="M3 15v2a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  ),
  guiaImplementacion: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.2 7.8 14.4 14.4 7.8 16.2 9.6 9.6" />
    </svg>
  ),
  integracionesAPI: (
    <svg {...ICON_PROPS}>
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 6" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-1.41 1.41a5 5 0 0 0 7.07 7.07L14 18" />
    </svg>
  ),
} satisfies Record<DiscoveryObjectionId, ReactNode>;

function ObjectionIcon({ id }: { id: DiscoveryObjectionId }) {
  return OBJECTION_ICON_PATHS[id];
}

export function ObjectionsTab() {
  const t = useT();
  const [showAll, setShowAll] = useState(false);

  const starred = DISCOVERY_OBJECTIONS.filter((o) => o.starred);
  const rest = DISCOVERY_OBJECTIONS.filter((o) => !o.starred);

  const renderObjection = (o: DiscoveryObjection) => (
    <AccordionItem
      key={o.id}
      title={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <ObjectionIcon id={o.id} />
          “{t(o.quoteKey)}”
          {o.starred && <Chip tone="inferred">{t("discovery.objections.starredBadge")}</Chip>}
        </span>
      }
    >
      <div className="flex flex-col gap-2.5 pl-4">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-cold">
            {t("discovery.objections.whatItMeansLabel")}
          </div>
          <div className="text-[12.8px] leading-[1.45] text-ink">
            {t(o.whatItMeansKey)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-cold">
            {t("discovery.objections.respondWithLabel")}
          </div>
          <div className="flex flex-col gap-1.5">
            {o.responseKeys.map((key) => (
              <div key={key} className="text-[12.8px] leading-[1.45] text-ink">
                {t(key)}
              </div>
            ))}
          </div>
        </div>
        <div className="text-[12.8px] font-semibold leading-[1.45] text-violet">
          {t(o.closingQuestionKey)}
        </div>
      </div>
    </AccordionItem>
  );

  return (
    <div>
      <div>{starred.map(renderObjection)}</div>

      {!showAll && (
        <div className="pt-2.5">
          <LinkButton onClick={() => setShowAll(true)}>
            {t("discovery.objections.verTodas")}
          </LinkButton>
        </div>
      )}

      {showAll && <div>{rest.map(renderObjection)}</div>}
    </div>
  );
}
