/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CENTRAL CONTENT SOURCE
 * ─────────────────────────────────────────────────────────────────────────────
 * Every visible string, link and list on the site is read from this file.
 * No component hardcodes content. To grow the portfolio, edit only this file.
 *
 * CONTENT INTEGRITY RULE
 * Nothing here is invented. Anything not yet verified is `null` or an empty
 * array, and components render an explicit, designed "pending" state for those
 * values — so the site stays truthful while still looking finished.
 *
 * In particular this file does NOT contain: project metrics, user counts,
 * accuracy figures, model architectures, datasets, credential IDs, issue dates,
 * CGPAs, coursework, or responsibilities beyond those actually stated.
 *
 * Search for `TODO` to find every field awaiting real information.
 *
 * PRIVACY
 * Faizan's phone number is deliberately absent. This is a static export, so
 * every value in this file is shipped to every visitor's browser inside the JS
 * bundle — "present but not rendered" would still publish it. If a phone number
 * is ever needed, put it behind a server-side form or an env-injected runtime
 * value, never here. The postal code from the résumé is omitted for the same
 * reason; `personal.location` carries city and country only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface SocialLink {
  id: "email" | "linkedin" | "github";
  label: string;
  /** Text shown to the user, e.g. an address or handle. `null` until provided. */
  handle: string | null;
  /** Full `mailto:` or `https:` URL. `null` until provided. */
  href: string | null;
}

export interface SkillCategory {
  id: string;
  label: string;
  /** Two-digit ordinal used as a typographic accent. */
  index: string;
  /** Short factual framing of the category. */
  caption: string;
  items: readonly string[];
}

/**
 * Where a project actually is. Drives an honest status label instead of implying
 * everything is shipped. `null` when the status has not been stated — the UI then
 * shows no status chip at all rather than guessing one.
 */
export type ProjectStatus = "concept" | "in-development" | "planned" | null;

/**
 * How the source repository may be presented.
 *
 * This is a FOUR-state field on purpose. Repository visibility changes over time,
 * and a two-state public/private model forces a guess whenever the truth is
 * "no repository yet" or "not currently known" — which is how misleading links
 * get shipped.
 *
 *   "public"       verified reachable. The only state that renders a real link.
 *   "private"      exists but not publicly reachable. Renders a label, no link.
 *   "development"  actively being built; no published repository to link yet.
 *   "unknown"      not verified. Renders nothing at all — never a guess.
 *
 * Components MUST branch on this field and never infer visibility from
 * `github !== null`. A URL being present says nothing about whether a visitor
 * can open it.
 */
export type ProjectVisibility =
  | "public"
  | "private"
  | "development"
  | "unknown";

/**
 * Reserved structure for per-project case studies. Every field is empty until
 * real information exists; the UI renders only what is populated, so a project
 * with just a summary shows just a summary. This is the expansion surface for
 * future `/work/<id>` detail routes.
 */
export interface ProjectDetail {
  /** The problem the project addresses. */
  problem: string | null;
  /** The approach taken or proposed. */
  solution: string | null;
  features: readonly string[];
  architecture: readonly string[];
  /** Faizan's specific contribution, for team projects. */
  contribution: string | null;
  challenges: readonly string[];
  lessons: readonly string[];
  futureScope: readonly string[];
  screenshots: readonly { src: string; alt: string }[];
  /**
   * Named placeholder sections for a project whose case study is planned but not
   * yet written. `body: null` renders as a reserved row, never as fake prose.
   */
  reservedSections: readonly { label: string; body: string | null }[];
}

export interface Project {
  id: string;
  /** Two-digit ordinal used as a typographic accent. */
  index: string;
  name: string;
  /** Expanded title, when the short name is a product name. `null` otherwise. */
  fullTitle: string | null;
  /** Domain framing, e.g. "AI / Machine Learning". */
  category: string;
  summary: string;
  /** Confirmed technologies only. Empty when the stack has not been stated. */
  tech: readonly string[];
  /**
   * Promotes one project to the section's lead surface. More than one `true` is
   * allowed — the layout leads with the first and treats the rest normally.
   */
  featured: boolean;
  /** Where the work actually stands. `null` asserts nothing. */
  status: ProjectStatus;
  /** See `ProjectVisibility` — the UI branches on this, never on `github`. */
  visibility: ProjectVisibility;
  /**
   * Repository URL. Recorded independently of `visibility` so publishing is a
   * one-field change, but it is only ever rendered as an anchor when
   * `visibility === "public"`.
   */
  github: string | null;
  /** Deployed URL. `null` means there is no live deployment — show no button. */
  liveUrl: string | null;
  /** Path under `/public`. `null` renders the generative fallback visual. */
  image: string | null;
  detail: ProjectDetail;
}

