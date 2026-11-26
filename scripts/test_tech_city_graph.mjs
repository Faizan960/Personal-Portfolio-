import assert from "assert";
import { getBaselinePortfolio } from "../src/lib/cms/storage";
import { buildTechCityGraph } from "../src/lib/city/graphBuilder";

console.log("=== TECH CITY DETERMINISTIC GRAPH & LAYOUT VALIDATION ===");

const baseline = getBaselinePortfolio();
const g1 = buildTechCityGraph(baseline);
const g2 = buildTechCityGraph(baseline);

// 1. Central HQ check
const hqs = g1.nodes.filter((n) => n.type === "hq");
assert.strictEqual(hqs.length, 1, "Expected exactly 1 Central HQ node");
assert.strictEqual(hqs[0].label, baseline.personal.name);

// 2. Districts match actual categories
const districts = g1.nodes.filter((n) => n.type === "district");
assert.strictEqual(
  districts.length,
  baseline.skills.length,
  "District count must match actual portfolio skill categories"
);

// 3. Skill buildings match actual skills
const skills = g1.nodes.filter((n) => n.type === "skill");
const totalPortfolioSkills = baseline.skills.reduce((sum, c) => sum + c.items.length, 0);
assert.strictEqual(
  skills.length,
  totalPortfolioSkills,
  "Skill tower count must match actual skills"
);

// 4. Projects match actual projects
const projects = g1.nodes.filter((n) => n.type === "project");
assert.strictEqual(
  projects.length,
  baseline.projects.length,
  "Project landmark count must match actual projects"
);

// 5. Technologies match unique actual project.tech entries
const expectedTechs = new Set();
baseline.projects.forEach((p) => p.tech.forEach((t) => expectedTechs.add(t.toLowerCase())));
const techs = g1.nodes.filter((n) => n.type === "technology");
assert.strictEqual(
  techs.length,
  expectedTechs.size,
  "Technology satellites must match actual project technologies only"
);

// 6. GramCare must have 0 technology links (tech: [] in portfolio.ts)
const gramcareTechEdges = g1.edges.filter(
  (e) =>
    e.type === "project-tech" &&
    (e.sourceId === "project:gramcare" || e.targetId === "project:gramcare")
);
assert.strictEqual(gramcareTechEdges.length, 0, "GramCare has no confirmed tech stack yet");

// 7. Determinism check
assert.strictEqual(g1.nodes.length, g2.nodes.length);
assert.strictEqual(g1.edges.length, g2.edges.length);
g1.nodes.forEach((n1, i) => {
  const n2 = g2.nodes[i];
  assert.strictEqual(n1.id, n2.id);
  assert.deepStrictEqual(n1.position, n2.position, `Position for ${n1.id} must be deterministic`);
});

// 8. Building non-overlap check
for (let i = 0; i < skills.length; i++) {
  for (let j = i + 1; j < skills.length; j++) {
    const d = Math.hypot(
      skills[i].position.x - skills[j].position.x,
      skills[i].position.z - skills[j].position.z
    );
    assert(d >= 1.5, `Skill buildings ${skills[i].id} and ${skills[j].id} too close: ${d}`);
  }
}

// 9. Floating project non-overlap & HQ clearance check
for (let i = 0; i < projects.length; i++) {
  const p = projects[i];
  const hqDist = Math.hypot(p.position.x, p.position.z);
  assert(hqDist >= 4.4, `Project ${p.id} overlaps HQ clearance: ${hqDist}`);
  for (let j = i + 1; j < projects.length; j++) {
    const q = projects[j];
    const d = Math.hypot(p.position.x - q.position.x, p.position.z - q.position.z);
    assert(d >= 3.8, `Projects ${p.id} and ${q.id} too close: ${d}`);
  }
}

// 10. Manual position override support
const gOverride = buildTechCityGraph(baseline, {
  "project:gramcare": { x: 12.5, y: 8.5, z: -4.0 },
});
const gc = gOverride.nodeMap.get("project:gramcare");
assert.deepStrictEqual(gc.position, { x: 12.5, y: 8.5, z: -4.0 });

console.log(`PASSED: ${g1.nodes.length} nodes (${districts.length} districts, ${skills.length} skills, ${projects.length} projects, ${techs.length} techs), ${g1.edges.length} verified edges, 0 overlaps.`);
