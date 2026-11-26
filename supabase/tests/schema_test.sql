-- =============================================================================
-- Test Suite: schema_test.sql
-- Description: Asserts existence and structure of all 20 tables & constraints.
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
    t TEXT;
    expected_tables TEXT[] := ARRAY[
        'portfolio_settings',
        'skill_categories',
        'skills',
        'projects',
        'technologies',
        'project_technologies',
        'project_skills',
        'experience',
        'experience_highlights',
        'experience_technologies',
        'education',
        'education_details',
        'certifications',
        'achievements',
        'exploring_items',
        'media_assets',
        'admin_users',
        'globe_settings',
        'globe_node_layouts',
        'globe_custom_edges'
    ];
BEGIN
    RAISE NOTICE '=== Running Schema Existence Tests ===';

    FOREACH t IN ARRAY expected_tables LOOP
        SELECT COUNT(*) INTO v_count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = t;

        IF v_count = 0 THEN
            RAISE EXCEPTION 'Schema Test FAILED: Table public.% does not exist!', t;
        END IF;
        RAISE NOTICE '  [PASS] Table public.% exists', t;
    END LOOP;

    -- Test Singleton constraints
    RAISE NOTICE '=== Testing Singleton Constraints ===';
    SELECT COUNT(*) INTO v_count FROM public.portfolio_settings;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Singleton Test FAILED: portfolio_settings must contain exactly 1 row, found %', v_count;
    END IF;
    RAISE NOTICE '  [PASS] portfolio_settings has exactly 1 row';

    SELECT COUNT(*) INTO v_count FROM public.globe_settings;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Singleton Test FAILED: globe_settings must contain exactly 1 row, found %', v_count;
    END IF;
    RAISE NOTICE '  [PASS] globe_settings has exactly 1 row';

    -- Test Project Detail JSONB Check Constraint
    RAISE NOTICE '=== Testing Project Detail JSONB Schema ===';
    BEGIN
        INSERT INTO public.projects (
            id, index, name, category, summary, visibility, detail, sort_order
        ) VALUES (
            'invalid-project', '99', 'Invalid', 'Category', 'Summary', 'public',
            '{"invalid": true}'::jsonb, 99
        );
        RAISE EXCEPTION 'Project Detail JSONB Check FAILED: Invalid JSONB was allowed!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '  [PASS] check_project_detail_structure correctly rejected malformed JSONB';
    END;

    RAISE NOTICE 'All Schema Tests Passed Successfully!';
END;
$$;
