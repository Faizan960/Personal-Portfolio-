import assert from "assert";
import fs from "fs";
import path from "path";
import { buildPasswordResetRedirectUrl } from "../src/lib/supabase/resetUrl";

console.log("=== PASSWORD RESET REDIRECT & STATIC EXPORT VERIFICATION ===");

// 1. Local development origin
assert.strictEqual(
  buildPasswordResetRedirectUrl("http://localhost:3000"),
  "http://localhost:3000/admin/reset-password/",
);
assert.strictEqual(
  buildPasswordResetRedirectUrl("http://localhost:3000/"),
  "http://localhost:3000/admin/reset-password/",
);
console.log("[PASS] Local development URL -> http://localhost:3000/admin/reset-password/");

// 2. Vercel Preview origin
assert.strictEqual(
  buildPasswordResetRedirectUrl(
    "https://personal-portfolio-fj5w3owcx-faizans-projects-af84d79d.vercel.app",
  ),
  "https://personal-portfolio-fj5w3owcx-faizans-projects-af84d79d.vercel.app/admin/reset-password/",
);
console.log("[PASS] Vercel Preview URL -> https://personal-portfolio-fj5w3owcx-faizans-projects-af84d79d.vercel.app/admin/reset-password/");

// 3. Canonical Production origin
assert.strictEqual(
  buildPasswordResetRedirectUrl("https://personal-portfolio-sigma-cyan-41.vercel.app"),
  "https://personal-portfolio-sigma-cyan-41.vercel.app/admin/reset-password/",
);
console.log("[PASS] Production URL -> https://personal-portfolio-sigma-cyan-41.vercel.app/admin/reset-password/");

// 4. Verify static export emitted /admin/reset-password/index.html
const exportedResetHtml = path.resolve(
  process.cwd(),
  "out/admin/reset-password/index.html",
);
assert.ok(
  fs.existsSync(exportedResetHtml),
  `Expected static export file at ${exportedResetHtml}`,
);
const html = fs.readFileSync(exportedResetHtml, "utf8");
assert.ok(
  html.includes("Reset Admin Password"),
  "Exported reset-password page must render Reset Admin Password UI",
);
console.log("[PASS] Static export emitted out/admin/reset-password/index.html");

console.log("=== ALL PASSWORD RESET CHECKS PASSED ===");