export interface ExperienceItem {
  id: string;
  role: string;
  organisation: string;
  /** Human-readable range. Use "Present" for ongoing roles. */
  period: string;
  location: string;
  /** Stated length of the engagement, when known. */
  duration: string | null;
  /** `true` while the role is ongoing — renders a live indicator. */
  current: boolean;
  summary: string;
  /**
   * Concrete, stated activities only. Intentionally EMPTY for an ongoing role
   * until real outcomes exist — do not add speculative bullet points here.
   */
  highlights: readonly string[];
  tech: readonly string[];
}

export interface EducationItem {
  id: string;
  qualification: string;
  /** Awarding body, e.g. "Diploma" vs "BE" — drives the credential label. */
  award: string;
  institution: string | null;
  period: string | null;
  location: string | null;
  current: boolean;
  details: readonly string[];
}

export interface Certification {
  id: string;
  name: string;
  /** Awarding body or associated educator. `null` when not stated. */
  issuer: string | null;
  /** TODO fields — never invent these. */
  issued: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  /** Result or placement, e.g. "4th Place". `null` when not applicable. */
  result: string | null;
  /** Neutral framing of what the achievement was. */
  context: string | null;
  date: string | null;
}

export interface ExploringItem {
  id: string;
  index: string;
  label: string;
  caption: string;
}

export interface NavSection {
  id: string;
  label: string;
  /**
   * The section's own numeral, as printed by its `SectionHeading`. Carried here
   * rather than derived from array position so the mobile menu and the section
   * itself never disagree — the nav is a subset of the page, so positional
   * numbering would label Contact "05" while the section reads "08".
   */
  index: string;
}

/* ── Personal ──────────────────────────────────────────────────────────────── */

export const personal = {
  name: "Faizan Patel",
  /** Short form used by the navigation wordmark. */
  wordmark: "FAIZAN",
  initials: "FP",
  role: "Computer Engineering Student",
  descriptor: "Exploring AI, Web Development, Cloud Computing & DevOps.",
  /** The one-line thesis of the site. */
  statement: "Building with code, AI and curiosity.",
  /** City and country only — see the PRIVACY note at the top of this file. */
  location: "Mumbai, India" as string | null,
  /** TODO: set to a path under /public (e.g. "/faizan-patel-cv.pdf"). */
  resumeHref: null as string | null,
} as const;

/**
 * Alternative hero copy, kept for later iteration rather than deleted. Not
 * rendered anywhere today — `personal.statement` is the one in use.
 */
export const statementAlternatives: readonly string[] = [
  "Building with code, AI & curiosity.",
  "Exploring technology. Building practical solutions.",
  "Computer Engineering × AI × Web × Cloud.",
  "Learning, building, and experimenting with technology.",
] as const;

export const meta = {
  title: `${personal.name} — ${personal.role}`,
  description:
    "Personal portfolio of Faizan Patel, a Computer Engineering student exploring artificial intelligence, web development, cloud computing and DevOps.",
  /** TODO: set to the deployed origin, e.g. "https://faizanpatel.dev". */
  siteUrl: null as string | null,
} as const;

/* ── Hero ──────────────────────────────────────────────────────────────────── */

export const hero = {
  kicker: "Portfolio",
  primaryCta: { label: "Explore My Work", targetId: "work" },
  secondaryCta: { label: "Let's Connect", targetId: "contact" },
} as const;

/* ── About ─────────────────────────────────────────────────────────────────── */

export const about = {
  kicker: "About",
  heading: "About Me",
  /**
   * Verified copy supplied by Faizan. Additional paragraphs can be appended to
   * this array later; the layout is built to absorb a much longer story.
   */
  paragraphs: [
    "I'm a Computer Engineering student interested in building practical software solutions and exploring emerging technologies. My interests span software development, artificial intelligence, modern web technologies, cloud computing and DevOps.",
  ],
  /** Small factual metadata pairs rendered beside the prose. */
  metadata: [
    { label: "Focus", value: "Computer Engineering" },
    { label: "Currently", value: "Web Developer Intern" },
    { label: "Based in", value: "Mumbai, India" },
    { label: "Interests", value: "AI · Web · Cloud · DevOps" },
  ],
} as const;

