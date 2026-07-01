import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { DealSearchRequest, DealSearchResult } from "@/types";
import { searchDeal } from "@/lib/api-client";
import { mutationStatus } from "@/hooks/mutation-status";
import { useLanguage, useT } from "@/i18n";

export interface DealSearchHook {
  status: 'idle' | 'loading' | 'error' | 'success';
  result: DealSearchResult | null;
  error: string | null;
  step: number;
  steps: string[];
  search: (req: DealSearchRequest) => Promise<DealSearchResult | null>;
  reset: () => void;
}

const STEP_MS = 480;
const SEARCH_STEP_COUNT = 6;


export function useDealSearch(): DealSearchHook {
  const t = useT();
  const { lang } = useLanguage();
  const steps = useMemo(() => [
    t("search.steps.resolving"),
    t("search.steps.enriching"),
    t("search.steps.deskless"),
    t("search.steps.hubspot"),
    t("search.steps.signals"),
    t("search.steps.provenance"),
  ], [t]);
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
        setStep((s) => (s < SEARCH_STEP_COUNT - 1 ? s + 1 : s));
      }, STEP_MS);
      try {
        const res = await mutateAsync({ ...req, language: req.language ?? lang });
        stopTimer();
        setStep(SEARCH_STEP_COUNT);
        return res;
      } catch {
        stopTimer();
        return null;
      }
    },
    [mutateAsync, stopTimer, lang],
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
        : t("search.errorFallback")
      : null,
    step,
    steps,
    search,
    reset,
  };
}
