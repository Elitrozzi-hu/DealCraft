"use client";

import type { DeckRequest } from "@/types";
import { Input, Label } from "@/components/ui";

export interface DeckConfigFormProps {
  value: DeckRequest;
  onChange: (value: DeckRequest) => void;
}

type NumKey = Exclude<keyof DeckRequest, "clientName" | "date" | "logo">;

/** A pricing plan = 3 deck tokens (users / mrr / mrr_disc). */
function PlanGroup({
  title,
  usersKey,
  mrrKey,
  discKey,
  value,
  onChange,
}: {
  title: string;
  usersKey: NumKey;
  mrrKey: NumKey;
  discKey: NumKey;
  value: DeckRequest;
  onChange: (value: DeckRequest) => void;
}) {
  const setNum = (key: NumKey, v: string) => {
    const n = v === "" ? 0 : Number(v);
    if (Number.isNaN(n)) return;
    onChange({ ...value, [key]: n });
  };

  const fields: [NumKey, string][] = [
    [usersKey, "Users"],
    [mrrKey, "MRR"],
    [discKey, "MRR desc."],
  ];

  return (
    <fieldset className="rounded-xl border border-line p-3">
      <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-cold">
        {title}
      </legend>
      <div className="grid grid-cols-3 items-end gap-2.5">
        {fields.map(([key, label]) => (
          <div key={key} className="min-w-0">
            <Label htmlFor={`dk-${key}`}>{label}</Label>
            <Input
              id={`dk-${key}`}
              compact
              type="number"
              min={0}
              value={value[key] ? String(value[key]) : ""}
              onChange={(e) => setNum(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Editable form for the deck's `{{…}}` tokens, pre-filled from the deal. */
export function DeckConfigForm({ value, onChange }: DeckConfigFormProps) {
  const setStr = (key: "clientName" | "date" | "logo", v: string) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="dk-clientName">Cliente</Label>
          <Input
            id="dk-clientName"
            compact
            value={value.clientName}
            onChange={(e) => setStr("clientName", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dk-date">Fecha</Label>
          <Input
            id="dk-date"
            compact
            type="date"
            value={value.date ?? ""}
            onChange={(e) => setStr("date", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dk-logo">Logo</Label>
          <Input
            id="dk-logo"
            compact
            value={value.logo ?? ""}
            placeholder="url o image.png (opcional)"
            onChange={(e) => setStr("logo", e.target.value)}
          />
        </div>
      </div>

      <PlanGroup
        title="Plan principal"
        usersKey="users"
        mrrKey="mrr"
        discKey="mrr_disc"
        value={value}
        onChange={onChange}
      />
      <PlanGroup
        title="Plan A"
        usersKey="users_a"
        mrrKey="mrr_a"
        discKey="mrr_disc_a"
        value={value}
        onChange={onChange}
      />
      <PlanGroup
        title="Plan B"
        usersKey="users_b"
        mrrKey="mrr_b"
        discKey="mrr_disc_b"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
