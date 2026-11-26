import assert from "assert";
import { execFileSync } from "child_process";

function runRemoteSql(sql, yes = false) {
  const args = ["supabase", "db", "query", "--remote"];
  if (yes) args.push("--yes");
  else args.push("--read-only");

  const out = execFileSync("npx", args, {
    input: sql,
    shell: true,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const jsonStart = out.indexOf("{");
  if (jsonStart === -1) return { raw: out };
  return JSON.parse(out.slice(jsonStart));
}

console.log("=== HOSTED POSTGRESQL 3-ROLE RLS, PUBLISH & ROLLBACK VERIFICATION ===");

// 1. Verify Admin Allowlist & Authorization Helper under role `authenticated`
const authCheck = runRemoteSql(
  `
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT
    (SELECT private.is_portfolio_admin() FROM (SELECT set_config('request.jwt.claims', '{"sub":"7570a46c-c2c9-45f5-bb26-ff89627fb4ea","role":"authenticated"}', true)) s) AS active_admin_result,
    (SELECT private.is_portfolio_admin() FROM (SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}', true)) s) AS non_admin_result,
    (SELECT private.is_portfolio_admin() FROM (SELECT set_config('request.jwt.claims', '{}', true)) s) AS anon_result;
  ROLLBACK;
`,
  true,
);
const authRowsHolder = Array.isArray(authCheck.rows) ? authCheck.rows : [];
const authRow = authRowsHolder.find((r) => "active_admin_result" in r) ?? authRowsHolder[0];
assert.strictEqual(authRow?.active_admin_result, true, "Allowlisted admin UID must return true");
assert.strictEqual(authRow?.non_admin_result, false, "Non-admin UID must return false");
assert.strictEqual(authRow?.anon_result, false, "Anon claims must return false");
console.log("[PASS] 1. private.is_portfolio_admin() verified for active admin, non-admin, and anon");

// 2. Non-Admin Authenticated RLS Rejection Tests (in rolled-back transaction)
const nonAdminCheck = runRemoteSql(
  `
  DO $$
  DECLARE
    v_proj_blocked BOOLEAN := FALSE;
    v_layout_blocked BOOLEAN := FALSE;
    v_admin_blocked BOOLEAN := FALSE;
    v_publish_blocked BOOLEAN := FALSE;
    v_settings_rows INT := 0;
  BEGIN
    PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}', true);
    SET LOCAL ROLE authenticated;

    BEGIN
      INSERT INTO public.projects (id, name, category, summary, visibility, detail, sort_order)
      VALUES ('nonadmin-test', 'Fail', 'Test', 'Fail', 'private', '{}'::jsonb, 99);
    EXCEPTION WHEN insufficient_privilege THEN
      v_proj_blocked := TRUE;
    END;

    UPDATE public.portfolio_settings SET hero = jsonb_set(hero, '{kicker}', '"Hacked"') WHERE id = 1;
    GET DIAGNOSTICS v_settings_rows = ROW_COUNT;

    BEGIN
      INSERT INTO public.globe_node_layouts (entity_type, entity_id, is_visible)
      VALUES ('project', 'gramcare', false);
    EXCEPTION WHEN insufficient_privilege THEN
      v_layout_blocked := TRUE;
    END;

    BEGIN
      INSERT INTO public.admin_users (user_id, is_active)
      VALUES ('00000000-0000-0000-0000-000000000099', true);
    EXCEPTION WHEN insufficient_privilege THEN
      v_admin_blocked := TRUE;
    END;

    BEGIN
      PERFORM public.publish_portfolio_snapshot(ARRAY['hack'], 'Must fail');
    EXCEPTION WHEN OTHERS THEN
      v_publish_blocked := TRUE;
    END;

    IF NOT (v_proj_blocked AND v_layout_blocked AND v_admin_blocked AND v_publish_blocked AND v_settings_rows = 0) THEN
      RAISE EXCEPTION 'Non-admin security check failed: proj=%, layout=%, admin=%, pub=%, settings_rows=%',
        v_proj_blocked, v_layout_blocked, v_admin_blocked, v_publish_blocked, v_settings_rows;
    END IF;
  END $$;
`,
  true,
);
assert.ok(!nonAdminCheck.error, `Non-admin RLS test failed: ${JSON.stringify(nonAdminCheck)}`);
console.log("[PASS] 2. Authenticated non-admin blocked from projects, settings, layouts, admin_users, and publish RPC");

// 3. Active Admin Full Workflow (Create Project + Skills + Tech + City Layout + Publish + Verify Anon Snapshot + Rollback)
// Executed inside a single transaction that rolls back at the end so production v1 remains pristine.
const adminWorkflowCheck = runRemoteSql(
  `
  BEGIN;
  SELECT set_config('request.jwt.claims', '{"sub":"7570a46c-c2c9-45f5-bb26-ff89627fb4ea","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  -- A. Edit homepage sections_config (unpublished)
  UPDATE public.portfolio_settings
  SET sections_config = jsonb_set(COALESCE(sections_config, '{}'::jsonb), '{testHeading}', '"M5.8 Preview Heading"')
  WHERE id = 1;

  -- B. Create temporary project + link verified skill & technology
  INSERT INTO public.projects (id, index, name, category, summary, featured, status, visibility, is_published, detail, sort_order)
  VALUES (
    'm58-temp-verify',
    '99',
    'M5.8 Temp Verify',
    'Verification',
    'Temporary test project',
    false,
    'concept',
    'private',
    true,
    '{"problem":null,"solution":null,"features":[],"architecture":[],"contribution":null,"challenges":[],"lessons":[],"futureScope":[],"screenshots":[],"reservedSections":[]}'::jsonb,
    99
  );

  INSERT INTO public.project_skills (project_id, skill_id, relationship_type, sort_order)
  VALUES ('m58-temp-verify', 'programming:python', 'uses', 0);

  INSERT INTO public.project_technologies (project_id, technology_id, sort_order)
  VALUES ('m58-temp-verify', 'nextjs', 0);

  -- C. Edit Tech City layout
  INSERT INTO public.globe_node_layouts (entity_type, entity_id, color_override, style_preset, is_locked, is_visible)
  VALUES ('category', 'programming', '#00e5ff', 'hex', true, true)
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET color_override = '#00e5ff', style_preset = 'hex', is_locked = true;

  -- Verify published_snapshots STILL holds version 1 before publishing
  DO $$
  DECLARE
    v_pre_ver INT;
    v_pub_res JSONB;
    v_snap_payload JSONB;
    v_v1_hist_id UUID;
    v_rb_res JSONB;
    v_restored_payload JSONB;
  BEGIN
    SELECT version INTO v_pre_ver FROM public.published_snapshots WHERE id = 1;
    IF v_pre_ver <> 1 THEN
      RAISE EXCEPTION 'Expected pre-publish snapshot version 1, got %', v_pre_ver;
    END IF;

    SELECT id INTO v_v1_hist_id FROM public.publication_history WHERE version = 1 LIMIT 1;

    -- Publish v2
    v_pub_res := public.publish_portfolio_snapshot(ARRAY['homepage','projects','tech-city'], 'M5.8 live test publish');
    IF (v_pub_res->>'version')::int <> 2 THEN
      RAISE EXCEPTION 'Expected published version 2, got %', v_pub_res;
    END IF;

    SELECT payload INTO v_snap_payload FROM public.published_snapshots WHERE id = 1;
    IF NOT (v_snap_payload::text LIKE '%m58-temp-verify%') THEN
      RAISE EXCEPTION 'Published snapshot v2 missing temp project';
    END IF;
    IF NOT (v_snap_payload::text LIKE '%#00e5ff%') THEN
      RAISE EXCEPTION 'Published snapshot v2 missing Tech City layout override';
    END IF;

    -- E. Rollback to v1
    v_rb_res := public.rollback_portfolio_snapshot(v_v1_hist_id);
    IF (v_rb_res->>'version')::int <> 3 THEN
      RAISE EXCEPTION 'Expected rollback version 3, got %', v_rb_res;
    END IF;

    SELECT payload INTO v_restored_payload FROM public.published_snapshots WHERE id = 1;
    IF (v_restored_payload::text LIKE '%m58-temp-verify%') THEN
      RAISE EXCEPTION 'Rollback snapshot still contains temp project';
    END IF;
  END $$;

  ROLLBACK;
`,
  true,
);
assert.ok(!adminWorkflowCheck.error, `Admin workflow failed: ${JSON.stringify(adminWorkflowCheck)}`);
console.log("[PASS] 3. Active admin CRUD, Tech City layout, atomic publish (v2), snapshot check, and rollback (v3) verified");

console.log("=== ALL 3-ROLE HOSTED DATABASE & PUBLISHING TESTS PASSED ===");
