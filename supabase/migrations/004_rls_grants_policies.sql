-- =============================================================================
-- Migration: 004_rls_grants_policies.sql
-- Description: RLS enablement, table grants, and security policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable RLS on all existing public tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.portfolio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Explicit PostgreSQL Schema & Table Grants
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Anonymous: read-only access to published content tables
GRANT SELECT ON public.portfolio_settings TO anon;
GRANT SELECT ON public.skill_categories TO anon;
GRANT SELECT ON public.skills TO anon;
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.technologies TO anon;
GRANT SELECT ON public.project_technologies TO anon;
GRANT SELECT ON public.project_skills TO anon;
GRANT SELECT ON public.experience TO anon;
GRANT SELECT ON public.experience_highlights TO anon;
GRANT SELECT ON public.experience_technologies TO anon;
GRANT SELECT ON public.education TO anon;
GRANT SELECT ON public.education_details TO anon;
GRANT SELECT ON public.certifications TO anon;
GRANT SELECT ON public.achievements TO anon;
GRANT SELECT ON public.exploring_items TO anon;
GRANT SELECT ON public.media_assets TO anon;
-- Note: NO grant on public.admin_users for anon

-- Authenticated: grants subject to RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Service Role: complete administrative bypass
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- -----------------------------------------------------------------------------
-- 3. RLS Policies: admin_users
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 4. RLS Policies: portfolio_settings
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read portfolio settings" ON public.portfolio_settings;
CREATE POLICY "Public read portfolio settings"
    ON public.portfolio_settings FOR SELECT
    TO anon, authenticated
    USING (id = 1);

DROP POLICY IF EXISTS "Admin manage portfolio settings" ON public.portfolio_settings;
CREATE POLICY "Admin manage portfolio settings"
    ON public.portfolio_settings FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 5. RLS Policies: skill_categories
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read skill categories" ON public.skill_categories;
CREATE POLICY "Public read skill categories"
    ON public.skill_categories FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage skill categories" ON public.skill_categories;
CREATE POLICY "Admin manage skill categories"
    ON public.skill_categories FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 6. RLS Policies: skills
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read skills" ON public.skills;
CREATE POLICY "Public read skills"
    ON public.skills FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage skills" ON public.skills;
CREATE POLICY "Admin manage skills"
    ON public.skills FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 7. RLS Policies: projects
-- Strictly enforce: Public reads ONLY records with visibility = 'public'
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read public projects" ON public.projects;
CREATE POLICY "Public read public projects"
    ON public.projects FOR SELECT
    TO anon, authenticated
    USING (visibility = 'public');

DROP POLICY IF EXISTS "Admin manage projects" ON public.projects;
CREATE POLICY "Admin manage projects"
    ON public.projects FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 8. RLS Policies: technologies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read technologies" ON public.technologies;
CREATE POLICY "Public read technologies"
    ON public.technologies FOR SELECT
    TO anon, authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Admin manage technologies" ON public.technologies;
CREATE POLICY "Admin manage technologies"
    ON public.technologies FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 9. RLS Policies: project_technologies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read project technologies" ON public.project_technologies;
CREATE POLICY "Public read project technologies"
    ON public.project_technologies FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_technologies.project_id
          AND projects.visibility = 'public'
    ));

DROP POLICY IF EXISTS "Admin manage project technologies" ON public.project_technologies;
CREATE POLICY "Admin manage project technologies"
    ON public.project_technologies FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 10. RLS Policies: project_skills
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read project skills" ON public.project_skills;
CREATE POLICY "Public read project skills"
    ON public.project_skills FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_skills.project_id
          AND projects.visibility = 'public'
    ));

DROP POLICY IF EXISTS "Admin manage project skills" ON public.project_skills;
CREATE POLICY "Admin manage project skills"
    ON public.project_skills FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 11. RLS Policies: experience
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read experience" ON public.experience;
CREATE POLICY "Public read experience"
    ON public.experience FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage experience" ON public.experience;
CREATE POLICY "Admin manage experience"
    ON public.experience FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 12. RLS Policies: experience_highlights
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read experience highlights" ON public.experience_highlights;
CREATE POLICY "Public read experience highlights"
    ON public.experience_highlights FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.experience
        WHERE experience.id = experience_highlights.experience_id
          AND experience.is_visible = TRUE
    ));

DROP POLICY IF EXISTS "Admin manage experience highlights" ON public.experience_highlights;
CREATE POLICY "Admin manage experience highlights"
    ON public.experience_highlights FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 13. RLS Policies: experience_technologies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read experience technologies" ON public.experience_technologies;
CREATE POLICY "Public read experience technologies"
    ON public.experience_technologies FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.experience
        WHERE experience.id = experience_technologies.experience_id
          AND experience.is_visible = TRUE
    ));

DROP POLICY IF EXISTS "Admin manage experience technologies" ON public.experience_technologies;
CREATE POLICY "Admin manage experience technologies"
    ON public.experience_technologies FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 14. RLS Policies: education
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read education" ON public.education;
CREATE POLICY "Public read education"
    ON public.education FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage education" ON public.education;
CREATE POLICY "Admin manage education"
    ON public.education FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 15. RLS Policies: education_details
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read education details" ON public.education_details;
CREATE POLICY "Public read education details"
    ON public.education_details FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.education
        WHERE education.id = education_details.education_id
          AND education.is_visible = TRUE
    ));

DROP POLICY IF EXISTS "Admin manage education details" ON public.education_details;
CREATE POLICY "Admin manage education details"
    ON public.education_details FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 16. RLS Policies: certifications
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read certifications" ON public.certifications;
CREATE POLICY "Public read certifications"
    ON public.certifications FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage certifications" ON public.certifications;
CREATE POLICY "Admin manage certifications"
    ON public.certifications FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 17. RLS Policies: achievements
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read achievements" ON public.achievements;
CREATE POLICY "Public read achievements"
    ON public.achievements FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage achievements" ON public.achievements;
CREATE POLICY "Admin manage achievements"
    ON public.achievements FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 18. RLS Policies: exploring_items
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read exploring items" ON public.exploring_items;
CREATE POLICY "Public read exploring items"
    ON public.exploring_items FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage exploring items" ON public.exploring_items;
CREATE POLICY "Admin manage exploring items"
    ON public.exploring_items FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 19. RLS Policies: media_assets
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read published media" ON public.media_assets;
CREATE POLICY "Public read published media"
    ON public.media_assets FOR SELECT
    TO anon, authenticated
    USING (is_published = TRUE);

DROP POLICY IF EXISTS "Admin manage media assets" ON public.media_assets;
CREATE POLICY "Admin manage media assets"
    ON public.media_assets FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());