/* ── Skills ────────────────────────────────────────────────────────────────── */

/**
 * Deliberately no proficiency percentages, level bars or star ratings — those
 * numbers would be fabricated. Categories communicate scope; the chips
 * communicate tooling.
 *
 * Captions are written to describe *exposure and practice*, never mastery.
 * Git and GitHub appear under both "Cloud & DevOps" and "Tools & Design"
 * because they genuinely serve both roles; that mirrors the source material.
 */
export const skills: readonly SkillCategory[] = [
  {
    id: "programming",
    label: "Programming",
    index: "01",
    caption: "Core languages and fundamentals.",
    items: ["C", "C++", "Python", "Java", "JavaScript"],
  },
  {
    id: "web",
    label: "Web Development",
    index: "02",
    caption: "Interfaces, application code and styling systems.",
    items: [
      "HTML",
      "CSS",
      "JavaScript",
      "React",
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
    ],
  },
  {
    id: "ai",
    label: "AI & Machine Learning",
    index: "03",
    caption: "Building with AI, and building software that uses it.",
    items: [
      "Artificial Intelligence",
      "AI-assisted development",
      "AI application development",
      "AI APIs",
      "AI-powered software systems",
    ],
  },
  {
    id: "cloud",
    label: "Cloud & DevOps",
    index: "04",
    caption: "Infrastructure, containers and delivery.",
    items: ["AWS", "Docker", "Git", "GitHub", "Linux", "CI/CD concepts"],
  },
  {
    id: "tools",
    label: "Tools & Design",
    index: "05",
    caption: "Day-to-day development and design environment.",
    items: ["Git", "GitHub", "VS Code", "Figma"],
  },
] as const;

/* ── Projects ──────────────────────────────────────────────────────────────── */

/** An empty case study. Spread into a project, then override what is known. */
const NO_DETAIL: ProjectDetail = {
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
};

/**
 * Ordered by the intended visual priority: GramCare, Niyyah.app, Deepfake
 * Detection, Collab-Notes. Reorder this array to reorder the section — nothing
 * downstream depends on the sequence. `featured` promotes the lead surface
 * independently of position.
 *
 * REPOSITORY VISIBILITY
 * `visibility` was verified against GitHub on 2026-08-22: all three repositories
 * below are Public. An earlier revision of this file had Niyyah.app and
 * Deepfakedetection marked private, which was stale — visibility changes over
 * time, so re-check it rather than trusting this comment. GramCare has no
 * repository yet and carries "development".
 *
 * `tech` lists ONLY the language Faizan stated for each project. The repository
 * READMEs declare more (Collab-Notes names React 18 + Firebase; Niyyah.app
 * describes a prayer-time focus companion formerly called SalahLock), but README
 * prose can be aspirational, so none of it is asserted here without confirmation.
 */
export const projects: readonly Project[] = [
  {
    id: "gramcare",
    index: "01",
    name: "GramCare",
    fullTitle: "AI-Powered Offline Disease Outbreak Monitoring System",
    category: "AI / Healthcare Technology",
    summary:
      "An AI-powered offline disease outbreak monitoring system currently under development, focused on supporting outbreak monitoring in low-connectivity environments.",
    /** TODO: no stack has been confirmed for this project yet. */
    tech: [],
    featured: true,
    status: "in-development",
    /** No repository published yet — actively being built. */
    visibility: "development",
    github: null,
    liveUrl: null,
    image: null,
    detail: {
      ...NO_DETAIL,
      problem:
        "Disease outbreaks may be difficult to monitor in locations with limited connectivity.",
      solution:
        "Use an AI-powered system capable of supporting disease-outbreak monitoring in offline or low-connectivity environments.",
      /**
       * TODO — the case study is planned but not written. Each row below renders
       * as a reserved heading until `body` is filled in. Do NOT populate these
       * with anything other than exact, confirmed technical information: no
       * model, dataset, accuracy figure, deployment claim or medical claim.
       */
      reservedSections: [
        { label: "AI Component", body: null },
        { label: "Offline Architecture", body: null },
        { label: "Data Flow", body: null },
        { label: "Technology Stack", body: null },
        { label: "Key Features", body: null },
        { label: "Research Basis", body: null },
        { label: "Challenges", body: null },
        { label: "Future Scope", body: null },
      ],
    },
  },
  {
    id: "niyyah-app",
    index: "02",
    name: "Niyyah.app",
    fullTitle: null,
    category: "Mobile / Android",
    summary:
      "A Kotlin-based application project focused on building a dedicated mobile experience.",
    tech: ["Kotlin"],
    featured: false,
    /** The repository README states the project is in active development. */
    status: "in-development",
    visibility: "public",
    github: "https://github.com/Faizan960/Niyyah.app",
    liveUrl: null,
    image: null,
    detail: { ...NO_DETAIL },
  },
  {
    id: "deepfake-detection",
    index: "03",
    name: "Deepfake Detection",
    fullTitle: null,
    category: "AI / Machine Learning",
    summary:
      "A Python-based deepfake detection project exploring AI-driven media authenticity.",
    tech: ["Python"],
    featured: false,
    /** TODO: status not stated. Left null so nothing is implied. */
    status: null,
    visibility: "public",
    github: "https://github.com/Faizan960/Deepfakedetection",
    liveUrl: null,
    image: null,
    detail: { ...NO_DETAIL },
  },
  {
    id: "collab-notes",
    index: "04",
    name: "Collab-Notes",
    fullTitle: null,
    category: "Web Development",
    summary: "A JavaScript-based collaborative notes project.",
    tech: ["JavaScript"],
    featured: false,
    /** TODO: status not stated. Left null so nothing is implied. */
    status: null,
    visibility: "public",
    github: "https://github.com/Faizan960/Collab-Notes",
    liveUrl: null,
    image: null,
    detail: { ...NO_DETAIL },
  },
] as const;

