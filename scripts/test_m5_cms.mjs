import assert from "assert";
import { getBaselinePortfolio, getDefaultSectionsConfig, sanitizeDraft } from "../src/lib/cms/storage";
import { validateDraftForPublication } from "../src/lib/portfolio/validation";
import { compareLocalAndRemoteDrafts, mergeDrafts } from "../src/lib/portfolio/reconciliation";
import { mapDatabaseToDraft } from "../src/lib/portfolio/adapter";
import { buildTechCityGraph } from "../src/lib/city/graphBuilder";
import { resolveProjectDetailHref } from "../src/lib/project";

console.log("=== M5 CMS, ADAPTER, RECONCILIATION & TECH CITY INTEGRATION TESTS ===");

// 1. Baseline & Validation
const baseline = getBaselinePortfolio();
const baselineIssues = validateDraftForPublication(baseline);
assert.strictEqual(baselineIssues.length, 0, "Baseline portfolio must pass publication validation");

const invalidDraft = {
  ...baseline,
  projects: [
    ...baseline.projects,
    {
      ...baseline.projects[0],
      id: "Invalid Slug!",
      name: "",
      skillIds: ["nonexistent:fake"],
    },
  ],
};
const invalidIssues = validateDraftForPublication(invalidDraft);
assert.ok(invalidIssues.length >= 2, "Validation must catch invalid project slugs and missing names");
console.log("[PASS] 1. Publication validation catches bad slugs, names, and broken links");

// 2. Reconciliation & Safe Conflict Merge
const localDraft = {
  ...baseline,
  personal: { ...baseline.personal, statement: "Edited locally in browser" },
  projects: [
    ...baseline.projects,
    {
      ...baseline.projects[0],
      id: "local-only-project",
      name: "Local Only Prototype",
      tech: ["TypeScript"],
      isPublished: false,
    },
  ],
};
const remoteDraft = {
  ...baseline,
  projects: baseline.projects.map((p) =>
    p.id === "gramcare" ? { ...p, summary: "Remote DB summary update" } : p
  ),
};

const report = compareLocalAndRemoteDrafts(localDraft, remoteDraft);
assert.strictEqual(report.hasDifferences, true, "Reconciliation must detect local vs remote differences");
assert.ok(report.localOnlyCount >= 1, "Reconciliation must detect local-only projects");
assert.ok(report.modifiedCount >= 2, "Reconciliation must detect modified profile and projects");

const importedMerge = mergeDrafts(localDraft, remoteDraft, "import-local");
assert.strictEqual(importedMerge.personal.statement, "Edited locally in browser");
assert.ok(importedMerge.projects.some((p) => p.id === "local-only-project"));

const remoteMerge = mergeDrafts(localDraft, remoteDraft, "keep-remote");
assert.strictEqual(
  remoteMerge.projects.find((p) => p.id === "gramcare")?.summary,
  "Remote DB summary update"
);
console.log("[PASS] 2. Local vs Remote reconciliation and merge strategies work deterministically");

