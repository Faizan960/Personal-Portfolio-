# Faizan Patel — Portfolio

Personal portfolio site. Version 1 establishes the full structure, design system,
responsive layout and interaction model, and carries verified real content. Where a
fact has not been confirmed the field is `null` and the UI renders a designed absent
state rather than filler — so the site grows by editing one data file, not by
rewriting components.

## Stack

Next.js 15 (App Router, static export) · React 19 · TypeScript (strict) · Tailwind CSS v4.
No UI, animation or 3D dependencies — the runtime is React plus about 10 KB of custom code.

```bash
npm run dev        # dev server on :3000
npm run build      # static export to ./out
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

`npm run build` emits a fully static site in `out/`, deployable to Vercel, Netlify,
GitHub Pages, S3 or any static host with no server runtime.

## Adding content

**Everything visible on the site comes from [`src/data/portfolio.ts`](src/data/portfolio.ts).**
No component hardcodes user-facing content. To grow the portfolio, edit that file only —
the components already handle the new data.

Search that file for `TODO` to find every field still awaiting real information.

### Content integrity

**Nothing in this site is invented.** Fields that have not been verified are `null` or an
empty array, and components render an explicit, *designed* pending state for those values,
so the site looks finished while staying truthful.

This is load-bearing, not decorative. Rules to preserve when editing:

- **Never fabricate.** No metrics, user counts, accuracy figures, model architectures,
  datasets, credential IDs, issue dates, CGPAs, coursework, awards, employers, dates, or
  responsibilities beyond those actually stated. When information is missing, leave the
  placeholder — do not write around it.
- **A `null` href never becomes a link.** Contact rows and footer links render a
  non-focusable pending element instead, so there are no dead links to nowhere.
- **Repository visibility is data, not an assumption.** `project.visibility` is a
  four-state field — `"public" | "private" | "development" | "unknown"` — held separately
  from `project.github`. A URL being present says nothing about whether a visitor can open
  it, so **no component may read `github` to decide whether to render a link**. Every
  repository label and link comes from `presentRepository()` in
  [`src/lib/project.ts`](src/lib/project.ts), whose `switch` is exhaustive over the union:
  adding a fifth state is a compile error there rather than a silently missing branch that
  ships a misleading link. Public → `View on GitHub`; private → `Private Repository` with no
  link; development → `Repository in development`; unknown → nothing at all. Visibility
  changes over time — verified against GitHub on 2026-08-22, Niyyah.app, Deepfakedetection
  and Collab-Notes are all public, and GramCare has no published repository yet
  (`"development"`). Re-check rather than trusting this line.
- **`status` must not be upgraded implicitly.** `null` means no status claim, and renders
  no chip. Do not default it to "Live" or "Complete", and note every label in
  `STATUS_LABELS` is non-committal by design — none implies shipped, deployed, released or
  validated.
- **Empty arrays are meaningful.** `experience[].highlights` is empty for the ongoing
  InAmigos role because there are no completed outcomes yet and for Static Inc. because the
  only statement about it is already its summary; GramCare's `tech` is empty because no
  stack has been confirmed. All three render nothing rather than "TBD".
- **Scope of claims is exact.** The hackathon entry is scoped to the *internal* round by
  its `context` field. Do not present it as a national Smart India Hackathon placement,
  and do not drop the context when restyling.
- **GramCare is under active development.** It must not be described as completed,
  production-ready, deployed, clinically validated or publicly released, and no model
  architecture, dataset, accuracy figure or medical claim may be attributed to it. Its
  case study is a set of reserved sections precisely so the gaps stay visible instead of
  being filled with plausible prose.

### Privacy

**Faizan's phone number is deliberately absent from the codebase.** This site is a static
export, so every value in `portfolio.ts` ships to every visitor inside the JS bundle —
"present in the data but not rendered" would still publish it. Storing it and hiding it in
the UI is not privacy. If a phone number is ever needed, put it behind a server-side form or
an env-injected runtime value. The résumé's postal code is omitted for the same reason;
`personal.location` carries city and country only.

Public contact surface: email, GitHub, LinkedIn.

### Common edits

| Goal | Change |
| --- | --- |
| Publish a repo | On that project: `visibility: "public"` (and a `github` URL). That one field turns the "Private Repository" / "Repository in development" label into a real link, via `presentRepository`. Nothing else changes. |
| Take a repo private | Set `visibility: "private"`. Leave `github` in place — the URL is kept so re-publishing is a one-field change, and the label state is what suppresses the link. |
| Add a project | Append to `projects`. Set `index` (the mono numeral), `category`, `summary`, `tech`, `status`, `visibility` and `github`. Leave `featured: false` unless it should take the lead surface. |
| Feature a different project | Move `featured: true` to that entry and clear it from the current one. `Projects` resolves the lead by `find(p => p.featured)`, so no component edit is needed. Exactly one should be true. |
| Write the GramCare case study | Fill `detail.problem` / `solution` / `architecture` / `challenges` / `futureScope`, and the `body` fields in `detail.reservedSections`. While a body is `null` it renders as a planned-coverage index; filled bodies become real content. |
| Give another project a case study | Put real content in its `detail`. `hasProjectDetail()` in [`portfolio.ts`](src/data/portfolio.ts) is the single gate: it drives both the "View Project" action in `Projects` **and** `generateStaticParams` in [`app/work/[slug]/page.tsx`](src/app/work/[slug]/page.tsx), so a link and its route can never disagree. GramCare is the only project that passes today. |
| Add a project image | Drop the file in `public/`, set `image: "/name.png"`. Falls back to a CSS-generated visual when `null`. |
| Add a job | Append to `experience` (**ascending** chronological — oldest first). Set `current: false` and add `highlights` for past roles. The single `current: true` entry becomes the section's level-3 surface. |
| Add a qualification | Append to `education` (ascending). `award` is the credential class ("BE", "Diploma"); `qualification` is the subject. |
| Add an achievement or certification | Append to `achievements` or `certifications`. They render as visually distinct groups in `Recognition` — a competition result is not a credential, and the section keeps them apart. |
| Add a skill | Append to the relevant `skills[].items`. Captions describe exposure and practice, never mastery — there are no proficiency bars or percentages anywhere, by design. |
| Expand the About story | Append strings to `about.paragraphs`. The first is the lead; the rest render as body copy. The layout absorbs any number. |
| Add a résumé | Put the PDF in `public/`, set `personal.resumeHref`. A download link appears in Contact. |
| Add contact details | Fill `handle` + `href` on entries in `contact.links`. Contact and Footer pick them up automatically. **Do not add a phone number here** — see [Privacy](#privacy). |
| Add a nav item | Append to `navSections`. Drives desktop nav, mobile sheet and the scroll-spy indicator. Keep it a subset of `page.tsx`'s order so the indicator stays monotonic. |
| Reorder sections | Edit `src/app/page.tsx`, then update **both** places the numeral lives: the `SECTION_INDEX` constant in each moved component (or the literal `index` prop, in `About` and `Contact`) *and* `navSections[].index` in `portfolio.ts`. These are duplicated with nothing enforcing agreement — the component numeral renders in the section heading, the data numeral renders in the nav and mobile sheet, and they will silently contradict each other if only one is changed. |

## Architecture

```
src/
├── app/
│   ├── layout.tsx           fonts, metadata, ambient background, nav, footer
│   ├── page.tsx             section composition and order
│   ├── work/[slug]/page.tsx project case study — statically generated, gated on
│   │                        hasProjectDetail; no page for an empty `detail`
│   └── globals.css          Tailwind @theme: colour, type scale, radii
├── data/
│   └── portfolio.ts         ← ALL CONTENT LIVES HERE
├── styles/
│   ├── tokens.css           glass params, blur, shadow, motion, layout, z-index
│   ├── materials.css        the three-level glass material system
│   └── digital-core.css     hero visual layers
├── lib/
│   ├── hooks.ts             capability-aware interaction hooks
│   ├── project.ts           repository/status presentation rules — the only place
│   │                        that decides whether a repo link may be rendered
│   ├── geodesic.ts          3D mesh construction (pure, no React)
│   ├── digitalCore.ts       canvas renderer for the hero visual
│   └── cn.ts                class-name joiner
└── components/
    ├── primitives/          Section · SectionHeading · GlassPanel · Reveal · Button · Chip
    ├── hero/                Hero · HeroContent · DigitalCore
    ├── AmbientBackground · Navigation · About · Skills · Projects
    └── Experience · Education · CurrentlyExploring · Recognition · Contact · Footer