/**
 * A project earns a detail route only once it has something to say. Today that is
 * GramCare alone — generating pages for the other three would produce three
 * near-empty documents, which reads worse than no page at all. Fill in any
 * project's `detail` and its page appears with no code change.
 */
export function hasProjectDetail(project: Project): boolean {
  const { detail } = project;
  return (
    detail.problem !== null ||
    detail.solution !== null ||
    detail.contribution !== null ||
    detail.features.length > 0 ||
    detail.architecture.length > 0 ||
    detail.challenges.length > 0 ||
    detail.lessons.length > 0 ||
    detail.futureScope.length > 0 ||
    detail.reservedSections.length > 0
  );
}

/** Canonical path for a project's case study. */
export function projectDetailHref(project: Project): string {
  return `/work/${project.id}`;
}

/* ── Experience ────────────────────────────────────────────────────────────── */

/**
 * Ascending chronological order, matching the timeline Faizan supplied. The
 * timeline component renders it in this order so the page reads as a progression
 * rather than as a reverse-chronological résumé.
 */
export const experience: readonly ExperienceItem[] = [
  {
    id: "static-inc-intern",
    role: "Intern",
    organisation: "Static Inc.",
    period: "January 2023 — April 2023",
    location: "Mumbai, India",
    duration: "3 months",
    current: false,
    summary:
      "Interned at Static Inc. with a focus on Python web and Android development, strengthening Python fundamentals through targeted coding exercises and contributing to Android debugging and software-development activities.",
    /**
     * Empty on purpose. The four activities stated for this internship — Python
     * web development, Android development, Python fundamentals through coding
     * exercises, and Android debugging — are all already named in the summary
     * above, word for word. Listing them again below it printed the same facts
     * twice on screen. Add a highlight here only when it says something the
     * summary does not.
     */
    highlights: [],
    /** Only what was named. The Android language was not specified. */
    tech: ["Python", "Android"],
  },
  {
    id: "inamigos-web-dev-intern",
    role: "Web Developer Intern",
    organisation: "InAmigos Foundation",
    period: "August 2026 — Present",
    location: "Remote",
    duration: "2 weeks",
    current: true,
    summary:
      "Web development internship focused on AI-assisted website development and practical web-development tasks.",
    /** Empty on purpose: the role is ongoing, so there is nothing to claim yet. */
    highlights: [],
    tech: [],
  },
] as const;

/* ── Education ─────────────────────────────────────────────────────────────── */

/**
 * Ascending chronological order, matching the supplied timeline: the diploma
 * precedes the degree.
 */
export const education: readonly EducationItem[] = [
  {
    id: "thakur-polytechnic-diploma",
    qualification: "Computer Science",
    award: "Diploma",
    institution: "Thakur College of Polytechnic",
    period: "Completed 01/2024",
    location: "Mumbai",
    current: false,
    /** TODO: coursework / activities. Do not invent scores or awards. */
    details: [],
  },
  {
    id: "theem-be-computer-engineering",
    qualification: "Computer Engineering",
    award: "BE",
    institution: "Theem College of Engineering",
    /**
     * The résumé shows 08/2027 for this entry, and the degree is in progress —
     * so it is presented as the expected completion. The start date was not
     * supplied.
     * TODO: add the start year to show a full range.
     */
    period: "Expected 08/2027",
    location: "Mumbai",
    current: true,
    /** TODO: coursework / activities. Do not invent a CGPA. */
    details: [],
  },
] as const;

