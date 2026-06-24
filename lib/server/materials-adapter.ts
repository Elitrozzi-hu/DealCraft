import "server-only";

import type {
  Material,
  MaterialBlock,
  MaterialsRequest,
  MaterialsResult,
} from "@/types";
import { getProviderConfig } from "./config";

/**
 * Build the 5 sales artifacts for a deal.
 *
 * TODO: the final copy comes from the LLM step via the configured provider —
 * this returns structured stubs (provenance-gated) so the UI renders the shape.
 * Gating rule (from the PoC): only `validated` pains enter client-facing
 * materials.
 */
export async function generateMaterials(
  req: MaterialsRequest,
): Promise<MaterialsResult> {
  void getProviderConfig(); // seam: LLM creds resolved server-side only

  const { companyName, pains, stakeholders, includePricing, mrr, mrrConfirmed } =
    req;
  const company = companyName.split(" — ")[0];
  const valid = pains.filter((p) => p.validated);
  const modules = [
    ...new Set(pains.filter((p) => p.module).map((p) => p.module as string)),
  ];
  const champ = stakeholders.find((s) => s.role === "Champion");
  const champName = champ?.name?.split(" ")[0] ?? "el champion";
  const opener = `${company} tiene ~485 empleados con ≈82% de workforce deskless, en un sector donde la experiencia del frontline impacta directo en la operación. Clientes similares redujeron rotación y tiempo de HR Ops +40%. ¿Tiene sentido explorar cómo se vería para ustedes?`;

  const presentation: MaterialBlock[] = [
    {
      type: "paragraph",
      text: "Para un workforce ≈82% deskless, donde el frontline hoy queda fuera de la comunicación corporativa.",
    },
  ];

  const proposal: MaterialBlock[] = [
    {
      type: "gate",
      ok: valid.length > 0,
      message: "Client-facing · gated: solo dolores validados.",
    },
    { type: "heading", text: "Propuesta comercial" },
    { type: "subheading", text: "Alcance" },
    ...(valid.length
      ? valid.map(
          (p): MaterialBlock => ({ type: "item", text: p.module ?? p.label }),
        )
      : ([
          { type: "empty", text: "Validá dolores para definir el alcance." },
        ] satisfies MaterialBlock[])),
    { type: "subheading", text: "Inversión" },
    { type: "pricing", mrr, confirmed: mrrConfirmed, hidden: !includePricing },
  ];

  const preMeeting: MaterialBlock[] = [
    { type: "heading", text: "Email pre-reunión" },
    {
      type: "paragraph",
      text: `Para ${champName}, antes de la discovery. Objetivo: confirmar agenda y bajar fricción.`,
    },
    { type: "subheading", text: "Asunto" },
    {
      type: "item",
      text: `Ideas para que la comunicación llegue al frontline de ${company}`,
    },
    { type: "subheading", text: "Cuerpo" },
    {
      type: "paragraph",
      text: `Hola ${champName}, gracias por la charla. Antes de la reunión te comparto 2–3 ideas concretas de cómo equipos parecidos lograron que los comunicados lleguen al personal deskless con acuse de lectura. La idea es que la reunión sea bien aplicada a ${company}. ¿Te queda cómodo el día/hora propuestos?`,
    },
  ];

  const postMeeting: MaterialBlock[] = [
    { type: "heading", text: "Recap post-reunión" },
    {
      type: "paragraph",
      text: "Resumen + próximos pasos. Al enviarlo se dispara el re-análisis.",
    },
    { type: "subheading", text: "Dolores confirmados" },
    ...(valid.length
      ? valid.map(
          (p): MaterialBlock => ({ type: "item", text: `· ${p.label}` }),
        )
      : ([
          { type: "empty", text: "Validá dolores para poblar el recap." },
        ] satisfies MaterialBlock[])),
    { type: "subheading", text: "Próximos pasos" },
    { type: "item", text: "· Sumar al decisor económico (CFO / MD)" },
    {
      type: "item",
      text: `· Demo con Operaciones sobre ${modules[0] ?? "el módulo dominante"}`,
    },
    { type: "item", text: "· Fijar fecha tentativa de propuesta" },
  ];

  const playbook: MaterialBlock[] = [
    { type: "heading", text: `Playbook de venta — ${company}` },
    { type: "paragraph", text: "Guía interna para el AE. No client-facing." },
    { type: "subheading", text: "Opener (mensaje de apertura)" },
    { type: "paragraph", text: `“${opener}”` },
    { type: "subheading", text: "Preguntas de discovery" },
    {
      type: "item",
      text: "· ¿Cómo saben hoy si un comunicado llegó a un chofer / operario?",
    },
    { type: "item", text: "· ¿Quién es dueño de la adopción del frontline?" },
    { type: "item", text: "· ¿Qué intentaron antes y por qué no funcionó?" },
    { type: "subheading", text: "Manejo de objeciones" },
    {
      type: "item",
      text: "· “Ya usamos WhatsApp” → informal, sin acuse ni control; riesgo de compliance.",
    },
    {
      type: "item",
      text: "· “No hay presupuesto” → ROI por rotación y HR Ops; entrar por el entry wedge.",
    },
    { type: "subheading", text: "Insight de comparables" },
    {
      type: "item",
      text: "Los deals similares se ganaron entrando por Comunicación; los perdidos cayeron por falta de champion económico o por precio.",
    },
  ];

  const materials: Material[] = [
    {
      key: "pres",
      title: "Presentación",
      sub: "client-facing · gated",
      clientFacing: true,
      tag: {
        label: valid.length ? "gated" : "sin data validada",
        tone: valid.length ? "ok" : "inferred",
      },
      blocks: presentation,
    },
    {
      key: "prop",
      title: "Propuesta",
      sub: "client-facing · pricing gated",
      clientFacing: true,
      tag: {
        label: mrrConfirmed ? "pricing confirmado" : "pricing estimado",
        tone: mrrConfirmed ? "ok" : "inferred",
      },
      blocks: proposal,
    },
    {
      key: "pre",
      title: "Email pre-reunión",
      sub: "comunicación · antes de la call",
      clientFacing: false,
      tag: { label: "comms", tone: "info" },
      blocks: preMeeting,
    },
    {
      key: "post",
      title: "Recap post-reunión",
      sub: "comunicación · dispara re-análisis",
      clientFacing: false,
      tag: { label: "comms", tone: "info" },
      blocks: postMeeting,
    },
    {
      key: "play",
      title: "Playbook de venta",
      sub: "interno · no client-facing",
      clientFacing: false,
      tag: { label: "interno", tone: "cold" },
      blocks: playbook,
    },
  ];

  return { materials };
}
