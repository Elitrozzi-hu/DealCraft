"use client";

import { useCallback, useState } from "react";
import type { AsyncStatus, Material, MaterialsRequest } from "@/types";
import { generateMaterials } from "@/lib/api-client";

export interface MaterialsHook {
  status: 'idle' | 'loading' | 'error' | 'success';
  materials: Material[];
  error: string | null;
  generate: (req: MaterialsRequest) => Promise<void>;
}

/** Generates the 5 sales artifacts via the BFF. Idle/loading/error/success. */
export function useMaterials(): MaterialsHook {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (req: MaterialsRequest) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await generateMaterials(req);
      setMaterials(res.materials);
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron generar los materiales");
      setStatus("error");
    }
  }, []);

  return { status, materials, error, generate };
}