/* ── Currently Exploring ───────────────────────────────────────────────────── */

export const exploring: readonly ExploringItem[] = [
  {
    id: "ai",
    index: "01",
    label: "Artificial Intelligence",
    caption: "Applied machine learning and AI-assisted tooling.",
  },
  {
    id: "web",
    index: "02",
    label: "Web Development",
    caption: "Modern frameworks, interface systems and performance.",
  },
  {
    id: "cloud",
    index: "03",
    label: "Cloud Computing",
    caption: "Cloud services, deployment models and architecture.",
  },
  {
    id: "devops",
    index: "04",
    label: "DevOps",
    caption: "Automation, containers and delivery pipelines.",
  },
] as const;

/* ── Recognition ───────────────────────────────────────────────────────────── */

/**
 * Achievements and certifications are kept as separate arrays, and rendered with
 * separate visual treatments, because they are different kinds of claim: one is
 * a competition result, the other a credential. They must not collapse into one
 * generic list.
 */
export const achievements: readonly Achievement[] = [
  {
    id: "sih-internal-hackathon",
    name: "SIH Internal Hackathon Winner",
    result: "4th Place",
    /** Deliberately scoped to the internal round — not a national placement. */
    context: "Smart India Hackathon — internal round",
    /** TODO: date not supplied. */
    date: null,
  },
] as const;

export const certifications: readonly Certification[] = [
  {
    id: "neo4j-certified-professional",
    name: "Neo4j Certified Professional",
    /** TODO: issuer/date/credential ID not supplied — do not invent them. */
    issuer: null,
    issued: null,
    credentialId: null,
    credentialUrl: null,
  },
  {
    id: "mern-stack",
    name: "MERN Stack Certification",
    issuer: "Harkirat Singh",
    /** TODO: date and credential ID not supplied. */
    issued: null,
    credentialId: null,
    credentialUrl: null,
  },
] as const;

export const recognition = {
  kicker: "Recognition",
  heading: "Recognition",
  achievementsLabel: "Achievement",
  certificationsLabel: "Certifications",
} as const;

/* ── Contact & social ──────────────────────────────────────────────────────── */

export const contact = {
  kicker: "Contact",
  heading: "Let's Build Something",
  statement: "Have an idea, project, or opportunity? Let's connect.",
  links: [
    {
      id: "email",
      label: "Email",
      handle: "faizanpatel2226@gmail.com",
      href: "mailto:faizanpatel2226@gmail.com",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      handle: "linkedin.com/in/faizan-patel2",
      href: "https://www.linkedin.com/in/faizan-patel2/",
    },
    {
      id: "github",
      label: "GitHub",
      handle: "github.com/Faizan960",
      href: "https://github.com/Faizan960",
    },
  ] as readonly SocialLink[],
} as const;

/** Convenience alias — the footer and contact section share one source. */
export const social: readonly SocialLink[] = contact.links;

/* ── Navigation ────────────────────────────────────────────────────────────── */

/**
 * Drives both the desktop and mobile navigation, and the scroll-spy indicator.
 * This is a SUBSET of the page in the same relative order, so the indicator only
 * ever moves monotonically. `education`, `exploring` and `recognition` are
 * intentionally absent to keep the nav to five items, but they remain scroll
 * targets — which is why `index` skips from 04 to 08. That gap is honest: it
 * signals the page continues past what the nav lists.
 */
export const navSections: readonly NavSection[] = [
  { id: "about", label: "About", index: "01" },
  { id: "skills", label: "Skills", index: "02" },
  { id: "work", label: "Work", index: "03" },
  { id: "experience", label: "Experience", index: "04" },
  { id: "contact", label: "Contact", index: "08" },
] as const;

/* ── Aggregate export ──────────────────────────────────────────────────────── */

export const portfolioData = {
  personal,
  statementAlternatives,
  meta,
  hero,
  about,
  skills,
  projects,
  experience,
  education,
  exploring,
  achievements,
  certifications,
  recognition,
  contact,
  social,
  navSections,
} as const;

export default portfolioData;
