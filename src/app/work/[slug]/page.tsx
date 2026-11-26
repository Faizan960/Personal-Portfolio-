import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  hasProjectDetail,
  meta as siteMeta,
  personal,
  projects,
  type Project,
} from "@/data/portfolio";
import type { MutableProject } from "@/lib/cms/types";
import { statusLabel } from "@/lib/project";
import { ProjectCaseStudyClient } from "@/components/work/ProjectCaseStudyClient";

export function generateStaticParams() {
  return projects
    .filter(hasProjectDetail)
    .map((project) => ({ slug: project.id }));
}

interface PageParams {
  params: Promise<{ slug: string }>;
}

function findProject(slug: string): Project | undefined {
  return projects.find(
    (project) => project.id === slug && hasProjectDetail(project),
  );
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const project = findProject(slug);

  if (!project) {
    return { title: siteMeta.title };
  }

  const status = statusLabel(project);
  const name = project.fullTitle ?? project.name;

  return {
    title: `${project.name} — ${personal.name}`,
    description: project.summary,
    openGraph: {
      type: "article",
      title: status !== null ? `${name} (${status})` : name,
      description: project.summary,
    },
  };
}

export default async function ProjectDetailPage({ params }: PageParams) {
  const { slug } = await params;
  const project = findProject(slug);

  if (!project) {
    notFound();
  }

  return (
    <ProjectCaseStudyClient
      slug={slug}
      fallbackProject={project as unknown as MutableProject}
    />
  );
}
