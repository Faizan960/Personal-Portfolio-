/**
 * Project presentation rules, shared by the Work section and the case-study
 * pages.
 *
 * These live outside both consumers on purpose. A repository label and a status
 * label are claims about Faizan's work, and if the card and the case-study page
 * each owned their own copy of the mapping they could drift — one saying "Private
 * Repository" while the other rendered a live link to the same repo. One source,
 * one answer, everywhere.
 */

import {
  projects as baselineProjects,
  hasProjectDetail,
  type Project,
  type ProjectStatus,
} from "@/data/portfolio";

/**
 * Status wording. Every one of these is deliberately non-committal: none implies
 * shipped, deployed, released, validated or complete.
 */
export const STATUS_LABELS: Record<NonNullable<ProjectStatus>, string> = {
  concept: "Concept",
  "in-development": "In Development",
  planned: "Planned",
};

/**
 * Repository wording.
 *
 * `development` reads "Repository in development" rather than a bare "In
 * Development" for two reasons: it describes the repository slot it occupies
 * rather than the project (the status marker already says that), and without the
 * qualifier the two would print the identical string twice on the same surface.
 * It also keeps `development` distinguishable from `unknown`, which renders
 * nothing at all.
 */
export const REPO_LABELS = {
  public: "View on GitHub",
  private: "Private Repository",
  development: "Repository in development",
} as const;

/**
 * How a project's repository may be shown. Three shapes rather than a nullable
 * URL, because "there is a label but no link" is a real state that a
 * `string | null` cannot express.
 */
export type RepoPresentation =
  | { kind: "link"; href: string; label: string }
  | { kind: "label"; label: string }
  | { kind: "none" };

/**
 * The single decision point for repository UI. Nothing else in the codebase may
 * read `project.github` to decide whether to render a link.
 *
 * A URL being present in the data says nothing about whether a visitor can open
 * it — repositories go public, go private, or do not exist yet. So the branch is
 * on `visibility` alone, and the switch is exhaustive over the union: adding a
 * fifth visibility state becomes a compile error here rather than a silently
 * missing branch that ships a misleading link.
 */
export function presentRepository(project: Project): RepoPresentation {
  switch (project.visibility) {
    case "public":
      // Public, but still only a link if there is somewhere to go. A missing URL
      // on a public repository is a data gap, not a reason to invent one.
      return project.github !== null
        ? { kind: "link", href: project.github, label: REPO_LABELS.public }
        : { kind: "none" };

    case "private":
      return { kind: "label", label: REPO_LABELS.private };

    case "development":
      return { kind: "label", label: REPO_LABELS.development };

    case "unknown":
      // Not verified. Asserting either "public" or "private" would be a guess.
      return { kind: "none" };
  }
}

/** The status label, or `null` when the data asserts no status. */
export function statusLabel(project: Project): string | null {
  return project.status !== null ? STATUS_LABELS[project.status] : null;
}

/** `true` only while a project is actively being built — drives the live dot. */
export function statusIsActive(project: Project): boolean {
  return project.status === "in-development";
}

/** Only http(s) destinations get a new tab; a local `/work/…` route must not. */
export function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

/**
 * Resolves a project's case study href cleanly for static export (`output: "export"`).
 * Prebuilt baseline projects with detail keep `/work/<slug>/`; newly created CMS/DB
 * projects route through `/work/view/?id=<slug>` so they load live without rebuilding.
 */
export function resolveProjectDetailHref(
  project: Pick<Project, "id" | "detail">,
  fallbackSummary?: string,
): string | null {
  const isPrebuilt = baselineProjects.some(
    (p) => p.id === project.id && hasProjectDetail(p),
  );
  if (isPrebuilt) {
    return `/work/${project.id}/`;
  }
  const hasRichDetail =
    Boolean(project.detail.problem) ||
    Boolean(project.detail.solution) ||
    Boolean(project.detail.contribution) ||
    project.detail.features.length > 0 ||
    project.detail.architecture.length > 0 ||
    project.detail.challenges.length > 0 ||
    project.detail.lessons.length > 0 ||
    project.detail.futureScope.length > 0 ||
    project.detail.screenshots.length > 0 ||
    project.detail.reservedSections.length > 0 ||
    Boolean(fallbackSummary);
  if (!hasRichDetail) return null;
  return `/work/view/?id=${encodeURIComponent(project.id)}`;
}
