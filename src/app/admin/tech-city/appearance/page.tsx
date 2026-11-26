"use client";

import React, { useState, useEffect } from "react";
import { usePortfolioDraft } from "@/lib/cms/context";
import { getDefaultTechCityAppearance } from "@/lib/cms/storage";
import type { CityPalettePreset, TechCityAppearance } from "@/lib/cms/types";
import {
  TechCityStudioShell,
  getCityConfig,
} from "@/components/admin/tech-city/TechCityStudioShell";
import { FormSection } from "@/components/admin/ui/FormSection";
import { FormField } from "@/components/admin/ui/FormField";
import { TextInput } from "@/components/admin/ui/TextInput";
import { ToggleField } from "@/components/admin/ui/ToggleField";

const PALETTE_PRESETS: { value: CityPalettePreset; label: string; note: string }[] = [
  { value: "cyber-navy", label: "Cyber Navy", note: "Deep obsidian + electric cyan" },
  { value: "aurora-teal", label: "Aurora Teal", note: "Emerald skyline + turquoise glow" },
  { value: "solar-gold", label: "Solar Gold", note: "Amber beacons + warm slate" },
  { value: "monochrome-ice", label: "Monochrome Ice", note: "Crisp silver + polar blue" },
];

export default function TechCityAppearancePage() {
  const { draft, saveCityConfigAndSync, isSaving } = usePortfolioDraft();
  const cityConfig = getCityConfig(draft);
  const [appearance, setAppearance] = useState<TechCityAppearance>(
    cityConfig.appearance,
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setAppearance(cityConfig.appearance);
  }, [cityConfig.appearance]);

  const handleSave = async (next: TechCityAppearance, msg = "City appearance saved!") => {
    setAppearance(next);
    const res = await saveCityConfigAndSync({
      ...cityConfig,
      appearance: next,
    });
    if (res.success) {
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <TechCityStudioShell
      title="City Appearance & Atmosphere"
      description="Tune the 3D color theme, lighting bloom, fog, camera framing, and central headquarters identity."
      activeHref="/admin/tech-city/appearance/"
      toast={toast}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              void handleSave(
                getDefaultTechCityAppearance(),
                "Reset to recommended appearance.",
              )
            }
            className="rounded-[var(--radius-control)] border border-[var(--hairline)] px-3 py-1.5 text-micro text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            Reset Recommended
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave(appearance)}
            className="rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 py-1.5 text-small font-medium text-[var(--color-void)] hover:opacity-90 disabled:opacity-50"
          >
            Save Appearance
          </button>
        </div>
      }
    >
      <FormSection
        title="Color Theme & Lighting"
        description="Choose a city color atmosphere and control glow & particle density."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PALETTE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() =>
                void handleSave(
                  { ...appearance, palettePreset: preset.value },
                  `Switched palette to ${preset.label}.`,
                )
              }
              className={`rounded-[var(--radius-panel)] border p-3.5 text-left transition-colors ${
                appearance.palettePreset === preset.value
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/12"
                  : "border-[var(--hairline)] bg-[var(--color-surface-2)] hover:border-[var(--color-subtle)]"
              }`}
            >
              <p className="font-medium text-small text-[var(--color-text)]">
                {preset.label}
              </p>
              <p className="text-micro text-[var(--color-subtle)] mt-0.5">
                {preset.note}
              </p>
            </button>
          ))}
        </div>

        <div className="pt-2">
          <ToggleField
            label="Post-Processing Glow (Bloom)"
            description="Adds soft atmospheric halo around illuminated roofs and orbital beacons."
            checked={appearance.bloomEnabled}
            onChange={(val) =>
              setAppearance((prev) => ({ ...prev, bloomEnabled: val }))
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          <SliderControl
            label="Fog Density"
            value={appearance.fogDensity}
            min={0.004}
            max={0.03}
            step={0.002}
            format={(v) => v.toFixed(3)}
            onChange={(v) => setAppearance((p) => ({ ...p, fogDensity: v }))}
          />
          <SliderControl
            label="Data Particles"
            value={appearance.particleDensity}
            min={0}
            max={2}
            step={0.1}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) =>
              setAppearance((p) => ({ ...p, particleDensity: v }))
            }
          />
          <SliderControl
            label="Road Grid Opacity"
            value={appearance.roadOpacity}
            min={0.1}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setAppearance((p) => ({ ...p, roadOpacity: v }))}
          />
          <SliderControl
            label="Auto-Orbit Speed"
            value={appearance.autoOrbitSpeed}
            min={0}
            max={0.2}
            step={0.01}
            format={(v) => `${v.toFixed(2)}x`}
            onChange={(v) =>
              setAppearance((p) => ({ ...p, autoOrbitSpeed: v }))
            }
          />
          <SliderControl
            label="Camera Distance"
            value={appearance.cameraDistance}
            min={35}
            max={95}
            step={1}
            format={(v) => `${v}m`}
            onChange={(v) =>
              setAppearance((p) => ({ ...p, cameraDistance: v }))
            }
          />
          <SliderControl
            label="City Scale"
            value={appearance.cityScale}
            min={0.7}
            max={1.4}
            step={0.05}
            format={(v) => `${v.toFixed(2)}x`}
            onChange={(v) => setAppearance((p) => ({ ...p, cityScale: v }))}
          />
        </div>
      </FormSection>

      <FormSection
        title="Central Headquarters & Default Architecture"
        description="Configure the centerpiece tower label and default tower geometry."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="HQ Core Title">
            <TextInput
              value={appearance.coreLabel}
              onChange={(e) =>
                setAppearance((p) => ({ ...p, coreLabel: e.target.value }))
              }
            />
          </FormField>
          <FormField label="HQ Subtitle">
            <TextInput
              value={appearance.coreSubtitle}
              onChange={(e) =>
                setAppearance((p) => ({ ...p, coreSubtitle: e.target.value }))
              }
            />
          </FormField>
          <FormField label="Default Building Style">
            <select
              value={appearance.buildingStyleDefault}
              onChange={(e) =>
                setAppearance((p) => ({
                  ...p,
                  buildingStyleDefault: e.target
                    .value as TechCityAppearance["buildingStyleDefault"],
                }))
              }
              className="w-full rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] px-3 py-2 text-small text-[var(--color-text)] outline-none"
            >
              <option value="mixed">Varied Architecture (Mixed)</option>
              <option value="box">Precision Rectangular Towers</option>
              <option value="hex">Hexagonal Columns</option>
              <option value="prism">Angular Prisms</option>
            </select>
          </FormField>
        </div>
      </FormSection>
    </TechCityStudioShell>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="rounded-[var(--radius-control)] border border-[var(--hairline)] bg-[var(--color-surface-2)] p-3 space-y-2 block">
      <div className="flex items-center justify-between text-micro">
        <span className="text-[var(--color-subtle)]">{label}</span>
        <span className="font-mono text-[var(--color-text)]">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
