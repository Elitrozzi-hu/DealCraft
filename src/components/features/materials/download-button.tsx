import type { DeckRequest } from "@/types";
import { Button, Spinner } from "@/components/ui";
import { useT } from "@/i18n";
import { usePptGenerator } from "@/hooks/use-ppt-generator";

export interface DownloadButtonProps {
  deckRequest: DeckRequest;
}

export function DownloadButton({ deckRequest }: DownloadButtonProps) {
  const t = useT();
  const { status, error, generate } = usePptGenerator();
  const loading = status === "loading";

  return (
    <div className="flex flex-col items-start gap-1">
      <Button primary disabled={loading} onClick={() => generate(deckRequest)}>
        {loading ? (
          <>
            <Spinner /> {t("materials.downloadLoading")}
          </>
        ) : (
          t("materials.downloadPptx")
        )}
      </Button>
      {status === "error" && (
        <span className="text-[11.5px] text-risk">
          {error ?? t("materials.downloadError")}
        </span>
      )}
    </div>
  );
}
