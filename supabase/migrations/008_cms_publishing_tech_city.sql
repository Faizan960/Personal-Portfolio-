-- =============================================================================
-- Migration: 008_cms_publishing_tech_city.sql
-- Description: Additive CMS publishing workflow, Tech City controls, section
--              configuration, and atomic publication snapshots + rollback.
-- Safety: Non-destructive, idempotent, preserves all existing seeded rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Additive columns on existing portfolio tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.portfolio_settings
    ADD COLUMN IF NOT EXISTS sections_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.technologies
    ADD COLUMN IF NOT EXISTS color_override TEXT NULL,
    ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS description TEXT NULL;

ALTER TABLE public.globe_node_layouts
    ADD COLUMN IF NOT EXISTS style_preset TEXT NULL,
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- 2. Refine projects / join-table public SELECT policies
--    Note: Project `visibility` denotes repository visibility
--    ('public' | 'private' | 'development' | 'unknown'), whereas `is_published`
--    controls whether the project itself is published on the public portfolio.
--    For example, GramCare has visibility = 'development' and is_published = TRUE.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read public projects" ON public.projects;
DROP POLICY IF EXISTS "Public read published projects" ON public.projects;
CREATE POLICY "Public read published projects"
    ON public.projects FOR SELECT
    TO anon, authenticated
    USING (is_published = TRUE);

DROP POLICY IF EXISTS "Public read project technologies" ON public.project_technologies;
CREATE POLICY "Public read project technologies"
    ON public.project_technologies FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_technologies.project_id
          AND projects.is_published = TRUE
    ));

DROP POLICY IF EXISTS "Public read project skills" ON public.project_skills;
CREATE POLICY "Public read project skills"
    ON public.project_skills FOR SELECT
    TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_skills.project_id
          AND projects.is_published = TRUE
    ));

-- -----------------------------------------------------------------------------
-- 3. Publishing tables: published_snapshots (Singleton) & publication_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.published_snapshots (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    version INTEGER NOT NULL DEFAULT 1,
    payload JSONB NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_by_email TEXT NULL,
    notes TEXT NULL
);

CREATE TABLE IF NOT EXISTS public.publication_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('publish', 'rollback', 'seed')),
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    changed_sections TEXT[] NOT NULL DEFAULT '{}'::text[],
    summary TEXT NULL,
    payload JSONB NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_by_email TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_publication_history_published_at
    ON public.publication_history (published_at DESC);

ALTER TABLE public.published_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.published_snapshots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_snapshots TO authenticated;
GRANT ALL ON public.published_snapshots TO service_role;

REVOKE ALL ON public.publication_history FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_history TO authenticated;
GRANT ALL ON public.publication_history TO service_role;

DROP POLICY IF EXISTS "Public read published snapshot" ON public.published_snapshots;
CREATE POLICY "Public read published snapshot"
    ON public.published_snapshots FOR SELECT
    TO anon, authenticated
    USING (id = 1);

DROP POLICY IF EXISTS "Admin manage published snapshot" ON public.published_snapshots;
CREATE POLICY "Admin manage published snapshot"
    ON public.published_snapshots FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

DROP POLICY IF EXISTS "Admin manage publication history" ON public.publication_history;
CREATE POLICY "Admin manage publication history"
    ON public.publication_history FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- -----------------------------------------------------------------------------
-- 4. Canonical Payload Builder (Runs inside PostgreSQL transaction)
--    Assembles only published/visible records into one consistent JSONB bundle
--    consumed identically by the public homepage and Tech City.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.build_published_payload()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
    v_settings public.portfolio_settings%ROWTYPE;
    v_city_settings public.globe_settings%ROWTYPE;
    v_categories JSONB;
    v_projects JSONB;
    v_technologies JSONB;
    v_experience JSONB;
    v_education JSONB;
    v_certifications JSONB;
    v_achievements JSONB;
    v_exploring JSONB;
    v_city_layouts JSONB;
    v_city_edges JSONB;
    v_media JSONB;
