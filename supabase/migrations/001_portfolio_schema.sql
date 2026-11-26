-- =============================================================================
-- Migration: 001_portfolio_schema.sql
-- Description: Core tables for personal portfolio CMS.
-- =============================================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. portfolio_settings (Singleton)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    personal JSONB NOT NULL,
    statement_alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta JSONB NOT NULL,
    hero JSONB NOT NULL,
    about JSONB NOT NULL,
    contact JSONB NOT NULL,
    social JSONB NOT NULL,
    recognition JSONB NOT NULL,
    nav_sections JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 2. skill_categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    display_index TEXT,
    caption TEXT,
    sort_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. skills
-- Note: Same skill name may appear in different categories (e.g., Git in Cloud and Tools).
-- Unique primary key is category_id:skill_slug.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skills (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. projects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    index TEXT,
    name TEXT NOT NULL,
    full_title TEXT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    featured BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT NULL CHECK (status IN ('concept', 'in-development', 'planned') OR status IS NULL),
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private', 'development', 'unknown')),
    github TEXT NULL,
    live_url TEXT NULL,
    image TEXT NULL,
    detail JSONB NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 5. technologies (Dictionary)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.technologies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. project_technologies (Many-to-Many)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_technologies (
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    technology_id TEXT NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, technology_id)
);

-- -----------------------------------------------------------------------------
-- 7. project_skills (Many-to-Many - Graph foundation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_skills (
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL DEFAULT 'uses' CHECK (relationship_type IN ('uses', 'demonstrates', 'built-with', 'relevant-to')),
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (project_id, skill_id)
);

-- -----------------------------------------------------------------------------
-- 8. experience
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experience (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    organisation TEXT NOT NULL,
    period TEXT NOT NULL,
    location TEXT NOT NULL,
    duration TEXT NULL,
    current BOOLEAN DEFAULT FALSE NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 9. experience_highlights
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experience_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id TEXT NOT NULL REFERENCES public.experience(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

-- -----------------------------------------------------------------------------
-- 10. experience_technologies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experience_technologies (
    experience_id TEXT NOT NULL REFERENCES public.experience(id) ON DELETE CASCADE,
    technology_id TEXT NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (experience_id, technology_id)
);

-- -----------------------------------------------------------------------------
-- 11. education
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education (
    id TEXT PRIMARY KEY,
    qualification TEXT NOT NULL,
    award TEXT NOT NULL,
    institution TEXT NULL,
    period TEXT NULL,
    location TEXT NULL,
    current BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 12. education_details
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_id TEXT NOT NULL REFERENCES public.education(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);

-- -----------------------------------------------------------------------------
-- 13. certifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certifications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    issuer TEXT NULL,
    issued TEXT NULL,
    credential_id TEXT NULL,
    credential_url TEXT NULL,
    sort_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 14. achievements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    result TEXT NULL,
    context TEXT NULL,
    date TEXT NULL,
    sort_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 15. exploring_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exploring_items (
    id TEXT PRIMARY KEY,
    index TEXT,
    label TEXT NOT NULL,
    caption TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 16. media_assets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_filename TEXT,
    bucket_id TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT,
    size_bytes BIGINT,
    alt_text TEXT,
    media_type TEXT,
    entity_type TEXT NULL,
    entity_id TEXT NULL,
    is_published BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 17. admin_users (Allowlisted Auth Users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
