"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsVisible, useReducedMotion } from "@/lib/hooks";
import type { PortfolioDraft } from "@/lib/cms/types";
import {
  getInitialCityData,
  loadLiveCityData,
  subscribeToCityDataUpdates,
} from "@/lib/city/dataProvider";
import { buildTechCityGraph } from "@/lib/city/graphBuilder";
import { TechCityRenderer } from "@/lib/city/cityRenderer";
import { CityControls } from "./CityControls";
import { CityInfoPanel } from "./CityInfoPanel";
import { CityAccessibleList } from "./CityAccessibleList";

export interface TechCityProps {
  /** Optional injected draft for Admin live previews or PublicPortfolioProvider */
  draftOverride?: PortfolioDraft;
  /** Compact height & stripped section chrome when embedded inside Admin previews */
  embeddedPreview?: boolean;
  /** Include unpublished projects when previewing from Admin CMS */
  includeUnpublished?: boolean;
}

export function TechCity({
  draftOverride,
  embeddedPreview = false,
  includeUnpublished = false,
}: TechCityProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<TechCityRenderer | null>(null);

  const reducedMotion = useReducedMotion();
  const isVisible = useIsVisible(sectionRef);

  const [snapshot, setSnapshot] = useState(getInitialCityData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [webglError, setWebglError] = useState(false);

  const tourTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tourIndexRef = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const activeDraft = draftOverride ?? snapshot.draft;

  // Sync live published data from Supabase when running standalone on public page
  useEffect(() => {
    if (draftOverride) return;
    let active = true;
    loadLiveCityData()
      .then((live) => {
        if (!active) return;
        setSnapshot((prev) => {
          const prevSig = JSON.stringify({
            p: prev.draft.personal,
            s: prev.draft.skills,
            pr: prev.draft.projects,
            cc: prev.draft.cityConfig,
          });
          const nextSig = JSON.stringify({
            p: live.draft.personal,
            s: live.draft.skills,
            pr: live.draft.projects,
            cc: live.draft.cityConfig,
          });
          return prevSig === nextSig ? prev : live;
        });
      })
      .catch(() => {
        // Keep baseline on error
      });
    const unsubscribe = subscribeToCityDataUpdates((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [draftOverride]);

  // Build deterministic 3D city graph from actual portfolio records
  const graph = useMemo(
    () => buildTechCityGraph(activeDraft, undefined, { includeUnpublished }),
    [activeDraft, includeUnpublished]
  );

  const sectionSetting = activeDraft.sectionsConfig?.sections?.["tech-city"];
  const sectionTitle = sectionSetting?.headingOverride || "Tech City";
  const sectionIntro =
    sectionSetting?.introOverride ||
    "Domains form districts, skills rise as towers, projects float above, and verified technologies orbit them.";

  const stopTour = useCallback(() => {
    if (tourTimerRef.current) {
      clearInterval(tourTimerRef.current);
      tourTimerRef.current = null;
    }
    setTourActive(false);
  }, []);

  const handleSelectNode = useCallback(
    (id: string | null) => {
      stopTour();
      setSelectedId(id);
      rendererRef.current?.selectNode(id);
    },
    [stopTour]
  );

  // Initialize Three.js WebGL renderer client-side only
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const compact = window.matchMedia("(max-width: 767px)").matches;
    let instance: TechCityRenderer | null = null;
    try {
      instance = new TechCityRenderer(canvas, graph, {
        reducedMotion,
        isCompact: compact,
        appearance: activeDraft.cityConfig?.appearance,
        onSelectNode: (id) => {
          stopTour();
          setSelectedId(id);
        },
        onHoverNode: (id) => {
          setHoveredId(id);
        },
      });
      rendererRef.current = instance;
      if (selectedIdRef.current) {
        instance.selectNode(selectedIdRef.current);
      }
      setWebglError(false);
    } catch {
      setWebglError(true);
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      instance?.resize();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      instance?.destroy();
      rendererRef.current = null;
    };
  }, [graph, activeDraft.cityConfig?.appearance, reducedMotion, stopTour]);

  // Pause rendering when section scrolls off-screen
  useEffect(() => {
    rendererRef.current?.setVisible(isVisible);
  }, [isVisible]);

  // Escape key closes active panel and resets view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSelectNode(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSelectNode]);

  // Project tour stepper
  const handleToggleTour = useCallback(() => {
    if (tourTimerRef.current) {
      stopTour();
      handleSelectNode(null);
      return;
    }
    const projectNodes = graph.nodes.filter((n) => n.type === "project");
    if (projectNodes.length === 0) return;

    const advance = () => {
      const target = projectNodes[tourIndexRef.current % projectNodes.length]!;
      tourIndexRef.current += 1;
      setSelectedId(target.id);
      rendererRef.current?.selectNode(target.id);
    };

    setTourActive(true);
    advance();
    tourTimerRef.current = setInterval(advance, 5500);
  }, [graph.nodes, handleSelectNode, stopTour]);

  useEffect(() => {
    return () => {
      if (tourTimerRef.current) clearInterval(tourTimerRef.current);
    };
  }, []);

  const selectedNode = selectedId ? graph.nodeMap.get(selectedId) ?? null : null;
  const hoveredNode = hoveredId ? graph.nodeMap.get(hoveredId) ?? null : null;

  if (embeddedPreview) {
    return (
      <section
        id="tech-city-preview"
        ref={sectionRef}
        aria-label="Tech City 3D Preview"
        className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#02040a] select-none"
      >
        {!webglError ? (
          <div className="relative h-[460px] w-full overflow-hidden bg-[#02040a] sm:h-[520px]">
            <canvas
              ref={canvasRef}
              aria-label="Interactive 3D Tech City Preview"
              className="block h-full w-full cursor-grab touch-none"
            />
            <CityControls
              graph={graph}
              selectedId={selectedId}
              hoveredNode={hoveredNode}
              tourActive={tourActive}
              onSelectNode={handleSelectNode}
              onToggleTour={handleToggleTour}
              onZoomIn={() => rendererRef.current?.zoomIn()}
              onZoomOut={() => rendererRef.current?.zoomOut()}
              onResetView={() => handleSelectNode(null)}
            />
            <CityInfoPanel
              node={selectedNode}
              graph={graph}
              onSelectNode={handleSelectNode}
              onClose={() => handleSelectNode(null)}
            />
          </div>
        ) : (
          <CityAccessibleList
            graph={graph}
            webglUnavailable={webglError}
            onSelectNode={handleSelectNode}
          />
        )}
      </section>
    );
  }

  return (
    <section
      id="tech-city"
      ref={sectionRef}
      aria-labelledby="tech-city-heading"
      className="relative border-y border-white/[0.08] bg-[#02040a] py-14 md:py-20 overflow-hidden select-none"
    >
      {/* Ambient top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.08),transparent_65%)]"
      />

      <div className="shell shell-wide relative z-10">
        {/* Section Heading */}
        <div className="mx-auto mb-6 max-w-3xl text-center md:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            Interactive 3D Ecosystem
          </div>
          <h2
            id="tech-city-heading"
            className="text-3xl font-semibold tracking-tight md:text-5xl bg-gradient-to-r from-[#c4b5fd] via-[#67e8f9] to-[#fcd34d] bg-clip-text text-transparent"
          >
            {sectionTitle}
          </h2>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[#9fb0c8] md:text-[16px]">
            {sectionIntro}
          </p>
        </div>

        {/* 3D City Viewport */}
        {!webglError ? (
          <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-[#02040a] shadow-[0_0_70px_rgba(0,0,0,0.9)] sm:h-[640px] lg:h-[720px]">
            <canvas
              ref={canvasRef}
              aria-label="Interactive 3D Tech City visualizing domains, skills, projects, and technologies"
              className="block h-full w-full cursor-grab touch-none"
            />

            <CityControls
              graph={graph}
              selectedId={selectedId}
              hoveredNode={hoveredNode}
              tourActive={tourActive}
              onSelectNode={handleSelectNode}
              onToggleTour={handleToggleTour}
              onZoomIn={() => rendererRef.current?.zoomIn()}
              onZoomOut={() => rendererRef.current?.zoomOut()}
              onResetView={() => handleSelectNode(null)}
            />

            <CityInfoPanel
              node={selectedNode}
              graph={graph}
              onSelectNode={handleSelectNode}
              onClose={() => handleSelectNode(null)}
            />
          </div>
        ) : null}

        {/* Accessible Fallback / Screen-Reader Directory */}
        <CityAccessibleList
          graph={graph}
          webglUnavailable={webglError}
          onSelectNode={handleSelectNode}
        />
      </div>
    </section>
  );
}
