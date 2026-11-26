"use client";

import React, { useState, useEffect } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { getDefaultSectionsConfig } from "@/lib/cms/storage";
import type {
  HomepageSectionId,
  MutableExploringItem,
  SectionsConfig,
} from "@/lib/cms/types";
import { portfolioRepository } from "@/lib/portfolio/repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { TextArea } from "@/components/admin/ui/TextArea";
import { ToggleField } from "@/components/admin/ui/ToggleField";
import { ArrayEditor } from "@/components/admin/ui/ArrayEditor";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";

const SECTION_TARGETS = [
  "work",
  "tech-city",
  "about",
  "skills",
  "experience",
  "education",
  "exploring",
  "recognition",
  "contact",
];

export default function HomepageCMSPage() {
  const { draft, saveCurrentDraft, isSaving, lastSaved, syncError } =
    usePortfolioDraft();

  const [hero, setHero] = useState(draft.hero);
  const [about, setAbout] = useState(draft.about);
  const [meta, setMeta] = useState(draft.meta);
  const [exploring, setExploring] = useState<MutableExploringItem[]>(draft.exploring);
  const [sectionsConfig, setSectionsConfig] = useState<SectionsConfig>(
    draft.sectionsConfig ?? getDefaultSectionsConfig(),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) {
      setHero(draft.hero);
      setAbout(draft.about);
      setMeta(draft.meta);
      setExploring(draft.exploring);
      setSectionsConfig(draft.sectionsConfig ?? getDefaultSectionsConfig());
    }
  }, [draft, isDirty]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLocalError(null);
    const nextDraft = {
      ...draft,
      hero,
      about,
      meta,
      exploring,
      sectionsConfig,
      lastModified: new Date().toISOString(),
    };

    const ok = await saveCurrentDraft(nextDraft);
    let exploringOk = true;
    if (isSupabaseConfigured()) {
      const expRes = await portfolioRepository.syncExploring(exploring);
      if (!expRes.success) {
        exploringOk = false;
        setLocalError(expRes.error ?? "Unable to save Currently Exploring items.");
      }
    }

    if (ok && exploringOk) {
      setIsDirty(false);
      setToast("Homepage configuration saved! Use Preview or Publish Changes to push live.");
      setTimeout(() => setToast(null), 3500);
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sectionsConfig.order.length) return;
    const nextOrder = [...sectionsConfig.order];
    const [moved] = nextOrder.splice(index, 1);
    if (!moved) return;
    nextOrder.splice(targetIdx, 0, moved);
    setSectionsConfig({ ...sectionsConfig, order: nextOrder });
    setIsDirty(true);
  };

  const updateSectionSetting = (
    id: HomepageSectionId,
    patch: Partial<SectionsConfig["sections"][HomepageSectionId]>,
  ) => {
    setSectionsConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [id]: {
          ...prev.sections[id],
          ...patch,
        },
      },
    }));
    setIsDirty(true);
  };

  const addExploringItem = () => {
    const nextIdx = String(exploring.length + 1).padStart(2, "0");
    setExploring([
      ...exploring,
      {
        id: `explore-${Date.now().toString().slice(-4)}`,
        index: nextIdx,
        label: "New Topic",
        caption: "",
        isVisible: true,
      },
    ]);
    setIsDirty(true);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Homepage Manager"
        description="Edit your hero banner, intro narrative, section visibility, display order, Currently Exploring topics, and SEO."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} isDirty={isDirty} lastSaved={lastSaved} />
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-1.5 text-small font-medium text-[var(--color-void)] hover:opacity-90 disabled:opacity-50"
            >
              Save Homepage
            </button>
          </div>
        }
      />

      {toast && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]">
          ✓ {toast}
        </div>
      )}

      {(localError || syncError) && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200">
          {localError ?? syncError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Hero + Live Preview */}
        <FormSection
          title="Hero Opening"
          description="The primary headline, eyebrow badge, and call-to-action buttons visitors see first."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <FormField label="Hero Kicker">
                <TextInput
                  value={hero.kicker}
                  onChange={(e) => {
                    setHero({ ...hero, kicker: e.target.value });
                    setIsDirty(true);
                  }}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Primary Button Label">
                  <TextInput
                    value={hero.primaryCta.label}
                    onChange={(e) => {
                      setHero({
                        ...hero,
                        primaryCta: { ...hero.primaryCta, label: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                  />
                </FormField>
                <FormField label="Primary Target Section">
                  <select
                    value={hero.primaryCta.targetId}
                    onChange={(e) => {
                      setHero({
                        ...hero,
                        primaryCta: { ...hero.primaryCta, targetId: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                    className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-small text-[var(--color-text)] outline-none"
                  >
                    {SECTION_TARGETS.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Secondary Button Label">
                  <TextInput
                    value={hero.secondaryCta.label}
                    onChange={(e) => {
                      setHero({
                        ...hero,
                        secondaryCta: { ...hero.secondaryCta, label: e.target.value },
                      });
                      setIsDirty(true);
                    }}
                  />
                </FormField>
                <FormField label="Secondary Target Section">
                  <select
                    value={hero.secondaryCta.targetId}
                    onChange={(e) => {
                      setHero({
                        ...hero,
                        secondaryCta: {
                          ...hero.secondaryCta,
                          targetId: e.target.value,
                        },
                      });
                      setIsDirty(true);
                    }}
                    className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-small text-[var(--color-text)] outline-none"
                  >
                    {SECTION_TARGETS.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* Live Hero Card Preview */}
            <div className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-5 flex flex-col justify-center space-y-3">
              <p className="font-mono text-micro uppercase tracking-[0.16em] text-[var(--color-accent)]">
                Live Preview · {hero.kicker}
              </p>
              <h3 className="text-h2 font-medium text-[var(--color-text)]">
                {draft.personal.name}
              </h3>
              <p className="text-small text-[var(--color-muted)]">{draft.personal.statement}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-micro font-medium text-[var(--color-void)]">
                  {hero.primaryCta.label}
                </span>
                <span className="rounded-full border border-[var(--hairline)] px-4 py-1.5 text-micro text-[var(--color-text)]">
                  {hero.secondaryCta.label}
                </span>
              </div>
            </div>
          </div>
        </FormSection>

        {/* Section Visibility & Order */}
        <FormSection
          title="Homepage Sections (Visibility, Order & Custom Headings)"
          description="Control which sections appear on your homepage, adjust their order, and customize headings without touching code."
        >
          <div className="space-y-3">
            {sectionsConfig.order.map((secId, idx) => {
              const sec = sectionsConfig.sections[secId];
              if (!sec) return null;
              return (
                <div
                  key={secId}
                  className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-micro text-[var(--color-accent-warm)]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="font-medium text-small text-[var(--color-text)]">
                        {sec.label}
                      </span>
                      {sec.locked && (
                        <span className="rounded bg-[var(--color-surface-3)] px-2 py-0.5 font-mono text-micro text-[var(--color-subtle)]">
                          Always shown
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!sec.locked && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSectionSetting(secId, { visible: !sec.visible })
                          }
                          className={`rounded-full px-3 py-1 text-micro font-medium transition-colors ${
                            sec.visible
                              ? "bg-[var(--color-live)]/15 text-[var(--color-live)]"
                              : "bg-[var(--color-surface-3)] text-[var(--color-faint)]"
                          }`}
                        >
                          {sec.visible ? "Visible" : "Hidden"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => moveSection(idx, "up")}
                        disabled={idx === 0}
                        className="rounded border border-[var(--hairline)] px-2 py-1 text-micro text-[var(--color-muted)] disabled:opacity-25"
                        title="Move section up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, "down")}
                        disabled={idx === sectionsConfig.order.length - 1}
                        className="rounded border border-[var(--hairline)] px-2 py-1 text-micro text-[var(--color-muted)] disabled:opacity-25"
                        title="Move section down"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextInput
                      value={sec.headingOverride ?? ""}
                      onChange={(e) =>
                        updateSectionSetting(secId, {
                          headingOverride: e.target.value.trim()
                            ? e.target.value
                            : null,
                        })
                      }
                      placeholder="Custom section heading (leave blank for default)"
                    />
                    <TextInput
                      value={sec.introOverride ?? ""}
                      onChange={(e) =>
                        updateSectionSetting(secId, {
                          introOverride: e.target.value.trim() ? e.target.value : null,
                        })
                      }
                      placeholder="Optional section subtitle / intro text"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </FormSection>

        {/* About Narrative */}
        <FormSection
          title="About Section"
          description="Your editorial bio and focus blocks."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="About Kicker">
              <TextInput
                value={about.kicker}
                onChange={(e) => {
                  setAbout({ ...about, kicker: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
            <FormField label="About Heading">
              <TextInput
                value={about.heading}
                onChange={(e) => {
                  setAbout({ ...about, heading: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
          </div>

          <FormField label="Biography Paragraphs">
            <ArrayEditor
              items={about.paragraphs}
              onChange={(paragraphs) => {
                setAbout({ ...about, paragraphs });
                setIsDirty(true);
              }}
              addLabel="+ Add Paragraph"
            />
          </FormField>
        </FormSection>

        {/* Currently Exploring */}
        <FormSection
          title="Currently Exploring Topics"
          description="Shown in the Currently Exploring section on the homepage."
          action={
            <button
              type="button"
              onClick={addExploringItem}
              className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3 py-1 text-micro text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            >
              + Add Topic
            </button>
          }
        >
          <div className="space-y-3">
            {exploring.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-3 space-y-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={item.index}
                    onChange={(e) => {
                      const next = [...exploring];
                      next[idx] = { ...item, index: e.target.value };
                      setExploring(next);
                      setIsDirty(true);
                    }}
                    className="w-12 rounded bg-[var(--color-surface-3)] px-2 py-1 text-center font-mono text-micro text-[var(--color-accent-warm)] outline-none"
                  />
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const next = [...exploring];
                      next[idx] = { ...item, label: e.target.value };
                      setExploring(next);
                      setIsDirty(true);
                    }}
                    placeholder="Topic label"
                    className="flex-1 min-w-[180px] rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-text)] outline-none"
                  />
                  <ToggleField
                    label="Visible"
                    checked={item.isVisible !== false}
                    onChange={(val) => {
                      const next = [...exploring];
                      next[idx] = { ...item, isVisible: val };
                      setExploring(next);
                      setIsDirty(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setExploring(exploring.filter((_, i) => i !== idx));
                      setIsDirty(true);
                    }}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Delete topic"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={item.caption}
                  onChange={(e) => {
                    const next = [...exploring];
                    next[idx] = { ...item, caption: e.target.value };
                    setExploring(next);
                    setIsDirty(true);
                  }}
                  placeholder="Supporting caption"
                  className="w-full rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-muted)] outline-none"
                />
              </div>
            ))}
          </div>
        </FormSection>

        {/* SEO Metadata */}
        <FormSection
          title="Search & Social Metadata (SEO)"
          description="Browser title and summary stored in your published portfolio configuration. Note: because this site uses static HTML export, updating server-rendered HTML <title> / Open Graph tags on bots requires a deployment rebuild, while client page titles update immediately."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Page Title">
              <TextInput
                value={meta.title}
                onChange={(e) => {
                  setMeta({ ...meta, title: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
            <FormField label="Site Base URL (optional)">
              <TextInput
                value={meta.siteUrl ?? ""}
                onChange={(e) => {
                  setMeta({
                    ...meta,
                    siteUrl: e.target.value.trim() ? e.target.value : null,
                  });
                  setIsDirty(true);
                }}
                placeholder="https://faizanpatel.dev"
              />
            </FormField>
          </div>
          <FormField label="Meta Description">
            <TextArea
              value={meta.description}
              onChange={(e) => {
                setMeta({ ...meta, description: e.target.value });
                setIsDirty(true);
              }}
              rows={2}
            />
          </FormField>
        </FormSection>
      </form>
    </div>
  );
}