// 3. Database Adapter Mapping + GramCare Repository Transparency vs Publication
const mapped = mapDatabaseToDraft({
  settings: {
    id: "default",
    full_name: "Faizan Patel",
    wordmark: "FAIZAN PATEL",
    initials: "FP",
    role: "Computer Engineering Student",
    descriptor: "Descriptor",
    statement: "Statement",
    statement_alternatives: [],
    location: "Mumbai",
    resume_href: null,
    meta_title: "Faizan Patel",
    meta_description: "Portfolio",
    site_url: null,
    hero_kicker: "Portfolio",
    hero_primary_cta: { label: "Work", targetId: "work" },
    hero_secondary_cta: { label: "Contact", targetId: "contact" },
    about_kicker: "About",
    about_heading: "About Me",
    about_paragraphs: ["Hello"],
    about_metadata: [],
    contact_kicker: "Contact",
    contact_heading: "Connect",
    contact_statement: "Reach out",
    social_links: [],
    recognition_copy: {
      kicker: "Recognition",
      heading: "Recognition",
      achievementsLabel: "Achievements",
      certificationsLabel: "Certifications",
    },
    nav_sections: [],
    sections_config: getDefaultSectionsConfig(),
  },
  categories: [
    { id: "ai-ml", label: "AI & ML", index_label: "01", caption: "ML work", sort_order: 0, is_visible: true },
  ],
  skills: [
    { id: "ai-ml:python", category_id: "ai-ml", name: "Python", sort_order: 0, is_visible: true },
  ],
  projects: [
    {
      id: "gramcare",
      index_label: "01",
      name: "GramCare",
      full_title: null,
      category: "Healthcare AI",
      summary: "Offline health monitor",
      featured: true,
      status: "in-development",
      visibility: "development",
      is_published: true,
      github: null,
      live_url: null,
      image: null,
      detail: {
        problem: null,
        solution: null,
        features: [],
        architecture: [],
        contribution: null,
        challenges: [],
        lessons: [],
        futureScope: [],
        screenshots: [],
        reservedSections: [],
      },
      sort_order: 0,
    },
    {
      id: "hidden-draft-proj",
      index_label: "02",
      name: "Hidden Draft",
      full_title: null,
      category: "Internal",
      summary: "Secret project",
      featured: false,
      status: "planned",
      visibility: "private",
      is_published: false,
      github: null,
      live_url: null,
      image: null,
      detail: {
        problem: null,
        solution: null,
        features: [],
        architecture: [],
        contribution: null,
        challenges: [],
        lessons: [],
        futureScope: [],
        screenshots: [],
        reservedSections: [],
      },
      sort_order: 1,
    },
  ],
  technologies: [{ id: "fastapi", name: "FastAPI", normalized_name: "fastapi", color_override: "#00ffaa", is_visible: true, description: "Backend API" }],
  projectTechnologies: [{ project_id: "gramcare", technology_id: "fastapi" }],
  projectSkills: [{ project_id: "gramcare", skill_id: "ai-ml:python" }],
  experience: [],
  experienceHighlights: [],
  experienceTechnologies: [],
  education: [],
  educationDetails: [],
  certifications: [],
  achievements: [],
  exploring: [],
  mediaAssets: [],
  globeSettings: {
    id: "default",
    auto_rotate_speed: 0.08,
    idle_resume_ms: 3000,
    default_expansion: 1.0,
    core_label: "Faizan HQ",
    core_subtitle: "Engineering Core",
    visual_config: { palettePreset: "aurora-teal", bloomEnabled: false },
  },
  globeNodeLayouts: [
    {
      entity_type: "skill",
      entity_id: "ai-ml:python",
      position_x: 12,
      position_y: null,
      position_z: -8,
      radius: 2.2,
      color_override: "#ffaa00",
      style_preset: "hex",
      is_locked: true,
      sort_order: 0,
      is_visible: true,
    },
  ],
  globeCustomEdges: [
    {
      id: "custom-1",
      source_type: "core",
      source_id: "portfolio",
      target_type: "technology",
      target_id: "fastapi",
      relationship_type: "integrates",
      strength: 0.9,
      is_visible: true,
    },
  ],
});

assert.strictEqual(mapped.projects.find((p) => p.id === "gramcare")?.visibility, "development");
assert.strictEqual(mapped.projects.find((p) => p.id === "gramcare")?.isPublished, true);
assert.strictEqual(mapped.projects.find((p) => p.id === "hidden-draft-proj")?.isPublished, false);
assert.deepStrictEqual(mapped.projects.find((p) => p.id === "gramcare")?.skillIds, ["ai-ml:python"]);
assert.strictEqual(mapped.cityConfig?.appearance.palettePreset, "aurora-teal");
assert.strictEqual(mapped.cityConfig?.appearance.bloomEnabled, false);
console.log("[PASS] 3. Adapter maps Supabase rows cleanly while preserving repository visibility & publication separation");

