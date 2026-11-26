"use client";

import React from "react";
import { usePublicPortfolio } from "@/lib/portfolio/publicContext";
import { getDefaultSectionsConfig } from "@/lib/cms/storage";
import type { HomepageSectionId } from "@/lib/cms/types";
import { Hero } from "@/components/hero/Hero";
import { TechCity } from "@/components/city/TechCity";
import { About } from "@/components/About";
import { Skills } from "@/components/Skills";
import { Projects } from "@/components/Projects";
import { Experience } from "@/components/Experience";
import { Education } from "@/components/Education";
import { CurrentlyExploring } from "@/components/CurrentlyExploring";
import { Recognition } from "@/components/Recognition";
import { Contact } from "@/components/Contact";

export function HomeContent() {
  const { draft, isPreviewMode } = usePublicPortfolio();
  const sectionsConfig = draft.sectionsConfig ?? getDefaultSectionsConfig();

  const renderSection = (id: HomepageSectionId) => {
    const cfg = sectionsConfig.sections[id];
    if (!cfg || (!cfg.locked && !cfg.visible)) {
      return null;
    }

    switch (id) {
      case "hero":
        return <Hero key="hero" />;
      case "tech-city":
        return (
          <TechCity
            key="tech-city"
            draftOverride={draft}
            includeUnpublished={isPreviewMode}
          />
        );
      case "about":
        return <About key="about" />;
      case "skills":
        return <Skills key="skills" />;
      case "work":
        return <Projects key="work" />;
      case "experience":
        return <Experience key="experience" />;
      case "education":
        return <Education key="education" />;
      case "exploring":
        return <CurrentlyExploring key="exploring" />;
      case "recognition":
        return <Recognition key="recognition" />;
      case "contact":
        return <Contact key="contact" />;
      default:
        return null;
    }
  };

  return <>{sectionsConfig.order.map((id) => renderSection(id))}</>;
}
