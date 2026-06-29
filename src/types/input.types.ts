// Input screen — recent deals and search examples shown before a search.

import type { StageKey } from "./stage.types";

export interface RecentDeal {
  name: string;
  industry: string;
  deskless: number;
  headcount: number;
  stageKey: StageKey;
  score: number;
  updated: string;
}

export interface SearchExample {
  name: string;
  website: string;
  email: string;
  tag: string;
}
