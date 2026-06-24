"use client";

import { useCallback, useState } from "react";
import type {
  AsyncStatus,
  LeadCandidate,
  LeadSearchRequest,
  LeadSearchResult,
} from "@/types";
import { searchLeads } from "@/lib/api-client";

export interface LeadSearchHook {
  status: "idle" | "loading" | "error" | "success";
  candidates: LeadCandidate[];
  error: string | null;
  /** Resolves to the result on success, or `null` on error. */
  search: (req: LeadSearchRequest) => Promise<LeadSearchResult | null>;
  reset: () => void;
}

/** Owns the CRM lead-search call: a single fast request (no step animation,
 *  unlike `useDealSearch`). Idle/loading/error/success. */
export function useLeadSearch(): LeadSearchHook {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [candidates, setCandidates] = useState<LeadCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (req: LeadSearchRequest): Promise<LeadSearchResult | null> => {
      setStatus("loading");
      setError(null);
      setCandidates([]);
      try {
        const res = await searchLeads(req);
        setCandidates(res.candidates);
        setStatus("success");
        return res;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de búsqueda");
        setStatus("error");
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setCandidates([]);
    setError(null);
  }, []);

  return { status, candidates, error, search, reset };
}