```

### Section order

The page is progressive rather than resume-shaped — identity, then capability, then proof,
then the record behind it:

`Hero → About 01 → Skills 02 → Work 03 → Experience 04 → Education 05 → Exploring 06 → Recognition 07 → Contact 08`

Order lives in [`src/app/page.tsx`](src/app/page.tsx); each numeral is a `SECTION_INDEX`
constant in its component. `navSections` is a five-item subset in the same relative order, so
the scroll-spy indicator only ever moves monotonically. Education, Exploring and Recognition
are deliberately out of the nav but remain scroll targets.

### Design system

Two files control the entire visual style.

**[`src/styles/tokens.css`](src/styles/tokens.css)** — glass parameters, blur radii, shadow
ladder, motion durations, easing curves, layout widths, z-index scale. Retuning the site's
feel means editing values here, not hunting through components.

**[`src/app/globals.css`](src/app/globals.css)** — the Tailwind `@theme` block: colour ramp,
fluid type scale, radii. Declared there because Tailwind v4 generates utilities from it
(`--color-muted` → `text-muted`, `--text-h2` → `text-h2`).

### Glass material system

Three levels, in [`materials.css`](src/styles/materials.css). Pick by **role**, not by how
much emphasis you want:

| Level | Use for |
| --- | --- |
| `glass-1` | navigation, chips, small controls, secondary surfaces |
| `glass-2` | cards, skill containers, information panels |
| `glass-3` | featured or important interactive components — sparingly |

Each level composes four physical cues rather than just blurring: a vertical body tint,
backdrop blur *plus* saturation, an inset top highlight with a darker underside (which is
what reads as pane *thickness*), and a soft wide elevation shadow.

Add-ons: `glass-sheen` (pointer-tracked specular highlight), `glass-rim` (bright refraction
edge), `glass-interactive` (hover lift — only ever on genuinely clickable things),
`glass-well` (inset recess — the material for absent, reserved and pending states).

Falls back to opaque tinted panels where `backdrop-filter` is unsupported, and drops to plain
bordered boxes under `forced-colors`.

## The Digital Core

The hero visual is a hand-written 3D renderer on a 2D canvas — a geodesic lattice inside a
translucent glass shell, lit by a single key light. It exists in three files:
[`geodesic.ts`](src/lib/geodesic.ts) (mesh math), [`digitalCore.ts`](src/lib/digitalCore.ts)
(renderer), [`digital-core.css`](src/styles/digital-core.css) (the CSS glass layers).

Chosen over Three.js deliberately: this is ~10 KB against ~550 KB gzipped, needs no GPU
feature detection, and idles at roughly 1–2% CPU.

Depth comes from four cues — perspective scale, quadratic depth fog, Lambert shading, and
painter's-algorithm occlusion ordering. Only *back*-facing triangles are filled, so you are
looking through the near wall of the sphere at its far wall; that single decision is what
makes it read as glass rather than as a wireframe ball.

The pointer sets a rotation target. The canvas rotates its geometry toward it while the CSS
shell tilts as a rigid body at a slightly different rate — the parallax between them is the
depth cue. It never spins fast; idle motion is a slow figure-of-eight.

Performance and degradation:

- Mesh is built once at module scope and shared; the render loop allocates nothing
  steady-state (flat `Float32Array` scratch buffers, insertion sort with no comparator).
- Loop stops entirely when the hero scrolls out of view or the tab is hidden.
- Device pixel ratio capped at 2.
- Geodesic detail drops from 162 vertices to 42 on viewports under 768px.
- `prefers-reduced-motion` → one static frame, no loop, no pointer tracking.
- Coarse pointer → ambient drift only.
- No 2D context → the CSS shell layers alone still render a credible object.

## Interaction & accessibility

Interaction effects are capability-gated in [`hooks.ts`](src/lib/hooks.ts): pointer-driven
effects are skipped on touch rather than emulated, and everything is disabled under
`prefers-reduced-motion`. Continuous work is coalesced into `requestAnimationFrame`, written
straight to style attributes so cursor movement never triggers a React re-render. The tilt
loop parks itself once motion settles.

- Semantic HTML throughout; unbroken heading hierarchy.
- One high-contrast `:focus-visible` ring, never removed.
- Skip link to content.
- Mobile menu is a real modal dialog: focus moves in, is trapped, Escape closes, focus
  returns to the trigger, background scroll locked with scrollbar-width compensation.
- Scroll-spy tracks the section nearest a sight-line 38% down the viewport, which stops the
  nav indicator flickering between adjacent sections.
- Decorative layers are `aria-hidden`; status is never conveyed by colour alone.
- Contrast on the page background: body text 18:1, muted 8.2:1, subtle 4.6:1.

Reduced motion is handled as a *targeted* override, not a blanket `animation: none` — that
would leave scroll-reveal elements stuck invisible. Reveals resolve immediately to their
final visible state instead.

With JavaScript disabled, a `<noscript>` rule forces all `[data-reveal]` elements visible, so
the page is fully readable.
