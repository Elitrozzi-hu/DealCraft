import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Material, MaterialsRequest } from "@/types";
import { generateMaterials } from "@/lib/api-client";
import { mutationStatus } from "@/hooks/mutation-status";

export interface MaterialsHook {
  status: 'idle' | 'loading' | 'error' | 'success';
  materials: Material[];
  error: string | null;
  generate: (req: MaterialsRequest) => Promise<void>;
}


export function useMaterials(): MaterialsHook {
  const { mutateAsync, data, isPending, isError, isSuccess, error } =
    useMutation({ mutationFn: (req: MaterialsRequest) => generateMaterials(req) });

  const generate = useCallback(
    async (req: MaterialsRequest) => {
      try {
        await mutateAsync(req);
      } catch {
      }
    },
    [mutateAsync],
  );

  return {
    status: mutationStatus(isPending, isError, isSuccess),
    materials: data?.materials ?? [],
    error: isError
      ? error instanceof Error
        ? error.message
        : "No se pudieron generar los materiales"
      : null,
    generate,
  };
}
