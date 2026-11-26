-- =============================================================================
-- Migration: 003_admin_functions.sql
-- Description: Security helper functions and polymorphic entity validator.
-- =============================================================================

-- Create dedicated private schema for internal security helpers
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke default public schema creation
REVOKE CREATE ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. Security Definer: is_portfolio_admin()
-- Evaluates whether the current request caller is an active allowlisted admin.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_portfolio_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE user_id = v_uid
          AND is_active = TRUE
    );
END;
$$;

-- Secure function permissions
REVOKE ALL ON FUNCTION private.is_portfolio_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_portfolio_admin() FROM anon;
GRANT EXECUTE ON FUNCTION private.is_portfolio_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_portfolio_admin() TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Entity Validator: check_entity_exists(type, id)
-- Polymorphic validator for molecular globe nodes and custom edges.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_entity_exists(p_type TEXT, p_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_type = 'core' THEN
        RETURN (p_id = 'portfolio');
    ELSIF p_type = 'category' THEN
        RETURN EXISTS (SELECT 1 FROM public.skill_categories WHERE id = p_id);
    ELSIF p_type = 'skill' THEN
        RETURN EXISTS (SELECT 1 FROM public.skills WHERE id = p_id);
    ELSIF p_type = 'project' THEN
        RETURN EXISTS (SELECT 1 FROM public.projects WHERE id = p_id);
    ELSIF p_type = 'technology' THEN
        RETURN EXISTS (SELECT 1 FROM public.technologies WHERE id = p_id);
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_entity_exists(TEXT, TEXT) TO anon, authenticated, service_role;
