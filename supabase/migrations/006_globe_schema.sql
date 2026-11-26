-- =============================================================================
-- Migration: 006_globe_schema.sql
-- Description: Relational graph architecture for the molecular knowledge globe.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. globe_settings (Singleton)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.globe_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    core_label TEXT NOT NULL,
    core_subtitle TEXT NULL,
    visual_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_globe_settings ON public.globe_settings;
CREATE TRIGGER set_updated_at_globe_settings
    BEFORE UPDATE ON public.globe_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. globe_node_layouts (Overrides for deterministic layout)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.globe_node_layouts (
    entity_type TEXT NOT NULL CHECK (entity_type IN ('core', 'category', 'skill', 'project', 'technology')),
    entity_id TEXT NOT NULL,
    position_x DOUBLE PRECISION NULL,
    position_y DOUBLE PRECISION NULL,
    position_z DOUBLE PRECISION NULL,
    radius DOUBLE PRECISION NULL,
    color_override TEXT NULL,
    sort_order INTEGER NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (entity_type, entity_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_globe_node_layouts ON public.globe_node_layouts;
CREATE TRIGGER set_updated_at_globe_node_layouts
    BEFORE UPDATE ON public.globe_node_layouts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Validate that referenced entity actually exists
CREATE OR REPLACE FUNCTION public.validate_globe_node_layout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.check_entity_exists(NEW.entity_type, NEW.entity_id) THEN
        RAISE EXCEPTION 'Referenced entity does not exist: type=%, id=%', NEW.entity_type, NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_globe_node_layout ON public.globe_node_layouts;
CREATE TRIGGER trg_validate_globe_node_layout
    BEFORE INSERT OR UPDATE ON public.globe_node_layouts
    FOR EACH ROW EXECUTE FUNCTION public.validate_globe_node_layout();

-- -----------------------------------------------------------------------------
-- 3. globe_custom_edges (Semantic graph relationships)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.globe_custom_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL CHECK (source_type IN ('core', 'category', 'skill', 'project', 'technology')),
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('core', 'category', 'skill', 'project', 'technology')),
    target_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('uses', 'demonstrates', 'built-with', 'relevant-to', 'integrates', 'supports', 'extends')),
    strength NUMERIC(4,3) DEFAULT 1.000 CHECK (strength >= 0.0 AND strength <= 1.0),
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (NOT (source_type = target_type AND source_id = target_id)),
    UNIQUE (source_type, source_id, target_type, target_id, relationship_type)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_globe_custom_edges ON public.globe_custom_edges;
CREATE TRIGGER set_updated_at_globe_custom_edges
    BEFORE UPDATE ON public.globe_custom_edges
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Validate endpoints exist for custom edges
CREATE OR REPLACE FUNCTION public.validate_globe_custom_edge()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.check_entity_exists(NEW.source_type, NEW.source_id) THEN
        RAISE EXCEPTION 'Source entity does not exist: type=%, id=%', NEW.source_type, NEW.source_id;
    END IF;
    IF NOT public.check_entity_exists(NEW.target_type, NEW.target_id) THEN
        RAISE EXCEPTION 'Target entity does not exist: type=%, id=%', NEW.target_type, NEW.target_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_globe_custom_edge ON public.globe_custom_edges;
CREATE TRIGGER trg_validate_globe_custom_edge
    BEFORE INSERT OR UPDATE ON public.globe_custom_edges
    FOR EACH ROW EXECUTE FUNCTION public.validate_globe_custom_edge();

-- -----------------------------------------------------------------------------
-- 4. Entity Deletion Cascades for Globe Records
-- Automatically remove layouts and custom edges when the underlying entity is deleted.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_deleted_entity_globe_references()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_type TEXT;
    v_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'skill_categories' THEN
        v_type := 'category';
        v_id := OLD.id;
    ELSIF TG_TABLE_NAME = 'skills' THEN
        v_type := 'skill';
        v_id := OLD.id;
    ELSIF TG_TABLE_NAME = 'projects' THEN
        v_type := 'project';
        v_id := OLD.id;
    ELSIF TG_TABLE_NAME = 'technologies' THEN
        v_type := 'technology';
        v_id := OLD.id;
    END IF;

    IF v_type IS NOT NULL AND v_id IS NOT NULL THEN
        DELETE FROM public.globe_node_layouts
        WHERE entity_type = v_type AND entity_id = v_id;

        DELETE FROM public.globe_custom_edges
        WHERE (source_type = v_type AND source_id = v_id)
           OR (target_type = v_type AND target_id = v_id);
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_category_globe ON public.skill_categories;
CREATE TRIGGER trg_cleanup_category_globe
    AFTER DELETE ON public.skill_categories
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_entity_globe_references();

DROP TRIGGER IF EXISTS trg_cleanup_skill_globe ON public.skills;
CREATE TRIGGER trg_cleanup_skill_globe
    AFTER DELETE ON public.skills
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_entity_globe_references();

DROP TRIGGER IF EXISTS trg_cleanup_project_globe ON public.projects;
CREATE TRIGGER trg_cleanup_project_globe
    AFTER DELETE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_entity_globe_references();

DROP TRIGGER IF EXISTS trg_cleanup_technology_globe ON public.technologies;
CREATE TRIGGER trg_cleanup_technology_globe
    AFTER DELETE ON public.technologies
    FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_entity_globe_references();

-- -----------------------------------------------------------------------------
-- 5. Enable RLS and Grants on Globe Tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.globe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.globe_node_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.globe_custom_edges ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.globe_settings TO anon;
GRANT SELECT ON public.globe_node_layouts TO anon;
GRANT SELECT ON public.globe_custom_edges TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.globe_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.globe_node_layouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.globe_custom_edges TO authenticated;

GRANT ALL ON public.globe_settings TO service_role;
GRANT ALL ON public.globe_node_layouts TO service_role;
GRANT ALL ON public.globe_custom_edges TO service_role;

-- Policies for globe_settings
DROP POLICY IF EXISTS "Public read globe settings" ON public.globe_settings;
CREATE POLICY "Public read globe settings"
    ON public.globe_settings FOR SELECT
    TO anon, authenticated
    USING (id = 1);

DROP POLICY IF EXISTS "Admin manage globe settings" ON public.globe_settings;
CREATE POLICY "Admin manage globe settings"
    ON public.globe_settings FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- Policies for globe_node_layouts
DROP POLICY IF EXISTS "Public read globe layouts" ON public.globe_node_layouts;
CREATE POLICY "Public read globe layouts"
    ON public.globe_node_layouts FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage globe layouts" ON public.globe_node_layouts;
CREATE POLICY "Admin manage globe layouts"
    ON public.globe_node_layouts FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());

-- Policies for globe_custom_edges
DROP POLICY IF EXISTS "Public read globe edges" ON public.globe_custom_edges;
CREATE POLICY "Public read globe edges"
    ON public.globe_custom_edges FOR SELECT
    TO anon, authenticated
    USING (is_visible = TRUE);

DROP POLICY IF EXISTS "Admin manage globe edges" ON public.globe_custom_edges;
CREATE POLICY "Admin manage globe edges"
    ON public.globe_custom_edges FOR ALL
    TO authenticated
    USING (private.is_portfolio_admin())
    WITH CHECK (private.is_portfolio_admin());
