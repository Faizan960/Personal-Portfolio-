"use client";

import React, { useState, useEffect } from "react";
import { usePortfolioDraft, DevelopmentModeBanner } from "@/lib/cms/context";
import type { MutableSocialLink } from "@/lib/cms/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { FormSection } from "@/components/admin/ui/FormSection";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { TextArea } from "@/components/admin/ui/TextArea";
import { SaveIndicator } from "@/components/admin/ui/SaveIndicator";

export default function ContactCMSPage() {
  const { draft, saveCurrentDraft, isSaving, lastSaved, syncError } =
    usePortfolioDraft();

  const [contact, setContact] = useState(draft.contact);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) {
      setContact(draft.contact);
    }
  }, [draft.contact, isDirty]);

  const updateLink = (
    idx: number,
    patch: Partial<MutableSocialLink>,
  ) => {
    const nextLinks = [...contact.links];
    const current = nextLinks[idx];
    if (!current) return;
    nextLinks[idx] = { ...current, ...patch };
    setContact({ ...contact, links: nextLinks });
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveCurrentDraft({
      ...draft,
      contact,
      social: contact.links,
      lastModified: new Date().toISOString(),
    });
    if (ok) {
      setIsDirty(false);
      setToast("Contact & social links saved!");
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DevelopmentModeBanner />

      <PageHeader
        title="Contact & Social Channels"
        description="Manage your contact invitation statement and verified communication links."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator isSaving={isSaving} isDirty={isDirty} lastSaved={lastSaved} />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-1.5 text-small font-medium text-[var(--color-void)] hover:opacity-90 disabled:opacity-50"
            >
              Save Contact
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
        <FormSection
          title="Contact Closing Section"
          description="Displayed at the bottom of your homepage and in your navigation footer."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Section Kicker">
              <TextInput
                value={contact.kicker}
                onChange={(e) => {
                  setContact({ ...contact, kicker: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
            <FormField label="Section Heading">
              <TextInput
                value={contact.heading}
                onChange={(e) => {
                  setContact({ ...contact, heading: e.target.value });
                  setIsDirty(true);
                }}
              />
            </FormField>
          </div>
          <FormField label="Closing Statement">
            <TextArea
              value={contact.statement}
              onChange={(e) => {
                setContact({ ...contact, statement: e.target.value });
                setIsDirty(true);
              }}
              rows={3}
            />
          </FormField>
        </FormSection>

        <FormSection
          title="Social & Direct Channels"
          description="Leave URL empty to render cleanly as Pending rather than linking to an unverified destination."
        >
          <div className="space-y-4">
            {contact.links.map((link, idx) => (
              <div
                key={link.id}
                className="rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                <FormField label={`Label (${link.id})`}>
                  <TextInput
                    value={link.label}
                    onChange={(e) => updateLink(idx, { label: e.target.value })}
                  />
                </FormField>
                <FormField label="Display Handle">
                  <TextInput
                    value={link.handle ?? ""}
                    onChange={(e) =>
                      updateLink(idx, {
                        handle: e.target.value.trim() ? e.target.value : null,
                      })
                    }
                    placeholder="Pending or handle"
                  />
                </FormField>
                <FormField label="Destination URL / mailto:">
                  <TextInput
                    value={link.href ?? ""}
                    onChange={(e) =>
                      updateLink(idx, {
                        href: e.target.value.trim() ? e.target.value : null,
                      })
                    }
                    placeholder="https://... or mailto:..."
                  />
                </FormField>
              </div>
            ))}
          </div>
        </FormSection>
      </form>
    </div>
  );
}
