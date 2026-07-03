import type {
  DiscoveryObjection,
  DiscoveryRoleGroup,
  DiscoveryTriggerQuestion,
} from "@/types";

export const DISCOVERY_TRIGGER_QUESTIONS: DiscoveryTriggerQuestion[] = [
  { id: "discovery", category: "context", textKey: "discovery.trigger.discovery" },
  { id: "hr", category: "context", textKey: "discovery.trigger.hr" },
  { id: "tech", category: "context", textKey: "discovery.trigger.tech" },
  { id: "pain", category: "pain", textKey: "discovery.trigger.pain" },
  { id: "decision", category: "pain", textKey: "discovery.trigger.decision" },
];

export const DISCOVERY_ROLE_GROUPS: DiscoveryRoleGroup[] = [
  {
    role: "hr-leader",
    labelKey: "discovery.role.hrLeader.label",
    dotColor: "#0d9488",
    questions: [
      { id: "q1", textKey: "discovery.role.hrLeader.q1" },
      { id: "q2", textKey: "discovery.role.hrLeader.q2" },
      { id: "q3", textKey: "discovery.role.hrLeader.q3" },
    ],
  },
  {
    role: "ops-leader",
    labelKey: "discovery.role.opsLeader.label",
    dotColor: "#c026d3",
    questions: [
      { id: "q1", textKey: "discovery.role.opsLeader.q1" },
      { id: "q2", textKey: "discovery.role.opsLeader.q2" },
      { id: "q3", textKey: "discovery.role.opsLeader.q3" },
    ],
  },
  {
    role: "it-leader",
    labelKey: "discovery.role.itLeader.label",
    dotColor: "#475569",
    questions: [
      { id: "q1", textKey: "discovery.role.itLeader.q1" },
      { id: "q2", textKey: "discovery.role.itLeader.q2" },
      { id: "q3", textKey: "discovery.role.itLeader.q3" },
    ],
  },
  {
    role: "c-suite",
    labelKey: "discovery.role.cSuite.label",
    dotColor: "#b45309",
    questions: [
      { id: "q1", textKey: "discovery.role.cSuite.q1" },
      { id: "q2", textKey: "discovery.role.cSuite.q2" },
      { id: "q3", textKey: "discovery.role.cSuite.q3" },
    ],
  },
];

