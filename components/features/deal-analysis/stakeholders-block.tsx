"use client";

import { useState } from "react";
import type { Role, Stakeholder, StakeholderDraft } from "@/types";
import { ROLES } from "@/lib/constants";
import { Button, EmptyState, Input, ProvenanceBadge } from "@/components/ui";

export interface StakeholdersBlockProps {
  stakeholders: Stakeholder[];
  onValidate: (id: string) => void;
  onAdd: (draft: StakeholderDraft) => void;
  onUpdate: (id: string, patch: Partial<StakeholderDraft>) => void;
  onRemove: (id: string) => void;
}

type RoleToken = "validated" | "violet" | "inferred" | "risk" | "cold";

const roleToken: Record<Role, RoleToken> = {
  Champion: "validated",
  "Decision Maker": "violet",
  "Economic Buyer": "violet",
  Influencer: "inferred",
  Blocker: "risk",
};

const borderLeftCls: Record<RoleToken, string> = {
  validated: "border-l-validated",
  violet: "border-l-violet",
  inferred: "border-l-inferred",
  risk: "border-l-risk",
  cold: "border-l-cold",
};

const roleChipCls: Record<RoleToken, string> = {
  validated: "text-validated bg-validated/10",
  violet: "text-violet bg-violet/10",
  inferred: "text-inferred bg-inferred/10",
  risk: "text-risk bg-risk/10",
  cold: "text-cold bg-cold/10",
};

const selectCls =
  "rounded-lg border border-line bg-panel px-2.5 py-[7px] text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet/50";

// Small chain-link icon for the "open source" action button. Inherits text color.
function LinkIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M9 12a3 3 0 0 0 4.24 0l3-3a3 3 0 0 0-4.24-4.24l-1 1" />
      <path d="M15 12a3 3 0 0 0-4.24 0l-3 3a3 3 0 0 0 4.24 4.24l1-1" />
    </svg>
  );
}

// Section glyph for the empty state — a small buying-committee silhouette.
function PeopleGlyph() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3.2" />
      <path d="M22 19v-2a4 4 0 0 0-3-3.87M16 3.6a4 4 0 0 1 0 6.8" />
    </svg>
  );
}

// Anchor styled to match a small default Button (Button itself is <button>-only).
const linkBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-panel px-3 py-[5px] text-xs font-semibold text-ink transition-colors hover:border-violet/40 hover:text-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50";

const emptyDraft: StakeholderDraft = {
  name: "",
  title: "",
  role: "Champion",
  validated: false,
};

export function StakeholdersBlock({
  stakeholders,
  onValidate,
  onAdd,
  onUpdate,
  onRemove,
}: StakeholdersBlockProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StakeholderDraft>(emptyDraft);

  const startAdd = () => {
    setDraft(emptyDraft);
    setEditId("new");
  };
  const startEdit = (s: Stakeholder) => {
    setDraft({ name: s.name, title: s.title, role: s.role, validated: s.validated });
    setEditId(s.id);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    if (editId === "new") onAdd(draft);
    else if (editId) onUpdate(editId, draft);
    setEditId(null);
  };

  const form = (
    <div className="my-2 flex flex-wrap items-center gap-2 rounded-xl bg-violet-soft p-2.5">
      <Input
        id="sh-name"
        compact
        className="flex-[1_1_130px]"
        placeholder="Nombre"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <Input
        id="sh-title"
        compact
        className="flex-[1_1_130px]"
        placeholder="Puesto"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />
      <select
        aria-label="Rol"
        className={selectCls}
        value={draft.role}
        onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
      >
        {ROLES.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={draft.validated}
          onChange={(e) => setDraft({ ...draft, validated: e.target.checked })}
        />{" "}
        validado
      </label>
      <Button small primary onClick={save}>
        Guardar
      </Button>
      <Button small onClick={() => setEditId(null)}>
        Cancelar
      </Button>
    </div>
  );

  if (stakeholders.length === 0 && editId !== "new") {
    return (
      <EmptyState
        icon={<PeopleGlyph />}
        title="Sin stakeholders todavía"
        hint="El research no encontró decisores verificables para este deal. Agregá uno a mano o reintentá el enrichment."
        action={
          <Button small onClick={startAdd}>
            ＋ agregar stakeholder
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-1 flex justify-end">
        {editId !== "new" && (
          <Button small onClick={startAdd}>
            ＋ agregar
          </Button>
        )}
      </div>
      <div className="grid gap-2">
        {stakeholders.map((s) => {
          if (editId === s.id) return <div key={s.id}>{form}</div>;
          const token = roleToken[s.role];
          // Personal profile if we have it, else the page the person was found on.
          const sourceLink = s.linkedinUrl ?? s.sourceUrl;
          return (
            <div
              key={s.id}
              className={`flex items-start gap-2.5 rounded-xl border border-line border-l-[3px] px-3 py-2.5 ${borderLeftCls[token]}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-bold">{s.name}</span>
                  <span className="text-[11px] text-cold">{s.title}</span>
                  <span
                    className={`rounded-md px-[7px] py-0.5 text-[10.5px] font-bold ${roleChipCls[token]}`}
                  >
                    {s.role}
                  </span>
                </div>
                <div className="mt-0.5 text-[11.5px] text-cold">{s.evidence}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {s.linkedinUrl ? (
                  // The LinkedIn profile is the source link for a
                  // firmographically-identified person — surface it always.
                  <ProvenanceBadge
                    source="LinkedIn"
                    sourceType="declarado"
                    confidence={s.conf}
                    status={s.validated ? "validated" : "inferred"}
                    url={s.linkedinUrl}
                  />
                ) : (
                  !s.validated && (
                    <ProvenanceBadge
                      source={
                        s.source === "call"
                          ? "Call"
                          : s.source === "manual"
                            ? "AE"
                            : "Firmografía"
                      }
                      sourceType={s.source}
                      confidence={s.conf}
                      status="inferred"
                    />
                  )
                )}
                <div className="flex gap-1.5">
                  <Button
                    small
                    tone={s.validated ? "ok" : undefined}
                    onClick={() => onValidate(s.id)}
                  >
                    {s.validated ? "✓ validado" : "validar"}
                  </Button>
                  <Button small onClick={() => startEdit(s)}>
                    editar
                  </Button>
                  {sourceLink ? (
                    // Has a real source URL → swap delete for an open-source link.
                    <a
                      href={sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Abrir fuente de ${s.name}`}
                      aria-label={`Abrir fuente de ${s.name}`}
                      className={linkBtnCls}
                    >
                      <LinkIcon />
                    </a>
                  ) : (
                    <Button small onClick={() => onRemove(s.id)}>
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {editId === "new" && form}
      </div>
    </div>
  );
}
