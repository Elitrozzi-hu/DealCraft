import { useState } from "react";
import type {
  StageKey,
  Stakeholder,
  StakeholderDraft,
} from "@/types";
import { STAGES, stageIndex } from "@/lib/constants";
import { MOCK_STAKEHOLDERS } from "@/lib/fixtures";

export interface UseDealStateInit {
  stakeholders?: Stakeholder[];
  stage?: StageKey;
}

export interface DealStateHook {
  stakeholders: Stakeholder[];
  stage: StageKey;
  headcountValidated: boolean;
  validateStakeholder: (id: string) => void;
  addStakeholder: (draft: StakeholderDraft) => void;
  updateStakeholder: (id: string, patch: Partial<StakeholderDraft>) => void;
  removeStakeholder: (id: string) => void;
  moveDeal: () => void;
  /** Jump directly to a stage (stage-bar dots). */
  goToStage: (stage: StageKey) => void;
  validateHeadcount: () => void;
}

/** Ports the PoC `App` deal mutations (pains, stakeholders, stage). */
export function useDealState(init?: UseDealStateInit): DealStateHook {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(
    init?.stakeholders ?? MOCK_STAKEHOLDERS,
  );
  const [stage, setStage] = useState<StageKey>(init?.stage ?? "champion");
  const [headcountValidated, setHeadcountValidated] = useState(false);

  const validateStakeholder = (id: string) => {
    setStakeholders((ss) =>
      ss.map((x) => (x.id === id ? { ...x, validated: !x.validated } : x)),
    );
  };

  const addStakeholder = (d: StakeholderDraft) => {
    const id = "sh" + Date.now();
    setStakeholders((ss) => [
      ...ss,
      {
        id,
        name: d.name,
        title: d.title,
        role: d.role,
        conf: 0.9,
        source: "manual",
        evidence: "Agregado por el AE.",
        validated: d.validated,
      },
    ]);
  };

  const updateStakeholder = (id: string, patch: Partial<StakeholderDraft>) => {
    setStakeholders((ss) =>
      ss.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const removeStakeholder = (id: string) => {
    setStakeholders((ss) => ss.filter((s) => s.id !== id));
  };

  const moveDeal = () => {
    const i = stageIndex(stage);
    if (i < STAGES.length - 1) {
      setStage(STAGES[i + 1].key);
    }
  };

  const validateHeadcount = () => {
    setHeadcountValidated(true);
  };

  const goToStage = (next: StageKey) => setStage(next);

  return {
    stakeholders,
    stage,
    headcountValidated,
    validateStakeholder,
    addStakeholder,
    updateStakeholder,
    removeStakeholder,
    moveDeal,
    goToStage,
    validateHeadcount,
  };
}
