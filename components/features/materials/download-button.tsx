"use client";

import type { DeckRequest } from "@/types";
import { Button, Spinner } from "@/components/ui";
import { usePptGenerator } from "@/hooks/use-ppt-generator";

export interface DownloadButtonProps {
  /**
   * Deck token payload. TODO: the deal→token mapping (validated pains /
   * confirmed MRR / company → tokens) is built upstream in the page shell — see
   * PLAN Task 9. This component just sends it and renders the three states.
   */
  deckRequest: DeckRequest;
}

export function DownloadButton({ deckRequest }: DownloadButtonProps) {
  const { status, error, generate } = usePptGenerator();
  const loading = status === "loading";

  return (
    <div className="flex flex-col items-start gap-1">
      <Button primary disabled={loading} onClick={() => generate(deckRequest)}>
        {loading ? (
          <>
            <Spinner /> Generando…
          </>
        ) : (
          "↓ Descargar .pptx"
        )}
      </Button>
      {status === "error" && (
        <span className="text-[11.5px] text-risk">
          {error ?? "No se pudo generar la presentación"}
        </span>
      )}
    </div>
  );
}
