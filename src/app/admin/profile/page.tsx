"use client";

import React, { useState, useEffect } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { TextArea } from "@/components/admin/ui/TextArea";
import { ArrayEditor } from "@/components/admin/ui/ArrayEditor";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";

export default function ProfileCMSPage() {
  const { draft, saveCurrentDraft, isSaving, lastSaved, syncError } =
    usePortfolioDraft();

  const [personal, setPersonal] = useState(draft.personal);
  const [meta, setMeta] = useState(draft.meta);
  const [hero, setHero] = useState(draft.hero);
  const [about, setAbout] = useState(draft.about);
  const [contact, setContact] = useState(draft.contact);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sync if draft changes externally or loads
  useEffect(() => {
    if (!isDirty) {
      setPersonal(draft.personal);
      setMeta(draft.meta);
      setHero(draft.hero);
      setAbout(draft.about);
      setContact(draft.contact);
    }
  }, [draft, isDirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveCurrentDraft({
      ...draft,
      personal,
      meta,
      hero,
      about,
      contact,
      social: contact.links,
      lastModified: new Date().toISOString(),
    });
    if (ok) {
      setIsDirty(false);
      setToast("Profile saved! Preview and Publish when ready to go live.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleReset = () => {
    setPersonal(draft.personal);
    setMeta(draft.meta);
    setHero(draft.hero);
    setAbout(draft.about);
    setContact(draft.contact);
    setIsDirty(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Profile & Content"
        description="Manage personal credentials, hero framing, about statement, SEO metadata and social links."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} isDirty={isDirty} lastSaved={lastSaved} />
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3.5 py-1.5 text-small text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-1.5 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
            >
              Save Profile
            </button>
          </div>
        }
      />

      {toast && (
        <div className="rounded-[var(--radius-panel)] border border-[var(--color-live)]/30 bg-[var(--color-live)]/10 px-4 py-2.5 text-small text-[var(--color-live)]">
          ✓ {toast}
        </div>
      )}

      {syncError && (
        <div className="rounded-[var(--radius-panel)] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-small text-red-200">
          {syncError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <FormSection
          title="Personal Details"
          description="Fundamental personal and professional identification."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Full Name" required>
              <TextInput
                value={personal.name}
                onChange={(e) => {
                  setPersonal({ ...personal, name: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>

            <FormField label="Wordmark (Nav Short Name)" required>
              <TextInput
                value={personal.wordmark}
                onChange={(e) => {
                  setPersonal({ ...personal, wordmark: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>

            <FormField label="Initials" required>
              <TextInput
                value={personal.initials}
                onChange={(e) => {
                  setPersonal({ ...personal, initials: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Role / Title" required>
              <TextInput
                value={personal.role}
                onChange={(e) => {
                  setPersonal({ ...personal, role: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>

            <FormField label="Location (City, Country)">
              <TextInput
                value={personal.location ?? ""}
                onChange={(e) => {
                  setPersonal({ ...personal, location: e.target.value || null });
                  setIsDirty(true);
                }}
                placeholder="e.g. Mumbai, India"
              />
            </FormField>
          </div>

          <FormField label="Descriptor">
            <TextInput
              value={personal.descriptor}
              onChange={(e) => {
                setPersonal({ ...personal, descriptor: e.target.value });
                setIsDirty(true);
              }}
            />
          </FormField>

          <FormField label="One-line Thesis / Statement">
            <TextInput
              value={personal.statement}
              onChange={(e) => {
                setPersonal({ ...personal, statement: e.target.value });
                setIsDirty(true);
              }}
            />
          </FormField>

          <FormField
            label="Resume Download URL"
            helperText="Relative path under /public (e.g. /faizan-patel-cv.pdf) or an external URL."
          >
            <TextInput
              value={personal.resumeHref ?? ""}
              onChange={(e) => {
                setPersonal({ ...personal, resumeHref: e.target.value || null });
                setIsDirty(true);
              }}
              placeholder="e.g. /faizan-patel-cv.pdf or null"
            />
          </FormField>
        </FormSection>

        {/* SEO Metadata */}
        <FormSection
          title="SEO & Metadata"
          description="Page title and open-graph parameters generated on build."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Meta Title" required>
              <TextInput
                value={meta.title}
                onChange={(e) => {
                  setMeta({ ...meta, title: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>

            <FormField label="Site URL">
              <TextInput
                value={meta.siteUrl ?? ""}
                onChange={(e) => {
                  setMeta({ ...meta, siteUrl: e.target.value || null });
                  setIsDirty(true);
                }}
                placeholder="https://faizanpatel.dev"
              />
            </FormField>
          </div>

          <FormField label="Meta Description" required>
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

        {/* Hero Section */}
        <FormSection
          title="Hero Content"
          description="Kicker label and call-to-action button configuration."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Kicker">
              <TextInput
                value={hero.kicker}
                onChange={(e) => {
                  setHero({ ...hero, kicker: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>

            <FormField label="Primary CTA Label">
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

            <FormField label="Secondary CTA Label">
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
          </div>
        </FormSection>

        {/* About Section */}
        <FormSection
          title="About Section"
          description="Biographical paragraphs and structured metadata pairs."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Kicker">
              <TextInput
                value={about.kicker}
                onChange={(e) => {
                  setAbout({ ...about, kicker: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>

            <FormField label="Heading">
              <TextInput
                value={about.heading}
                onChange={(e) => {
                  setAbout({ ...about, heading: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
          </div>

          <FormField label="About Paragraphs">
            <ArrayEditor
              items={about.paragraphs}
              onChange={(paragraphs) => {
                setAbout({ ...about, paragraphs });
                setIsDirty(true);
              }}
              itemPlaceholder="Paragraph narrative..."
              addLabel="+ Add Paragraph"
            />
          </FormField>

          {/* Metadata pairs */}
          <div className="space-y-3 pt-2">
            <p className="text-small font-medium text-[var(--color-text)]">
              Sidebar Metadata Pairs
            </p>
            {about.metadata.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => {
                    const copy = [...about.metadata];
                    const target = copy[idx];
                    if (target) {
                      copy[idx] = { ...target, label: e.target.value };
                      setAbout({ ...about, metadata: copy });
                      setIsDirty(true);
                    }
                  }}
                  placeholder="Label (e.g. Focus)"
                  className="w-36 rounded bg-[var(--color-surface-2)] border border-[var(--hairline)] px-2.5 py-1.5 text-small text-[var(--color-text)] outline-none"
                />
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => {
                    const copy = [...about.metadata];
                    const target = copy[idx];
                    if (target) {
                      copy[idx] = { ...target, value: e.target.value };
                      setAbout({ ...about, metadata: copy });
                      setIsDirty(true);
                    }
                  }}
                  placeholder="Value"
                  className="flex-1 rounded bg-[var(--color-surface-2)] border border-[var(--hairline)] px-2.5 py-1.5 text-small text-[var(--color-text)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAbout({
                      ...about,
                      metadata: about.metadata.filter((_, i) => i !== idx),
                    });
                    setIsDirty(true);
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setAbout({
                  ...about,
                  metadata: [...about.metadata, { label: "", value: "" }],
                });
                setIsDirty(true);
              }}
              className="rounded border border-[var(--hairline)] px-3 py-1 text-micro text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            >
              + Add Metadata Pair
            </button>
          </div>
        </FormSection>

        {/* Contact & Social Links */}
        <FormSection
          title="Contact & Social Links"
          description="Handles, links, and contact section messaging."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Kicker">
              <TextInput
                value={contact.kicker}
                onChange={(e) => {
                  setContact({ ...contact, kicker: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>

            <FormField label="Heading">
              <TextInput
                value={contact.heading}
                onChange={(e) => {
                  setContact({ ...contact, heading: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
          </div>

          <FormField label="Statement">
            <TextInput
              value={contact.statement}
              onChange={(e) => {
                setContact({ ...contact, statement: e.target.value });
                setIsDirty(true);
              }}
            />
          </FormField>

          <div className="space-y-3 pt-2">
            <p className="text-small font-medium text-[var(--color-text)]">
              Social Links
            </p>
            {contact.links.map((link, idx) => (
              <div
                key={link.id}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-3"
              >
                <div>
                  <span className="font-mono text-micro uppercase tracking-wider text-[var(--color-accent)]">
                    {link.label} ({link.id})
                  </span>
                </div>
                <div>
                  <input
                    type="text"
                    value={link.handle ?? ""}
                    onChange={(e) => {
                      const updated = [...contact.links];
                      const target = updated[idx];
                      if (target) {
                        updated[idx] = { ...target, handle: e.target.value || null };
                        setContact({ ...contact, links: updated });
                        setIsDirty(true);
                      }
                    }}
                    placeholder="Handle (e.g. github.com/...)"
                    className="w-full rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-text)] outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={link.href ?? ""}
                    onChange={(e) => {
                      const updated = [...contact.links];
                      const target = updated[idx];
                      if (target) {
                        updated[idx] = { ...target, href: e.target.value || null };
                        setContact({ ...contact, links: updated });
                        setIsDirty(true);
                      }
                    }}
                    placeholder="URL (mailto:... or https://...)"
                    className="w-full rounded bg-[var(--color-surface-3)] px-2.5 py-1 text-small text-[var(--color-text)] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-6 py-2 text-small font-medium text-[var(--color-void)] hover:opacity-90 transition-opacity"
          >
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
}
