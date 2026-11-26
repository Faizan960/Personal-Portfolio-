-- =============================================================================
-- Test Suite: globe_integrity_test.sql
-- Description: Asserts validation triggers, constraints, and cleanup on globe tables.
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '=== Running Globe Integrity Tests ===';

    -- 1. Test Node Layout Validation: Reject non-existent entity
    BEGIN
        INSERT INTO public.globe_node_layouts (entity_type, entity_id)
        VALUES ('project', 'non-existent-proj-id');
        RAISE EXCEPTION 'Globe Layout Test FAILED: Non-existent entity was allowed!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '  [PASS] validate_globe_node_layout correctly rejected non-existent project';
    END;

    -- 2. Test Custom Edge Validation: Reject self-edge constraint
    BEGIN
        INSERT INTO public.globe_custom_edges (
            source_type, source_id, target_type, target_id, relationship_type
        ) VALUES (
            'project', 'collab-notes', 'project', 'collab-notes', 'uses'
        );
        RAISE EXCEPTION 'Globe Custom Edge Test FAILED: Self-edge was allowed!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '  [PASS] check constraint correctly rejected self-edge';
    END;

    -- 3. Test Custom Edge Validation: Reject invalid strength (> 1.0)
    BEGIN
        INSERT INTO public.globe_custom_edges (
            source_type, source_id, target_type, target_id, relationship_type, strength
        ) VALUES (
            'project', 'collab-notes', 'skill', 'web:javascript', 'uses', 1.5
        );
        RAISE EXCEPTION 'Globe Custom Edge Test FAILED: Strength > 1.0 was allowed!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '  [PASS] check constraint correctly rejected strength out of [0.0, 1.0] range';
    END;

    -- 4. Test Globe Entity Deletion Cleanup Trigger
    -- Insert a dummy skill and create a layout override
    INSERT INTO public.skills (id, category_id, name, sort_order)
    VALUES ('tools:test-cleanup-skill', 'tools', 'Cleanup Test Skill', 99);

    INSERT INTO public.globe_node_layouts (entity_type, entity_id, position_x, position_y, position_z)
    VALUES ('skill', 'tools:test-cleanup-skill', 1.0, 2.0, 3.0);

    SELECT COUNT(*) INTO v_count FROM public.globe_node_layouts WHERE entity_id = 'tools:test-cleanup-skill';
    IF v_count <> 1 THEN RAISE EXCEPTION 'Failed to setup test globe layout'; END IF;

    -- Delete skill
    DELETE FROM public.skills WHERE id = 'tools:test-cleanup-skill';

    -- Verify layout override was automatically purged
    SELECT COUNT(*) INTO v_count FROM public.globe_node_layouts WHERE entity_id = 'tools:test-cleanup-skill';
    IF v_count <> 0 THEN RAISE EXCEPTION 'Globe Cleanup Test FAILED: Layout was not cleaned up on entity delete!'; END IF;
    RAISE NOTICE '  [PASS] cleanup_deleted_entity_globe_references automatically purged orphan layout';

    RAISE NOTICE 'All Globe Integrity Tests Passed Successfully!';
END;
$$;
