import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import type { DeckRequest } from "@/types";
import { generatePpt } from "@/lib/api-client";
import { mutationStatus } from "@/hooks/mutation-status";

export interface PptGeneratorHook {
  status: 'idle' | 'loading' | 'error' | 'success';
  error: string | null;
  generate: (req: DeckRequest) => Promise<void>;
}


export function usePptGenerator(): PptGeneratorHook {
  const { mutateAsync, isPending, isError, isSuccess, error } = useMutation({
    mutationFn: async (req: DeckRequest) => {
      const blob = await generatePpt(req);
      triggerDownload(blob, `${req.clientName}.pptx`);
    },
  });

  const generate = useCallback(
    async (req: DeckRequest) => {
      try {
        await mutateAsync(req);
      } catch {

      }
    },
    [mutateAsync],
  );

  return {
    status: mutationStatus(isPending, isError, isSuccess),
    error: isError
      ? error instanceof Error
        ? error.message
        : "No se pudo generar la presentación"
      : null,
    generate,
  };
}


function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  try {
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
  } finally {
    a.remove();
    URL.revokeObjectURL(url);
  }
}
