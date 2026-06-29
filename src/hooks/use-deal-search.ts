import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { DealSearchRequest, DealSearchResult } from "@/types";
import { searchDeal } from "@/lib/api-client";
import { mutationStatus } from "@/hooks/mutation-status";
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
 *  BFF resolves, then exposes the typed result. Backed by a React Query
 *  mutation; an AbortController cancels the in-flight request when a new search
 *  supersedes it or the component unmounts. Idle/loading/error/success. */
export function useDealSearch(): DealSearchHook {
  const steps = MOCK_SEARCH_STEPS;
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const controller = useRef<AbortController | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const { mutateAsync, data, isPending, isError, isSuccess, error, reset: resetMutation } =
    useMutation({
      mutationFn: (req: DealSearchRequest) => {
        // Cancel any in-flight search before starting a new one, so a stale
        // response can never resolve after a newer one.
        controller.current?.abort();
        const ac = new AbortController();
        controller.current = ac;
        return searchDeal(req, ac.signal);
      },
    });

  const search = useCallback(
    async (req: DealSearchRequest): Promise<DealSearchResult | null> => {
      stopTimer();
      setStep(0);
      timer.current = setInterval(() => {
        setStep((s) => (s < steps.length - 1 ? s + 1 : s));
      }, STEP_MS);
      try {
        const res = await mutateAsync(req);
        stopTimer();
        setStep(steps.length);
        return res;
      } catch {
        // Aborted (superseded) or failed — surfaces via status/error.
        stopTimer();
        return null;
      }
    },
    [mutateAsync, stopTimer, steps.length],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    stopTimer();
    setStep(0);
    resetMutation();
  }, [resetMutation, stopTimer]);

  useEffect(
    () => () => {
      controller.current?.abort();
      stopTimer();
    },
    [stopTimer],
  );

  return {
    status: mutationStatus(isPending, isError, isSuccess),
    result: data ?? null,
    error: isError
      ? error instanceof Error
        ? error.message
        : "Error de búsqueda"
      : null,
    step,
    steps,
    search,
    reset,
  };
}