BEGIN
    SELECT * INTO v_settings FROM public.portfolio_settings WHERE id = 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'portfolio_settings singleton row (id = 1) is missing';
    END IF;

    SELECT * INTO v_city_settings FROM public.globe_settings WHERE id = 1;

    -- Skill categories with visible ordered skills
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', sc.id,
            'label', sc.label,
            'index', COALESCE(sc.display_index, ''),
            'caption', COALESCE(sc.caption, ''),
            'sortOrder', sc.sort_order,
            'isVisible', sc.is_visible,
            'items', COALESCE((
                SELECT jsonb_agg(s.name ORDER BY s.sort_order)
                FROM public.skills s
                WHERE s.category_id = sc.id AND s.is_visible = TRUE
            ), '[]'::jsonb),
            'skillRecords', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', s.id,
                        'name', s.name,
                        'sortOrder', s.sort_order,
                        'isVisible', s.is_visible
                    )
                    ORDER BY s.sort_order
                )
                FROM public.skills s
                WHERE s.category_id = sc.id AND s.is_visible = TRUE
            ), '[]'::jsonb)
        )
        ORDER BY sc.sort_order
    ), '[]'::jsonb)
    INTO v_categories
    FROM public.skill_categories sc
    WHERE sc.is_visible = TRUE;

    -- Published projects with verified technologies & skills
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'index', COALESCE(p.index, ''),
            'name', p.name,
            'fullTitle', p.full_title,
            'category', p.category,
            'summary', p.summary,
            'featured', p.featured,
            'status', p.status,
            'visibility', p.visibility,
            'isPublished', p.is_published,
            'github', p.github,
            'liveUrl', p.live_url,
            'image', p.image,
            'detail', p.detail,
            'tech', COALESCE((
                SELECT jsonb_agg(t.name ORDER BY pt.sort_order)
                FROM public.project_technologies pt
                JOIN public.technologies t ON t.id = pt.technology_id
                WHERE pt.project_id = p.id AND t.is_visible = TRUE
            ), '[]'::jsonb),
            'skillIds', COALESCE((
                SELECT jsonb_agg(ps.skill_id ORDER BY ps.sort_order)
                FROM public.project_skills ps
                JOIN public.skills s ON s.id = ps.skill_id
                WHERE ps.project_id = p.id AND s.is_visible = TRUE
            ), '[]'::jsonb)
        )
        ORDER BY p.sort_order
    ), '[]'::jsonb)
    INTO v_projects
    FROM public.projects p
    WHERE p.is_published = TRUE;

    -- Visible technologies dictionary
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'normalizedName', t.normalized_name,
            'colorOverride', t.color_override,
            'isVisible', t.is_visible,
            'description', t.description
        )
        ORDER BY t.name
    ), '[]'::jsonb)
    INTO v_technologies
    FROM public.technologies t
    WHERE t.is_visible = TRUE;

    -- Visible experience
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ex.id,
            'role', ex.role,
            'organisation', ex.organisation,
            'period', ex.period,
            'location', ex.location,
            'duration', ex.duration,
            'current', ex.current,
            'summary', ex.summary,
            'highlights', COALESCE((
                SELECT jsonb_agg(eh.content ORDER BY eh.sort_order)
                FROM public.experience_highlights eh
                WHERE eh.experience_id = ex.id
            ), '[]'::jsonb),
            'tech', COALESCE((
                SELECT jsonb_agg(t.name ORDER BY et.sort_order)
                FROM public.experience_technologies et
                JOIN public.technologies t ON t.id = et.technology_id
                WHERE et.experience_id = ex.id
            ), '[]'::jsonb)
        )
        ORDER BY ex.sort_order
    ), '[]'::jsonb)
    INTO v_experience
    FROM public.experience ex
    WHERE ex.is_visible = TRUE;

    -- Visible education
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ed.id,
            'qualification', ed.qualification,
            'award', ed.award,
            'institution', ed.institution,
            'period', ed.period,
            'location', ed.location,
            'current', ed.current,
            'details', COALESCE((
                SELECT jsonb_agg(edd.content ORDER BY edd.sort_order)
                FROM public.education_details edd
                WHERE edd.education_id = ed.id
            ), '[]'::jsonb)
        )
        ORDER BY ed.sort_order
    ), '[]'::jsonb)
    INTO v_education
    FROM public.education ed
    WHERE ed.is_visible = TRUE;

    -- Visible certifications
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'issuer', c.issuer,
            'issued', c.issued,
            'credentialId', c.credential_id,
            'credentialUrl', c.credential_url
        )
        ORDER BY c.sort_order
    ), '[]'::jsonb)
    INTO v_certifications
    FROM public.certifications c
    WHERE c.is_visible = TRUE;

    -- Visible achievements
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'result', a.result,
            'context', a.context,
            'date', a.date
        )
        ORDER BY a.sort_order
    ), '[]'::jsonb)
    INTO v_achievements
    FROM public.achievements a
    WHERE a.is_visible = TRUE;

    -- Visible exploring items
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', exi.id,
            'index', COALESCE(exi.index, ''),
            'label', exi.label,
            'caption', exi.caption
        )
        ORDER BY exi.sort_order
    ), '[]'::jsonb)
    INTO v_exploring
    FROM public.exploring_items exi
    WHERE exi.is_visible = TRUE;

    -- Tech City node layouts
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'entityType', gnl.entity_type,
            'entityId', gnl.entity_id,
            'positionX', gnl.position_x,
            'positionY', gnl.position_y,
            'positionZ', gnl.position_z,
            'radius', gnl.radius,
            'colorOverride', gnl.color_override,
            'stylePreset', gnl.style_preset,
            'isLocked', gnl.is_locked,
            'sortOrder', gnl.sort_order,
            'isVisible', gnl.is_visible
        )
    ), '[]'::jsonb)
    INTO v_city_layouts
    FROM public.globe_node_layouts gnl
    WHERE gnl.is_visible = TRUE;

    -- Tech City custom edges (exclude edges pointing to unpublished projects)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', gce.id,
            'sourceType', gce.source_type,
            'sourceId', gce.source_id,
            'targetType', gce.target_type,
            'targetId', gce.target_id,
            'relationshipType', gce.relationship_type,
            'strength', gce.strength,
            'isVisible', gce.is_visible
        )
        ORDER BY gce.sort_order
    ), '[]'::jsonb)
    INTO v_city_edges
    FROM public.globe_custom_edges gce
    WHERE gce.is_visible = TRUE
      AND (gce.source_type <> 'project' OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = gce.source_id AND p.is_published = TRUE))
      AND (gce.target_type <> 'project' OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = gce.target_id AND p.is_published = TRUE));

    -- Published media assets only
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', m.id,
            'filename', m.filename,
            'bucketId', m.bucket_id,
            'storagePath', m.storage_path,
            'mimeType', m.mime_type,
            'altText', m.alt_text,
            'entityType', m.entity_type,
            'entityId', m.entity_id
        )
        ORDER BY m.created_at DESC
    ), '[]'::jsonb)
    INTO v_media
    FROM public.media_assets m
    WHERE m.is_published = TRUE AND m.bucket_id = 'portfolio-public';

    RETURN jsonb_build_object(
        'personal', v_settings.personal,
        'statementAlternatives', v_settings.statement_alternatives,
        'meta', v_settings.meta,
        'hero', v_settings.hero,
        'about', v_settings.about,
        'contact', v_settings.contact,
        'social', v_settings.social,
        'recognition', v_settings.recognition,
        'navSections', v_settings.nav_sections,
        'sectionsConfig', COALESCE(v_settings.sections_config, '{}'::jsonb),
        'skills', v_categories,
        'projects', v_projects,
        'technologies', v_technologies,
        'experience', v_experience,
        'education', v_education,
        'certifications', v_certifications,
        'achievements', v_achievements,
        'exploring', v_exploring,
        'media', v_media,
        'cityConfig', jsonb_build_object(
            'coreLabel', COALESCE(v_city_settings.core_label, 'Faizan Patel'),
            'coreSubtitle', COALESCE(v_city_settings.core_subtitle, 'Computer Engineering Student'),
            'visualConfig', COALESCE(v_city_settings.visual_config, '{}'::jsonb),
            'layoutConfig', COALESCE(v_city_settings.layout_config, '{}'::jsonb),
            'layouts', v_city_layouts,
            'customEdges', v_city_edges
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION private.build_published_payload() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.build_published_payload() TO service_role;

-- -----------------------------------------------------------------------------
-- 5. Atomic Publish RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_portfolio_snapshot(
    p_changed_sections TEXT[] DEFAULT '{}'::text[],
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_email TEXT;
    v_next_version INTEGER;
    v_payload JSONB;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_invalid_count INTEGER;
BEGIN
    IF NOT private.is_portfolio_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only active allowlisted administrators may publish.';
    END IF;

    v_uid := auth.uid();
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    -- Integrity validations before publication
    SELECT COUNT(*) INTO v_invalid_count
    FROM public.projects
    WHERE TRIM(name) = '' OR TRIM(category) = '' OR TRIM(summary) = '';

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Publication blocked: % project(s) are missing required name, category, or summary.', v_invalid_count;
    END IF;

    SELECT COUNT(*) INTO v_invalid_count
    FROM public.globe_custom_edges e
    WHERE e.is_visible = TRUE
      AND (NOT public.check_entity_exists(e.source_type, e.source_id)
        OR NOT public.check_entity_exists(e.target_type, e.target_id));

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Publication blocked: % Tech City connection(s) reference missing entities.', v_invalid_count;
    END IF;

    v_payload := private.build_published_payload();

    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM public.published_snapshots
    WHERE id = 1;

    INSERT INTO public.published_snapshots (
        id, version, payload, published_at, published_by, published_by_email, notes
    ) VALUES (
        1, v_next_version, v_payload, v_now, v_uid, v_email, p_notes
    )
    ON CONFLICT (id) DO UPDATE SET
        version = EXCLUDED.version,
        payload = EXCLUDED.payload,
        published_at = EXCLUDED.published_at,
        published_by = EXCLUDED.published_by,
        published_by_email = EXCLUDED.published_by_email,
        notes = EXCLUDED.notes;

    INSERT INTO public.publication_history (
        version, action, status, changed_sections, summary, payload, published_at, published_by, published_by_email
    ) VALUES (
        v_next_version,
        'publish',
        'success',
        COALESCE(p_changed_sections, '{}'::text[]),
        COALESCE(p_notes, 'Published portfolio snapshot v' || v_next_version),
        v_payload,
        v_now,
        v_uid,
        v_email
    );

    RETURN jsonb_build_object(
        'version', v_next_version,
        'publishedAt', v_now,
        'publishedByEmail', v_email
    );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_portfolio_snapshot(TEXT[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_portfolio_snapshot(TEXT[], TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. Atomic Rollback RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rollback_portfolio_snapshot(
    p_history_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_email TEXT;
    v_target public.publication_history%ROWTYPE;
    v_next_version INTEGER;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF NOT private.is_portfolio_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only active allowlisted administrators may rollback publications.';
    END IF;

    v_uid := auth.uid();
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

    SELECT * INTO v_target FROM public.publication_history WHERE id = p_history_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target publication snapshot not found.';
    END IF;

    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM public.published_snapshots
    WHERE id = 1;

    INSERT INTO public.published_snapshots (
        id, version, payload, published_at, published_by, published_by_email, notes
    ) VALUES (
        1, v_next_version, v_target.payload, v_now, v_uid, v_email,
        'Rolled back to version ' || v_target.version
    )
    ON CONFLICT (id) DO UPDATE SET
        version = EXCLUDED.version,
        payload = EXCLUDED.payload,
        published_at = EXCLUDED.published_at,
        published_by = EXCLUDED.published_by,
        published_by_email = EXCLUDED.published_by_email,
        notes = EXCLUDED.notes;

    INSERT INTO public.publication_history (
        version, action, status, changed_sections, summary, payload, published_at, published_by, published_by_email
    ) VALUES (
        v_next_version,
        'rollback',
        'success',
        ARRAY['rollback'],
        'Rolled back live portfolio to snapshot v' || v_target.version,
        v_target.payload,
        v_now,
        v_uid,
        v_email
    );

    RETURN jsonb_build_object(
        'version', v_next_version,
        'restoredFromVersion', v_target.version,
        'publishedAt', v_now
    );
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_portfolio_snapshot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_portfolio_snapshot(UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. Seed Initial Snapshot (idempotent) + Enable Realtime on published_snapshots
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_payload JSONB;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.published_snapshots WHERE id = 1)
       AND EXISTS (SELECT 1 FROM public.portfolio_settings WHERE id = 1) THEN
        v_payload := private.build_published_payload();
        INSERT INTO public.published_snapshots (id, version, payload, notes)
        VALUES (1, 1, v_payload, 'Initial seeded portfolio publication');

        INSERT INTO public.publication_history (version, action, status, changed_sections, summary, payload)
        VALUES (1, 'seed', 'success', ARRAY['initial-seed'], 'Initial seeded portfolio snapshot', v_payload);
    END IF;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.published_snapshots;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
