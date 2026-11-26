import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== M5 SECURITY, STATIC EXPORT & RLS HYGIENE AUDIT ===");

const root = process.cwd();

// 1. Forbidden env files & service_role exposure check
const forbiddenEnvFiles = [".env", ".env.local", ".env.production", ".env.development"];
for (const file of forbiddenEnvFiles) {
  assert.strictEqual(
    fs.existsSync(path.join(root, file)),
    false,
    `Forbidden environment file found in repository: ${file}`,
  );
}
console.log("[PASS] 1. No local .env / credential files exist in workspace");

function walkSource(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "out") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSource(full, files);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const srcFiles = walkSource(path.join(root, "src"));
for (const file of srcFiles) {
  const content = fs.readFileSync(file, "utf8");
  assert.ok(
    !content.includes("service_role") && !content.includes("SUPABASE_SERVICE_ROLE"),
    `Service role key reference forbidden in client source: ${file}`,
  );
  assert.ok(
    !content.includes("oihvyrrcphziwseshcup"),
    `Hardcoded project ref forbidden in client source: ${file}`,
  );
}
console.log("[PASS] 2. Zero service-role keys or hardcoded Supabase URLs in src/");

// 3. Verify AdminShell blocks unauthenticated access when Supabase is configured
const adminShellSrc = fs.readFileSync(
  path.join(root, "src/components/admin/AdminShell.tsx"),
  "utf8",
);
assert.ok(
  adminShellSrc.includes("supabaseConfigured && authChecked && !isAdminVerified"),
  "AdminShell must enforce strict sign-in guard when Supabase is configured",
);
const loginSrc = fs.readFileSync(
  path.join(root, "src/app/admin/login/page.tsx"),
  "utf8",
);
assert.ok(
  loginSrc.includes("!supabaseConfigured") && loginSrc.includes("resetPasswordForEmail"),
  "Login page must support password reset and restrict local bypass to !supabaseConfigured",
);
console.log("[PASS] 3. Admin auth guard & login bypass restrictions verified");

// 4. Verify RLS and SECURITY DEFINER search_path in migration 008
const mig008 = fs.readFileSync(
  path.join(root, "supabase/migrations/008_cms_publishing_tech_city.sql"),
  "utf8",
);
assert.ok(
  mig008.includes("ALTER TABLE public.published_snapshots ENABLE ROW LEVEL SECURITY"),
  "Migration 008 must enable RLS on published_snapshots",
);
assert.ok(
  mig008.includes("ALTER TABLE public.publication_history ENABLE ROW LEVEL SECURITY"),
  "Migration 008 must enable RLS on publication_history",
);
assert.ok(
  mig008.includes("SET search_path = public, private, pg_temp") ||
    mig008.includes("SET search_path = ''"),
  "Security-definer functions in Migration 008 must explicitly pin search_path",
);
console.log("[PASS] 4. Migration 008 RLS and SECURITY DEFINER search_path hardening verified");

// 5. Optional live anonymous REST probe (only when NEXT_PUBLIC_SUPABASE_* present in process.env)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (url && key) {
  console.log("[INFO] Running live anonymous RLS write-denial & read probes against Supabase...");
  const anonHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  // Anon read on admin_users should return [] or 401/403
  const adminRes = await fetch(`${url}/rest/v1/admin_users?select=id`, {
    headers: anonHeaders,
  });
  const adminBody = await adminRes.json().catch(() => []);
  assert.ok(
    !adminRes.ok || (Array.isArray(adminBody) && adminBody.length === 0),
    "Anonymous client must never read admin_users rows",
  );

  // Anon INSERT into projects must be rejected by RLS (401/403)
  const insertRes = await fetch(`${url}/rest/v1/projects`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({
      id: "unauth-test-proj",
      name: "Should Fail",
      category: "Security Test",
      summary: "Must be blocked by RLS",
      visibility: "private",
    }),
  });
  assert.ok(
    !insertRes.ok && (insertRes.status === 401 || insertRes.status === 403),
    `Anonymous INSERT into projects must fail (got HTTP ${insertRes.status})`,
  );
  console.log("[PASS] 5. Live Supabase anonymous RLS protection verified");
} else {
  console.log("[SKIP] 5. Live Supabase REST probe skipped (no Vercel runtime env injected in this shell)");
}

console.log("=== ALL M5 SECURITY CHECKS PASSED ===");
