"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AsyncStatus, DealSearchRequest, DealSearchResult } from "@/types";
import { searchDeal } from "@/lib/api-client";
import { MOCK_SEARCH_STEPS } from "@/lib/fixtures";

export interface DealSearchHook {
  status: 'idle' | 'loading' | 'error' | 'success';
  result: DealSearchResult | null;
  error: string | null;
  /** Index of the current searching step (drives the SearchingScreen). */
  step: number;
  steps: string[];
  /** Resolves to the result on success, or `null` on error. */
  search: (req: DealSearchRequest) => Promise<DealSearchResult | null>;
  reset: () => void;
}

const STEP_MS = 480;

/** Owns the search/enrich flow: animates the PoC's searching-steps while the
 *  BFF resolves, then exposes the typed result. Idle/loading/error/success. */
export function useDealSearch(): DealSearchHook {
  const steps = MOCK_SEARCH_STEPS;
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [result, setResult] = useState<DealSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestId = useRef(0);

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const search = useCallback(
    async (req: DealSearchRequest): Promise<DealSearchResult | null> => {
      const id = ++latestId.current;
      stopTimer();
      setStatus("loading");
      setError(null);
      setResult(null);
      setStep(0);
      timer.current = setInterval(() => {
        setStep((s) => (s < steps.length - 1 ? s + 1 : s));
      }, STEP_MS);
      try {
        const res = await searchDeal(req);
        if (id !== latestId.current) return res;
        stopTimer();
        setStep(steps.length);
        setResult(res);
        setStatus("success");
        return res;
      } catch (e) {
        if (id !== latestId.current) return null;
        stopTimer();
        setError(e instanceof Error ? e.message : "Error de búsqueda");
        setStatus("error");
        return null;
      }
    },
    [steps.length, stopTimer],
  );

  const reset = useCallback(() => {
    latestId.current++;
    stopTimer();
    setStatus("idle");
    setResult(null);
    setError(null);
    setStep(0);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return { status, result, error, step, steps, search, reset };
}
