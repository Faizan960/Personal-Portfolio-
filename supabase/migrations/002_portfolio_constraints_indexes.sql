-- =============================================================================
-- Migration: 002_portfolio_constraints_indexes.sql
-- Description: Indexes, triggers, and JSONB integrity constraints.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper function: Automatic updated_at timestamp maintenance
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_portfolio_settings ON public.portfolio_settings;
CREATE TRIGGER set_updated_at_portfolio_settings
    BEFORE UPDATE ON public.portfolio_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_skill_categories ON public.skill_categories;
CREATE TRIGGER set_updated_at_skill_categories
    BEFORE UPDATE ON public.skill_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_skills ON public.skills;
CREATE TRIGGER set_updated_at_skills
    BEFORE UPDATE ON public.skills
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_projects ON public.projects;
CREATE TRIGGER set_updated_at_projects
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_technologies ON public.technologies;
CREATE TRIGGER set_updated_at_technologies
    BEFORE UPDATE ON public.technologies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_experience ON public.experience;
CREATE TRIGGER set_updated_at_experience
    BEFORE UPDATE ON public.experience
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_education ON public.education;
CREATE TRIGGER set_updated_at_education
    BEFORE UPDATE ON public.education
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_certifications ON public.certifications;
CREATE TRIGGER set_updated_at_certifications
    BEFORE UPDATE ON public.certifications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_achievements ON public.achievements;
CREATE TRIGGER set_updated_at_achievements
    BEFORE UPDATE ON public.achievements
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_exploring_items ON public.exploring_items;
CREATE TRIGGER set_updated_at_exploring_items
    BEFORE UPDATE ON public.exploring_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_media_assets ON public.media_assets;
CREATE TRIGGER set_updated_at_media_assets
    BEFORE UPDATE ON public.media_assets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_admin_users ON public.admin_users;
CREATE TRIGGER set_updated_at_admin_users
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Detail JSONB Schema Validation Constraint
-- -----------------------------------------------------------------------------
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS check_project_detail_structure;
ALTER TABLE public.projects ADD CONSTRAINT check_project_detail_structure
CHECK (
    jsonb_typeof(detail) = 'object'
    AND detail ? 'features' AND jsonb_typeof(detail->'features') = 'array'
    AND detail ? 'architecture' AND jsonb_typeof(detail->'architecture') = 'array'
    AND detail ? 'challenges' AND jsonb_typeof(detail->'challenges') = 'array'
    AND detail ? 'lessons' AND jsonb_typeof(detail->'lessons') = 'array'
    AND detail ? 'futureScope' AND jsonb_typeof(detail->'futureScope') = 'array'
    AND detail ? 'screenshots' AND jsonb_typeof(detail->'screenshots') = 'array'
    AND detail ? 'reservedSections' AND jsonb_typeof(detail->'reservedSections') = 'array'
);

-- -----------------------------------------------------------------------------
-- 3. Performance & Foreign Key Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_skill_categories_sort ON public.skill_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON public.projects(visibility, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON public.projects(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_technologies_normalized ON public.technologies(normalized_name);
CREATE INDEX IF NOT EXISTS idx_project_tech_proj ON public.project_technologies(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tech_tech ON public.project_technologies(technology_id);
CREATE INDEX IF NOT EXISTS idx_project_skills_proj ON public.project_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_project_skills_skill ON public.project_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_experience_sort ON public.experience(sort_order);
CREATE INDEX IF NOT EXISTS idx_experience_highlights_exp ON public.experience_highlights(experience_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_experience_tech_exp ON public.experience_technologies(experience_id);
CREATE INDEX IF NOT EXISTS idx_education_sort ON public.education(sort_order);
CREATE INDEX IF NOT EXISTS idx_education_details_edu ON public.education_details(education_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_certifications_sort ON public.certifications(sort_order);
CREATE INDEX IF NOT EXISTS idx_achievements_sort ON public.achievements(sort_order);
CREATE INDEX IF NOT EXISTS idx_exploring_sort ON public.exploring_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON public.media_assets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_published ON public.media_assets(is_published);
