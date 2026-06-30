import { useState } from "react";
import type { Role, Stakeholder, StakeholderDraft } from "@/types";
import { ROLES } from "@/lib/constants";
import { Button, EmptyState, Input, ProvenanceBadge, SourceLinkButton } from "@/components/ui";
import { useT } from "@/i18n";

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
  const t = useT();
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
        placeholder={t("stakeholders.namePlaceholder")}
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <Input
        id="sh-title"
        compact
        className="flex-[1_1_130px]"
        placeholder={t("stakeholders.titlePlaceholder")}
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
      />
      <select
        aria-label={t("stakeholders.roleLabel")}
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
        {t("common.validated")}
      </label>
      <Button small primary onClick={save}>
        {t("common.save")}
      </Button>
      <Button small onClick={() => setEditId(null)}>
        {t("common.cancel")}
      </Button>
    </div>
  );

  if (stakeholders.length === 0 && editId !== "new") {
    return (
      <EmptyState
        icon={<PeopleGlyph />}
        title={t("stakeholders.emptyTitle")}
        hint={t("stakeholders.emptyHint")}
        action={
          <Button small onClick={startAdd}>
            {t("stakeholders.addStakeholder")}
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
            {t("common.add")}
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
                            : t("stakeholders.sourceFirmografia")
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
                    {s.validated ? `✓ ${t("common.validated")}` : t("common.validate")}
                  </Button>
                  <Button small onClick={() => startEdit(s)}>
                    {t("common.edit")}
                  </Button>
                  {sourceLink ? (
                    <SourceLinkButton
                      href={sourceLink}
                      title={t("stakeholders.openSourceOf", { name: s.name })}
                    />
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
