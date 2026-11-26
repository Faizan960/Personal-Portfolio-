# Personal Portfolio Supabase PostgreSQL Architecture (M3)

## Overview
This directory contains the version-controlled PostgreSQL schema, security policies, storage definitions, seed scripts, and validation tests for Faizan Patel's Personal Portfolio CMS and future Interactive Molecular Knowledge Globe.

## Database Tables (20 Tables)

### Content Management Core
1. `portfolio_settings`: Singleton configuration (personal, meta, hero, about, contact, social, recognition, nav_sections).
2. `skill_categories`: Taxonomy categories with captions and display indexes.
3. `skills`: Individual skills grouped by category (allows same skill name across categories, e.g. Git in Cloud & Tools).
4. `projects`: Portfolio projects with strict `status` and `visibility` constraints and `detail` JSONB schema validation.
5. `technologies`: Shared normalized technology dictionary.
6. `project_technologies`: Many-to-many join table between projects and technologies.
7. `project_skills`: Many-to-many relationship driving skill-to-project edges in the molecular globe.
8. `experience`: Career progression records.
9. `experience_highlights`: Bulleted highlights associated with experience entries.
10. `experience_technologies`: Technologies leveraged during specific engagements.
11. `education`: Academic degrees and diplomas.
12. `education_details`: Additional detail lines for academic history.
13. `certifications`: Industry credentials and certificates.
14. `achievements`: Honors, competition placements, and awards.
15. `exploring_items`: Curated topics currently under exploration.
16. `media_assets`: Metadata repository for storage assets (covers, screenshots, credentials).
17. `admin_users`: Allowlist table referencing `auth.users(id)` for authenticated CMS administration.

### Molecular Globe Knowledge Graph
18. `globe_settings`: Singleton configuration for the interactive molecular globe (core label, subtitle, visual and camera configs).
19. `globe_node_layouts`: Optional 3D coordinate and radius overrides for deterministic layout nodes with referential integrity validation.
20. `globe_custom_edges`: Curated semantic graph connections between entities (e.g. demonstrating relationships, custom strengths).

## Security & Access Control (RLS)
- **RLS Status**: Enabled on all 20 public tables and storage buckets.
- **Admin Verification**: `private.is_portfolio_admin()` security definer function checks `auth.uid()` against `admin_users` where `is_active = TRUE`.
- **Anonymous Access**: Read-only access to published content (`visibility = 'public'` for projects, `is_visible = TRUE` for skills, experience, etc.). Zero write permissions.
- **Storage Buckets**:
  - `portfolio-public`: Publicly readable; uploads and modifications restricted to allowlisted administrators.
  - `portfolio-private`: Completely private; reads and writes restricted to allowlisted administrators.

## Migration Sequence
- `migrations/001_portfolio_schema.sql`: Table definitions and primary keys.
- `migrations/002_portfolio_constraints_indexes.sql`: Foreign keys, updated_at triggers, indexes, and JSONB shape check constraints.
- `migrations/003_admin_functions.sql`: `private.is_portfolio_admin()` and polymorphic entity existence checks.
- `migrations/004_rls_grants_policies.sql`: Grants and Row Level Security policies.
- `migrations/005_storage_buckets_policies.sql`: Storage buckets and storage object policies.
- `migrations/006_globe_schema.sql`: Molecular globe tables, validation triggers, and entity deletion cascades.
- `migrations/007_seed_portfolio.sql`: Idempotent baseline seed matching `src/data/portfolio.ts`.

## Testing
- `tests/schema_test.sql`: Validates table presence, singleton constraints, and JSONB validation.
- `tests/rls_test.sql`: Asserts RLS is enabled on all tables and security helpers exist.
- `tests/relationship_integrity_test.sql`: Verifies cascading deletes on relational tables.
- `tests/globe_integrity_test.sql`: Asserts globe constraints, layout validation, and cascade purge triggers.
