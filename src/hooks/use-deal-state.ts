import { useState } from "react";
import type {
  Pain,
  PainDraft,
  StageKey,
  Stakeholder,
  StakeholderDraft,
} from "@/types";
import { STAGES, resolveModule, stageIndex } from "@/lib/constants";
import { MOCK_PAINS, MOCK_STAKEHOLDERS } from "@/lib/fixtures";

export interface UseDealStateInit {
  stakeholders?: Stakeholder[];
  pains?: Pain[];
  stage?: StageKey;
}

export interface DealStateHook {
  stakeholders: Stakeholder[];
  pains: Pain[];
  stage: StageKey;
  headcountValidated: boolean;
  // actions
  validatePain: (id: string) => void;
  addPain: (draft: PainDraft) => void;
  removePain: (id: string) => void;
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
  const [pains, setPains] = useState<Pain[]>(init?.pains ?? MOCK_PAINS);
  const [stage, setStage] = useState<StageKey>(init?.stage ?? "champion");
  const [headcountValidated, setHeadcountValidated] = useState(false);

  // ---- pain actions ----
  const validatePain = (id: string) => {
    setPains((ps) =>
      ps.map((x) => (x.id === id ? { ...x, validated: !x.validated } : x)),
    );
  };

  const addPain = (d: PainDraft) => {
    const id = "p" + Date.now();
    const m = resolveModule(d.taxonomy);
    setPains((ps) => [
      ...ps,
      {
        id,
        label: d.label,
        taxonomy: d.taxonomy,
        source: "manual",
        conf: 0.6,
        evidence: d.evidence || "Agregado por el AE.",
        module: m,
        validated: false,
      },
    ]);
  };

  const removePain = (id: string) => {
    setPains((ps) => ps.filter((p) => p.id !== id));
  };

  // ---- stakeholder actions ----
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

  // ---- deal actions ----
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
    pains,
    stage,
    headcountValidated,
    validatePain,
    addPain,
    removePain,
    validateStakeholder,
    addStakeholder,
    updateStakeholder,
    removeStakeholder,
    moveDeal,
    goToStage,
    validateHeadcount,
  };
}