export const DISCOVERY_OBJECTIONS: DiscoveryObjection[] = [
  {
    id: "sinPresupuesto",
    starred: true,
    quoteKey: "discovery.objections.sinPresupuesto.quote",
    whatItMeansKey: "discovery.objections.sinPresupuesto.whatItMeans",
    responseKeys: [
      "discovery.objections.sinPresupuesto.response1",
      "discovery.objections.sinPresupuesto.response2",
    ],
    closingQuestionKey: "discovery.objections.sinPresupuesto.closing",
  },
  {
    id: "corporativoDecide",
    starred: true,
    quoteKey: "discovery.objections.corporativoDecide.quote",
    whatItMeansKey: "discovery.objections.corporativoDecide.whatItMeans",
    responseKeys: ["discovery.objections.corporativoDecide.response1"],
    closingQuestionKey: "discovery.objections.corporativoDecide.closing",
  },
  {
    id: "yaTienenHR",
    starred: true,
    quoteKey: "discovery.objections.yaTienenHR.quote",
    whatItMeansKey: "discovery.objections.yaTienenHR.whatItMeans",
    responseKeys: ["discovery.objections.yaTienenHR.response1"],
    closingQuestionKey: "discovery.objections.yaTienenHR.closing",
  },
  {
    id: "noUsanCelular",
    starred: true,
    quoteKey: "discovery.objections.noUsanCelular.quote",
    whatItMeansKey: "discovery.objections.noUsanCelular.whatItMeans",
    responseKeys: [
      "discovery.objections.noUsanCelular.response1",
      "discovery.objections.noUsanCelular.response2",
    ],
    closingQuestionKey: "discovery.objections.noUsanCelular.closing",
  },
  {
    id: "whatsappAlcanza",
    starred: true,
    quoteKey: "discovery.objections.whatsappAlcanza.quote",
    whatItMeansKey: "discovery.objections.whatsappAlcanza.whatItMeans",
    responseKeys: [
      "discovery.objections.whatsappAlcanza.response1",
      "discovery.objections.whatsappAlcanza.response2",
    ],
    closingQuestionKey: "discovery.objections.whatsappAlcanza.closing",
  },
  {
    id: "cambiarSistemasComplejo",
    starred: false,
    quoteKey: "discovery.objections.cambiarSistemasComplejo.quote",
    whatItMeansKey: "discovery.objections.cambiarSistemasComplejo.whatItMeans",
    responseKeys: [
      "discovery.objections.cambiarSistemasComplejo.response1",
      "discovery.objections.cambiarSistemasComplejo.response2",
    ],
    closingQuestionKey: "discovery.objections.cambiarSistemasComplejo.closing",
  },
  {
    id: "sinTiempoImplementar",
    starred: false,
    quoteKey: "discovery.objections.sinTiempoImplementar.quote",
    whatItMeansKey: "discovery.objections.sinTiempoImplementar.whatItMeans",
    responseKeys: ["discovery.objections.sinTiempoImplementar.response1"],
    closingQuestionKey: "discovery.objections.sinTiempoImplementar.closing",
  },
  {
    id: "noPuedenMoverNomina",
    starred: false,
    quoteKey: "discovery.objections.noPuedenMoverNomina.quote",
    whatItMeansKey: "discovery.objections.noPuedenMoverNomina.whatItMeans",
    responseKeys: ["discovery.objections.noPuedenMoverNomina.response1"],
    closingQuestionKey: "discovery.objections.noPuedenMoverNomina.closing",
  },
  {
    id: "seVeGrande",
    starred: false,
    quoteKey: "discovery.objections.seVeGrande.quote",
    whatItMeansKey: "discovery.objections.seVeGrande.whatItMeans",
    responseKeys: [
      "discovery.objections.seVeGrande.response1",
      "discovery.objections.seVeGrande.response2",
    ],
    closingQuestionKey: "discovery.objections.seVeGrande.closing",
  },
  {
    id: "yaTienenSAP",
    starred: false,
    quoteKey: "discovery.objections.yaTienenSAP.quote",
    whatItMeansKey: "discovery.objections.yaTienenSAP.whatItMeans",
    responseKeys: ["discovery.objections.yaTienenSAP.response1"],
    closingQuestionKey: "discovery.objections.yaTienenSAP.closing",
  },
  {
    id: "seguridadDatos",
    starred: false,
    quoteKey: "discovery.objections.seguridadDatos.quote",
    whatItMeansKey: "discovery.objections.seguridadDatos.whatItMeans",
    responseKeys: [
      "discovery.objections.seguridadDatos.response1",
      "discovery.objections.seguridadDatos.response2",
    ],
    closingQuestionKey: "discovery.objections.seguridadDatos.closing",
  },
  {
    id: "slaSoporte",
    starred: false,
    quoteKey: "discovery.objections.slaSoporte.quote",
    whatItMeansKey: "discovery.objections.slaSoporte.whatItMeans",
    responseKeys: ["discovery.objections.slaSoporte.response1"],
    closingQuestionKey: "discovery.objections.slaSoporte.closing",
  },
  {
    id: "guiaImplementacion",
    starred: false,
    quoteKey: "discovery.objections.guiaImplementacion.quote",
    whatItMeansKey: "discovery.objections.guiaImplementacion.whatItMeans",
    responseKeys: [
      "discovery.objections.guiaImplementacion.response1",
      "discovery.objections.guiaImplementacion.response2",
    ],
    closingQuestionKey: "discovery.objections.guiaImplementacion.closing",
  },
  {
    id: "integracionesAPI",
    starred: false,
    quoteKey: "discovery.objections.integracionesAPI.quote",
    whatItMeansKey: "discovery.objections.integracionesAPI.whatItMeans",
    responseKeys: ["discovery.objections.integracionesAPI.response1"],
    closingQuestionKey: "discovery.objections.integracionesAPI.closing",
  },
];
