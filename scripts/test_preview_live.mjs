import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const ARTIFACTS_DIR =
  "C:/Users/faiza/.gemini/antigravity/brain/6bd2f77f-4cd4-4dbb-a7cd-5ba8f3f2a817";
const PREVIEW_URL =
  "https://personal-portfolio-kp07jfeii-faizans-projects-af84d79d.vercel.app";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const CDP_PORT = 9245;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sendCDP(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1_000_000);
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        ws.removeEventListener("message", onMsg);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJS(ws, expression) {
  const res = await sendCDP(ws, "Runtime.evaluate", {
    expression: `(() => { ${expression} })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(
      `JS Exception: ${JSON.stringify(res.exceptionDetails.text || res.exceptionDetails)}`,
    );
  }
  return res.result?.value;
}

async function navigateAndWait(ws, url, waitMs = 2500) {
  const loaded = new Promise((resolve) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Page.loadEventFired") {
        ws.removeEventListener("message", onMsg);
        resolve();
      }
    };
    ws.addEventListener("message", onMsg);
    setTimeout(() => {
      ws.removeEventListener("message", onMsg);
      resolve();
    }, 12000);
  });
  await sendCDP(ws, "Page.navigate", { url });
  await loaded;
  await sleep(waitMs);
}

async function screenshot(ws, filename) {
  const { data } = await sendCDP(ws, "Page.captureScreenshot", {
    format: "png",
  });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, filename), Buffer.from(data, "base64"));
  console.log(`  [SHOT] Saved ${filename}`);
}

async function main() {
  console.log(`=== VERCEL PREVIEW LIVE SUPABASE INTEGRATION QA ===`);
  console.log(`Target: ${PREVIEW_URL}`);

  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${CDP_PORT}`,
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--window-size=1440,920",
    "--hide-scrollbars",
  ]);

  await sleep(2000);
  const consoleErrors = [];
  const pageErrors = [];

  try {
    const ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
    const browserWs = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r) => browserWs.addEventListener("open", r));
    const { targetId } = await sendCDP(browserWs, "Target.createTarget", {
      url: "about:blank",
    });
    const pageWs = new WebSocket(
      `ws://127.0.0.1:${CDP_PORT}/devtools/page/${targetId}`,
    );
    await new Promise((r) => pageWs.addEventListener("open", r));

    await sendCDP(pageWs, "Page.enable");
    await sendCDP(pageWs, "Runtime.enable");
    pageWs.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Runtime.exceptionThrown") {
        const ex = msg.params.exceptionDetails;
        pageErrors.push(
          ex?.exception?.description || ex?.exception?.value || JSON.stringify(ex),
        );
      }
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        consoleErrors.push(JSON.stringify(msg.params.args));
      }
    });

    // 1. Live Vercel Preview Homepage -> verify Supabase published_snapshots fetch
    await navigateAndWait(pageWs, `${PREVIEW_URL}/`, 3000);
    const homeInfo = await evalJS(
      pageWs,
      `
      const text = document.body.innerText.toLowerCase();
      const resources = performance.getEntriesByType('resource').map((r) => r.name);
      const fetchedSnapshot = resources.some((u) => u.includes('oihvyrrcphziwseshcup.supabase.co') && u.includes('published_snapshots'));
      return {
        title: document.title,
        hasName: text.includes('faizan patel'),
        hasTechCityCanvas: Boolean(document.querySelector('#tech-city canvas')),
        hasGramCare: text.includes('gramcare'),
        hasRepoLabel: text.includes('repository in development'),
        fetchedSnapshot,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
      };
    `,
    );
    console.log("  [VERCEL PREVIEW HOME]", homeInfo);
    if (!homeInfo.hasName || !homeInfo.hasTechCityCanvas || !homeInfo.fetchedSnapshot || homeInfo.overflowX) {
      throw new Error(`Vercel Preview homepage check failed: ${JSON.stringify(homeInfo)}`);
    }
    await evalJS(pageWs, `document.querySelector('#tech-city')?.scrollIntoView({ behavior: 'instant' });`);
    await sleep(900);
    await screenshot(pageWs, "m58_vercel_preview_home.png");

    // 2. Live Case Study
    await navigateAndWait(pageWs, `${PREVIEW_URL}/work/gramcare/`, 1800);
    const caseInfo = await evalJS(
      pageWs,
      `const t = document.body.innerText.toLowerCase(); return { hasGramCare: t.includes('gramcare'), hasRepoLabel: t.includes('repository in development') };`,
    );
    console.log("  [VERCEL PREVIEW CASE STUDY]", caseInfo);
    if (!caseInfo.hasGramCare || !caseInfo.hasRepoLabel) {
      throw new Error(`Case study check failed: ${JSON.stringify(caseInfo)}`);
    }

    // 3. Admin Login (must show Supabase Auth form & hide local bypass)
    await navigateAndWait(pageWs, `${PREVIEW_URL}/admin/login/`, 2000);
    const loginInfo = await evalJS(
      pageWs,
      `
      const t = document.body.innerText.toLowerCase();
      return {
        hasEmailInput: Boolean(document.querySelector('input[type="email"]')),
        hasPasswordInput: Boolean(document.querySelector('input[type="password"]')),
        hasLocalBypass: t.includes('continue in local development mode') || t.includes('enter local cms'),
      };
    `,
    );
    console.log("  [VERCEL PREVIEW ADMIN LOGIN]", loginInfo);
    if (!loginInfo.hasEmailInput || !loginInfo.hasPasswordInput || loginInfo.hasLocalBypass) {
      throw new Error(`Admin login guard check failed: ${JSON.stringify(loginInfo)}`);
    }
    await screenshot(pageWs, "m58_vercel_preview_login.png");

    // 4. Unauthenticated /admin/dashboard/ must block/redirect to sign-in
    await navigateAndWait(pageWs, `${PREVIEW_URL}/admin/dashboard/`, 2200);
    const dashGuard = await evalJS(
      pageWs,
      `
      const t = document.body.innerText.toLowerCase();
      return {
        url: window.location.pathname,
        blockedUnauth: window.location.pathname.includes('/admin/login') || t.includes('sign in') || t.includes('authentication required'),
      };
    `,
    );
    console.log("  [VERCEL PREVIEW AUTH GUARD]", dashGuard);
    if (!dashGuard.blockedUnauth) {
      throw new Error(`Unauthenticated dashboard was not guarded: ${JSON.stringify(dashGuard)}`);
    }

    // 5. Unauthenticated ?preview=1 must deny unpublished preview
    await navigateAndWait(pageWs, `${PREVIEW_URL}/?preview=1`, 2200);
    const previewGuard = await evalJS(
      pageWs,
      `const t = document.body.innerText.toLowerCase(); return { deniedBanner: t.includes('admin sign-in is required to preview unpublished changes') };`,
    );
    console.log("  [VERCEL PREVIEW ?preview=1 GUARD]", previewGuard);
    if (!previewGuard.deniedBanner) {
      throw new Error(`Unauthenticated ?preview=1 was not denied cleanly`);
    }

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(
        `Runtime errors on Vercel Preview: console=${JSON.stringify(consoleErrors)} page=${JSON.stringify(pageErrors)}`,
      );
    }

    console.log("=== VERCEL PREVIEW LIVE INTEGRATION CHECKS PASSED (0 RUNTIME ERRORS) ===");
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error("VERCEL PREVIEW QA FAILURE:", err);
  process.exit(1);
});
