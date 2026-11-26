"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProjectCaseStudyClient } from "@/components/work/ProjectCaseStudyClient";

function DynamicCaseStudyInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return <ProjectCaseStudyClient slug={id} />;
}

export default function DynamicWorkViewPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-20 font-mono text-micro text-subtle">
          Loading case study...
        </div>
      }
    >
      <DynamicCaseStudyInner />
    </Suspense>
  );
}
