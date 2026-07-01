import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export function useLeadSearch(): LeadSearchHook {
  const [req, setReq] = useState<LeadSearchRequest | null>(null);

  const query = useQuery({
    queryKey: ["leads", req?.email ?? null],
    queryFn: ({ signal }) => {
      if (!req) throw new Error("no lead-search request");
      return searchLeads(req, signal);
    },
    enabled: req !== null,
    staleTime: 5 * 60_000,
  });

  const search = useCallback(
    async (next: LeadSearchRequest): Promise<LeadSearchResult | null> => {
      setReq(next);
      return null;
    },
    [],
  );

  const reset = useCallback(() => setReq(null), []);

  const status: AsyncStatus =
    req === null
      ? "idle"
      : query.isPending || query.isFetching
        ? "loading"
        : query.isError
          ? "error"
          : "success";

  return {
    status,
    candidates: query.data?.candidates ?? [],
    error:
      status === "error"
        ? query.error instanceof Error
          ? query.error.message
          : "Error de búsqueda"
        : null,
    search,
    reset,
  };
}
