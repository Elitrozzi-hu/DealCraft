import { z } from "zod";

// Structured-output contract for the pre-call-brief LLM call — mirrors

export const preCallHypothesisSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  suggestedModule: z.string().nullable(),
  proofCaseCompany: z.string().nullable(),
  proofMetric: z.string().nullable(),
  proofSourceUrl: z.string().nullable(),
  discoveryQuestions: z.array(z.string()),
  confirms: z.string(),
  discards: z.string(),
});

export const preCallBriefSchema = z.object({
  hypotheses: z.array(preCallHypothesisSchema),
  contextQuestions: z.array(z.string()),
});
