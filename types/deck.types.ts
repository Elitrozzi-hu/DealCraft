// Deck (PPT) — the token payload for the `.pptx` generator (consumed by `lib/ppt`).

/** Token payload for the deck generator (consumed by `lib/ppt`). */
export interface DeckRequest {
  clientName: string;
  /** Tokenized template id under `deck-assets/templates/` (default: royal-caribbean). */
  template?: string;
  date?: string;
  logo?: string;
  users?: number;
  mrr?: number;
  mrr_disc?: number;
  users_a?: number;
  mrr_a?: number;
  mrr_disc_a?: number;
  users_b?: number;
  mrr_b?: number;
  mrr_disc_b?: number;
}
