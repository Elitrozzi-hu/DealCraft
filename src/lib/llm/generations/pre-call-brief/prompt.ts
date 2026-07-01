import type { PreCallBriefRequest } from "../../../../types/index.js";
import { languageDirective } from "../../language.js";

function renderStakeholders(req: PreCallBriefRequest): string {
  if (req.stakeholders.length === 0) return "(none identified yet)";
  return req.stakeholders
    .map((s) => `- ${s.name} — ${s.title} (${s.role})`)
    .join("\n");
}

function renderComparableCases(req: PreCallBriefRequest): string {
  if (req.comparableCases.length === 0) {
    return "(no comparable same-industry success cases — still generate the hypotheses, without proof)";
  }
  return req.comparableCases
    .map((c) => {
      const metrics =
        c.metrics.length > 0
          ? c.metrics.map((m) => `${m.value} ${m.label}`).join("; ")
          : "(no published metrics)";
      const modules =
        c.modules.length > 0 ? c.modules.join(", ") : "(no modules listed)";
      const pains =
        c.pains.length > 0 ? c.pains.join("; ") : "(no pains listed)";
      return [
        `### ${c.company} — ${c.industry}`,
        `- Pains solved: ${pains}`,
        `- Modules used: ${modules}`,
        `- Metrics (USE VERBATIM): ${metrics}`,
        c.quote ? `- Quote: "${c.quote}"` : null,
        `- Source: ${c.sourceUrl ?? "(no link)"}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function renderPreCallBriefPrompt(req: PreCallBriefRequest): string {
  return `ROLE
You are a sales strategist for Humand. You prep an Account Executive BEFORE their
discovery call: you hand them 2-3 prioritized, falsifiable, actionable value
hypotheses. "The call is won before it starts."

Humand = all-in-one employee-experience app for deskless/frontline + office workforces
(internal comms, culture & recognition, HR & onboarding, surveys/eNPS, time tracking,
service management, training, document signing). Best fit: multi-site
retail/manufacturing/logistics, large dispersed teams.

TARGET COMPANY
- Name: ${req.company}
- Industry: ${req.industry || "(unknown)"}
- Region: ${req.region || "(unknown)"}
- Headcount: ${req.headcount || "(unknown)"}

IDENTIFIED STAKEHOLDERS
${renderStakeholders(req)}

COMPARABLE SUCCESS CASES (same industry — already pre-filtered)
${renderComparableCases(req)}

TASK
Generate 2-3 PRIORITIZED value hypotheses (#1 is the most likely / highest-impact).
Each hypothesis is REASONED from scratch from the company profile + the comparable
cases. Do NOT start from given "detected pains" — you infer them yourself.

Each hypothesis must include:
- title: a FALSIFIABLE thesis about a likely pain (not generic; specific to this company).
- rationale: 1-2 sentences connecting industry + headcount + multi-site + stakeholders.
- suggestedModule: the Humand module to open with (string), or null if none fits.
- proofCaseCompany / proofMetric / proofSourceUrl: ONLY if a comparable case above
  supports the hypothesis. proofMetric must be a REAL, VERBATIM metric from that case
  (copy value + label exactly). NEVER invent numbers. If no case applies, all three
  fields are null (the hypothesis is still useful as a question).
- discoveryQuestions: 2-3 concrete questions to confirm or rule out the hypothesis.
- confirms: what customer answer VALIDATES the hypothesis.
- discards: what answer RULES IT OUT (when NOT to pursue it).

contextQuestions: include the playbook's standard discovery questions, phrased in the
output language for the AE to ask: number and type of employees (operational vs.
administrative), number of sites, current HR systems, plus "What made you take this
meeting?", "What is the main HR challenge today?", and "Is there a manual process you'd
like to digitize?".

RULES
- ${languageDirective(req.language ?? "es")} Keep it concise and scannable.
- Do not invent metrics, names, or sources. No case → proof fields null.
- Prioritize the playbook's red flags: manual processes, multiple systems, low internal
  adoption, frontline with no communication.
- Return ONLY a JSON object that validates against the provided schema. No prose, no markdown.`;
}
