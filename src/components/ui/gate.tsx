export interface GateProps {
  /** Unlocked when the gated data is validated. */
  ok: boolean;
  message: string;
}

/** Provenance gating banner — locked until validated data is present. */
export function Gate({ ok, message }: GateProps) {
  return (
    <div
      className={`mb-2.5 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${ok ? "bg-validated-soft text-validated" : "bg-inferred-soft text-inferred"}`}
    >
      <span aria-hidden>{ok ? "🔓" : "🔒"}</span>
      {message}
    </div>
  );
}
