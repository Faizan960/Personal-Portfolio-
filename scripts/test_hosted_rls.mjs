import assert from "assert";
import { execSync } from "child_process";

/**
 * Hosted Supabase RLS & Security Verification (M5.8)
 * Reads the public/publishable key in-memory from `supabase projects api-keys`
 * without printing secrets or creating local .env files.
 */
function getHostedAnonConfig() {
  const raw = execSync(
    "npx supabase projects api-keys --project-ref oihvyrrcphziwseshcup --output json",
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const keys = JSON.parse(raw);
  const anonEntry = keys.find((k) => k.name === "anon" || k.id === "anon");
  if (!anonEntry?.api_key) {
    throw new Error("Could not resolve anon key from Supabase CLI");
  }
  return {
    url: "https://oihvyrrcphziwseshcup.supabase.co",
    anonKey: anonEntry.api_key,
  };
}

async function main() {
  console.log("=== HOSTED SUPABASE RLS & SECURITY TESTS (PortFolio: oihvyrrcphziwseshcup) ===");
  const { url, anonKey } = getHostedAnonConfig();

  const anonHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 1. ANONYMOUS: Can read published_snapshots (id = 1)
  const snapRes = await fetch(
    `${url}/rest/v1/published_snapshots?id=eq.1&select=id,version,notes`,
    { headers: anonHeaders },
  );
  assert.strictEqual(snapRes.status, 200, `Expected 200 reading published_snapshots, got ${snapRes.status}`);
  const snapRows = await snapRes.json();
  assert.strictEqual(snapRows.length, 1, "Expected 1 published snapshot row");
  assert.ok(snapRows[0].version >= 1, "Expected published snapshot version >= 1");
  console.log("[PASS] ANON READ published_snapshots -> 200 OK (version " + snapRows[0].version + ")");

  // 2. ANONYMOUS: Cannot read publication_history
  const histRes = await fetch(
    `${url}/rest/v1/publication_history?select=id,version`,
    { headers: anonHeaders },
  );
  const histBody = await histRes.json().catch(() => []);
  assert.ok(
    !histRes.ok || (Array.isArray(histBody) && histBody.length === 0),
    `Anonymous client must not read publication_history (status ${histRes.status})`,
  );
  console.log(`[PASS] ANON READ publication_history blocked (HTTP ${histRes.status})`);

  // 3. ANONYMOUS: Cannot read admin_users
  const adminRes = await fetch(
    `${url}/rest/v1/admin_users?select=user_id,is_active`,
    { headers: anonHeaders },
  );
  const adminBody = await adminRes.json().catch(() => []);
  assert.ok(
    !adminRes.ok || (Array.isArray(adminBody) && adminBody.length === 0),
    `Anonymous client must not read admin_users (status ${adminRes.status})`,
  );
  console.log(`[PASS] ANON READ admin_users blocked (HTTP ${adminRes.status}, rows=${Array.isArray(adminBody) ? adminBody.length : 0})`);

  // 4. ANONYMOUS: Cannot write portfolio content or Tech City config
  const writeProbes = [
    {
      name: "INSERT projects",
      path: "/rest/v1/projects",
      method: "POST",
      body: {
        id: "rls-anon-probe",
        name: "Unauthorized",
        category: "Probe",
        summary: "Must fail",
        visibility: "private",
        detail: {},
        sort_order: 99,
      },
    },
    {
      name: "UPDATE portfolio_settings",
      path: "/rest/v1/portfolio_settings?id=eq.1",
      method: "PATCH",
      body: { meta: { title: "Hacked" } },
    },
    {
      name: "INSERT globe_node_layouts",
      path: "/rest/v1/globe_node_layouts",
      method: "POST",
      body: { entity_type: "project", entity_id: "gramcare", is_visible: false },
    },
    {
      name: "INSERT published_snapshots",
      path: "/rest/v1/published_snapshots",
      method: "POST",
      body: { id: 1, version: 999, payload: {} },
    },
    {
      name: "RPC publish_portfolio_snapshot",
      path: "/rest/v1/rpc/publish_portfolio_snapshot",
      method: "POST",
      body: { p_changed_sections: ["probe"], p_notes: "Must fail" },
    },
  ];

  for (const probe of writeProbes) {
    const res = await fetch(`${url}${probe.path}`, {
      method: probe.method,
      headers: anonHeaders,
      body: JSON.stringify(probe.body),
    });
    const resBody = await res.json().catch(() => null);
    const blocked =
      res.status === 401 ||
      res.status === 403 ||
      res.status === 404 ||
      (probe.method === "PATCH" && res.status === 200 && Array.isArray(resBody) && resBody.length === 0);
    assert.ok(
      blocked,
      `Expected rejection or 0 affected rows for anonymous ${probe.name}, got HTTP ${res.status} (${JSON.stringify(resBody)})`,
    );
    console.log(`[PASS] ANON ${probe.name} blocked (HTTP ${res.status}, affected=${Array.isArray(resBody) ? resBody.length : 0})`);
  }

  // 5. ANONYMOUS: Cannot access private storage bucket
  const privBucketRes = await fetch(
    `${url}/storage/v1/object/list/portfolio-private`,
    {
      method: "POST",
      headers: anonHeaders,
      body: JSON.stringify({ prefix: "", limit: 10 }),
    },
  );
  const privList = await privBucketRes.json().catch(() => null);
  assert.ok(
    !privBucketRes.ok || (Array.isArray(privList) && privList.length === 0),
    `Expected private bucket listing to be blocked or empty for anon (got ${privBucketRes.status})`,
  );
  const privDownloadRes = await fetch(
    `${url}/storage/v1/object/portfolio-private/probe-nonexistent.pdf`,
    { headers: anonHeaders },
  );
  assert.ok(
    !privDownloadRes.ok,
    `Expected private object download to fail for anon (got ${privDownloadRes.status})`,
  );
  console.log(
    `[PASS] ANON STORAGE portfolio-private protected (list HTTP ${privBucketRes.status} items=${Array.isArray(privList) ? privList.length : 0}, download HTTP ${privDownloadRes.status})`,
  );

  console.log("=== HOSTED ANONYMOUS RLS & SECURITY CHECKS PASSED ===");
}

main().catch((err) => {
  console.error("HOSTED RLS FAILURE:", err.message || err);
  process.exit(1);
});
