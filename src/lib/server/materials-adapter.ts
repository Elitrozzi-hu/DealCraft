import type {
  Material,
  MaterialBlock,
  MaterialsRequest,
  MaterialsResult,
} from "../../types/index.js";
import { getProviderConfig } from "./config.js";

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

  const { companyName, stakeholders } = req;
  const company = companyName.split(" — ")[0];
  const champ = stakeholders.find((s) => s.role === "Champion");
  const champName = champ?.name?.split(" ")[0] ?? "el champion";

  const presentation: MaterialBlock[] = [
    {
      type: "paragraph",
      text: "Para un workforce ≈82% deskless, donde el frontline hoy queda fuera de la comunicación corporativa.",
    },
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
    { type: "subheading", text: "Próximos pasos" },
    { type: "item", text: "· Sumar al decisor económico (CFO / MD)" },
    { type: "item", text: "· Demo con Operaciones" },
    { type: "item", text: "· Fijar fecha tentativa de propuesta" },
  ];

  const materials: Material[] = [
    {
      key: "pres",
      title: "Presentación",
      sub: "client-facing · gated",
      clientFacing: true,
      tag: { label: "gated", tone: "ok" },
      blocks: presentation,
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
  ];

  return { materials };
}
