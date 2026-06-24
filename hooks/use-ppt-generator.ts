"use client";

import { useCallback, useState } from "react";
import type { AsyncStatus, DeckRequest } from "@/types";
import { generatePpt } from "@/lib/api-client";

export interface PptGeneratorHook {
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
  generate: (req: DeckRequest) => Promise<void>;
}

/** Requests a `.pptx` from the BFF and triggers the browser download
 *  (blob → object URL → revoke). Idle/loading/error/success. */
export function usePptGenerator(): PptGeneratorHook {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (req: DeckRequest) => {
    setStatus("loading");
    setError(null);
    try {
      const blob = await generatePpt(req);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${req.clientName}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la presentación");
      setStatus("error");
    }
  }, []);

  return { status, error, generate };
}
