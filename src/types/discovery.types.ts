import type { MessageKey } from "@/i18n";

export const DISCOVERY_ROLES = [
  "hr-leader",
  "ops-leader",
  "it-leader",
  "c-suite",
] as const;

export type DiscoveryRole = (typeof DISCOVERY_ROLES)[number];

export type DiscoveryTriggerCategory = "context" | "pain";

export interface DiscoveryTriggerQuestion {
  id: string;
  category: DiscoveryTriggerCategory;
  textKey: MessageKey;
}

export interface DiscoveryRoleGroup {
  role: DiscoveryRole;
  labelKey: MessageKey;
  dotColor: string;
  questions: { id: string; textKey: MessageKey }[];
}

export const DISCOVERY_OBJECTION_IDS = [
  "sinPresupuesto",
  "corporativoDecide",
  "yaTienenHR",
  "noUsanCelular",
  "whatsappAlcanza",
  "cambiarSistemasComplejo",
  "sinTiempoImplementar",
  "noPuedenMoverNomina",
  "seVeGrande",
  "yaTienenSAP",
  "seguridadDatos",
  "slaSoporte",
  "guiaImplementacion",
  "integracionesAPI",
] as const;

export type DiscoveryObjectionId = (typeof DISCOVERY_OBJECTION_IDS)[number];

export interface DiscoveryObjection {
  id: DiscoveryObjectionId;
  starred: boolean;
  quoteKey: MessageKey;
  whatItMeansKey: MessageKey;
  responseKeys: MessageKey[];
  closingQuestionKey: MessageKey;
}
