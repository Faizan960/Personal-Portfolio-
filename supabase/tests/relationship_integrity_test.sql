-- =============================================================================
-- Test Suite: relationship_integrity_test.sql
-- Description: Asserts cascade deletes and foreign key relationships.
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '=== Running Relationship Integrity Tests ===';

    -- 1. Create a dummy test project and link a technology and skill
    INSERT INTO public.projects (
        id, index, name, category, summary, visibility, detail, sort_order
    ) VALUES (
        'test-cascade-proj', '99', 'Test Cascade', 'Testing', 'Summary', 'public',
        '{
            "problem": null, "solution": null, "features": [], "architecture": [],
            "contribution": null, "challenges": [], "lessons": [], "futureScope": [],
            "screenshots": [], "reservedSections": []
        }'::jsonb, 99
    );

    INSERT INTO public.project_technologies (project_id, technology_id, sort_order)
    VALUES ('test-cascade-proj', 'python', 1);

    INSERT INTO public.project_skills (project_id, skill_id, sort_order)
    VALUES ('test-cascade-proj', 'programming:python', 1);

    -- 2. Verify rows exist
    SELECT COUNT(*) INTO v_count FROM public.project_technologies WHERE project_id = 'test-cascade-proj';
    IF v_count <> 1 THEN RAISE EXCEPTION 'Failed to insert test project technology'; END IF;

    SELECT COUNT(*) INTO v_count FROM public.project_skills WHERE project_id = 'test-cascade-proj';
    IF v_count <> 1 THEN RAISE EXCEPTION 'Failed to insert test project skill'; END IF;

    -- 3. Delete project and assert cascade
    DELETE FROM public.projects WHERE id = 'test-cascade-proj';

    SELECT COUNT(*) INTO v_count FROM public.project_technologies WHERE project_id = 'test-cascade-proj';
    IF v_count <> 0 THEN RAISE EXCEPTION 'Cascade Test FAILED: project_technologies was not deleted!'; END IF;
    RAISE NOTICE '  [PASS] ON DELETE CASCADE cleaned project_technologies';

    SELECT COUNT(*) INTO v_count FROM public.project_skills WHERE project_id = 'test-cascade-proj';
    IF v_count <> 0 THEN RAISE EXCEPTION 'Cascade Test FAILED: project_skills was not deleted!'; END IF;
    RAISE NOTICE '  [PASS] ON DELETE CASCADE cleaned project_skills';

    RAISE NOTICE 'All Relationship Integrity Tests Passed!';
END;
$$;