// 4. Tech City Graph Respects CMS Overrides, Hidden Projects, & Custom Links
const publicCityGraph = buildTechCityGraph(mapped, undefined, { includeUnpublished: false });
assert.ok(publicCityGraph.nodeMap.has("project:gramcare"), "Published GramCare landmark must appear in public Tech City");
assert.ok(!publicCityGraph.nodeMap.has("project:hidden-draft-proj"), "Unpublished draft project must stay hidden from public Tech City");
const previewCityGraph = buildTechCityGraph(mapped, undefined, { includeUnpublished: true });
assert.ok(previewCityGraph.nodeMap.has("project:hidden-draft-proj"), "Unpublished draft project appears in admin preview Tech City");
const pythonNode = publicCityGraph.nodeMap.get("skill:ai-ml:python");
assert.strictEqual(pythonNode?.accentHex, "#ffaa00", "Skill layout color override must apply");
assert.strictEqual(pythonNode?.position.x, 12, "Locked custom X coordinate must apply");
assert.strictEqual(pythonNode?.position.z, -8, "Locked custom Z coordinate must apply");
assert.ok(
  publicCityGraph.edges.some(
    (e) =>
      (e.sourceId === "hq:owner" && e.targetId === "tech:fastapi") ||
      (e.sourceId === "tech:fastapi" && e.targetId === "hq:owner"),
  ),
  "Custom CMS edges must connect source and target in Tech City",
);
console.log("[PASS] 4. Tech City graph honors CMS layout overrides, hidden projects, and custom links");

// 5. Project Case Study Static Export Href Resolution
const gramcareHref = resolveProjectDetailHref(mapped.projects[0]);
const newDbProjHref = resolveProjectDetailHref(
  {
    id: "cloud-pipeline",
    detail: {
      problem: "Manual deploys",
      solution: "Automated pipeline",
      features: [],
      architecture: [],
      contribution: null,
      challenges: [],
      lessons: [],
      futureScope: [],
      screenshots: [],
      reservedSections: [],
    },
  },
  "Summary",
);
assert.strictEqual(gramcareHref, "/work/gramcare/", "Prebuilt GramCare keeps canonical /work/gramcare/");
assert.strictEqual(newDbProjHref, "/work/view/?id=cloud-pipeline", "Newly added DB projects resolve to /work/view/?id=...");
console.log("[PASS] 5. Case study links support both prebuilt slugs and dynamic DB projects under static export");

// 6. Snapshot cityConfig Normalization (SQL-shaped v1 vs CMS-shaped vs legacy backup)
const sqlShapedDraft = sanitizeDraft({
  ...baseline,
  cityConfig: {
    coreLabel: "Faizan HQ SQL",
    coreSubtitle: "Systems Core",
    visualConfig: { palettePreset: "solar-gold", bloom: false, fogDensity: 0.02 },
    layoutConfig: { cameraZ: 3.15 },
    layouts: [],
    customEdges: [],
  },
});
assert.strictEqual(sqlShapedDraft.cityConfig?.appearance.coreLabel, "Faizan HQ SQL");
assert.strictEqual(sqlShapedDraft.cityConfig?.appearance.coreSubtitle, "Systems Core");
assert.strictEqual(sqlShapedDraft.cityConfig?.appearance.palettePreset, "solar-gold");
assert.strictEqual(sqlShapedDraft.cityConfig?.appearance.bloomEnabled, false);
assert.strictEqual(sqlShapedDraft.cityConfig?.appearance.fogDensity, 0.02);

const legacyBackupDraft = sanitizeDraft({
  ...baseline,
  cityConfig: undefined,
  sectionsConfig: undefined,
});
assert.strictEqual(legacyBackupDraft.cityConfig?.appearance.palettePreset, "cyber-navy");
assert.ok(legacyBackupDraft.sectionsConfig?.order.includes("tech-city"));
console.log("[PASS] 6. sanitizeDraft handles SQL-shaped snapshots, CMS configs, and legacy backups cleanly");

console.log("=== ALL M5 INTEGRATION TESTS PASSED ===");
