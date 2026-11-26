import type { PortfolioDraft } from "@/lib/cms/types";

export interface ValidationIssue {
  section: string;
  message: string;
}

/**
 * Validates a PortfolioDraft before saving or publishing to the live portfolio.
 * Returns human-readable validation issues.
 */
export function validateDraftForPublication(draft: PortfolioDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!draft.personal.name.trim()) {
    issues.push({ section: "Profile", message: "Full name is required." });
  }
  if (!draft.personal.role.trim()) {
    issues.push({ section: "Profile", message: "Engineering role / title is required." });
  }
  if (!draft.meta.title.trim()) {
    issues.push({ section: "SEO", message: "Browser title is required." });
  }

  // Validate project IDs & required fields
  const projectIds = new Set<string>();
  draft.projects.forEach((p) => {
    if (!p.id.trim()) {
      issues.push({ section: "Projects", message: `Project "${p.name || "Untitled"}" is missing an ID slug.` });
    } else if (!/^[a-z0-9-]+$/.test(p.id)) {
      issues.push({
        section: "Projects",
        message: `Project "${p.name}" has an invalid slug "${p.id}". Use lowercase letters, numbers, and hyphens only.`,
      });
    } else if (projectIds.has(p.id)) {
      issues.push({
        section: "Projects",
        message: `Duplicate project identifier "${p.id}". Each project must have a unique slug.`,
      });
    }
    projectIds.add(p.id);

    if (!p.name.trim() || !p.category.trim() || !p.summary.trim()) {
      issues.push({
        section: "Projects",
        message: `Project "${p.name || p.id}" is missing required name, category, or summary.`,
      });
    }
  });

  // Validate skill categories & items
  const catIds = new Set<string>();
  const validSkillIds = new Set<string>();
  draft.skills.forEach((cat) => {
    if (!cat.id.trim() || !cat.label.trim()) {
      issues.push({ section: "Skills", message: "Every skill category must have an ID and label." });
    }
    if (catIds.has(cat.id)) {
      issues.push({ section: "Skills", message: `Duplicate skill category "${cat.id}".` });
    }
    catIds.add(cat.id);

    cat.items.forEach((skillName) => {
      const slug = skillName
        .toLowerCase()
        .trim()
        .replace(/\+\+/g, "cpp")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (slug) validSkillIds.add(`${cat.id}:${slug}`);
    });
  });

  // Validate custom Tech City connections
  const customEdges = draft.cityConfig?.customEdges || [];
  const edgeKeys = new Set<string>();
  customEdges.forEach((edge) => {
    if (edge.sourceType === edge.targetType && edge.sourceId === edge.targetId) {
      issues.push({
        section: "Tech City Connections",
        message: `Invalid self-connection on "${edge.sourceId}".`,
      });
    }
    const key = `${edge.sourceType}:${edge.sourceId}->${edge.targetType}:${edge.targetId}:${edge.relationshipType}`;
    if (edgeKeys.has(key)) {
      issues.push({
        section: "Tech City Connections",
        message: `Duplicate connection between "${edge.sourceId}" and "${edge.targetId}".`,
      });
    }
    edgeKeys.add(key);
  });

  return issues;
}
