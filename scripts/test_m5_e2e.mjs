import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const ARTIFACTS_DIR =
  "C:/Users/faiza/.gemini/antigravity/brain/6bd2f77f-4cd4-4dbb-a7cd-5ba8f3f2a817";
const OUT_DIR = path.resolve(process.cwd(), "out");
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const CDP_PORT = 9241;
const HTTP_PORT = 3099;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || "/", `http://127.0.0.1:${HTTP_PORT}`);
      let relPath = decodeURIComponent(reqUrl.pathname);
      if (relPath.endsWith("/")) {
        relPath = path.join(relPath, "index.html");
      }
      let filePath = path.join(OUT_DIR, relPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const indexCandidate = path.join(filePath, "index.html");
        if (fs.existsSync(indexCandidate)) {
          filePath = indexCandidate;
        } else {
          const notFound = path.join(OUT_DIR, "404.html");
          res.writeHead(404, { "Content-Type": "text/html" });
          fs.createReadStream(notFound).pipe(res);
          return;
        }
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(HTTP_PORT, "127.0.0.1", () => resolve(server));
  });
}

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

async function navigateAndWait(ws, url, waitMs = 1500) {
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
    }, 8000);
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
  console.log("=== M5 LIVE STATIC EXPORT E2E & VISUAL QA ===");
  const server = await startStaticServer();
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

  await sleep(1800);
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
    await sendCDP(pageWs, "Log.enable");
    pageWs.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Runtime.exceptionThrown") {
        const ex = msg.params.exceptionDetails;
        pageErrors.push(
          ex?.exception?.description ||
            ex?.exception?.value ||
            JSON.stringify(ex),
        );
      }
      if (
        msg.method === "Runtime.consoleAPICalled" &&
        msg.params.type === "error"
      ) {
        consoleErrors.push(JSON.stringify(msg.params.args));
      }
    });

    // 1. Public Homepage
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/`, 2200);
    console.log("  [STEP 1 ERRORS]", pageErrors.length, pageErrors[0] ?? "");
    const homeCheck = await evalJS(
      pageWs,
      `
      const text = document.body.innerText;
      const canvas = document.querySelector('#tech-city canvas');
      return {
        hasName: text.includes('Faizan Patel'),
        hasTechCity: Boolean(canvas),
        hasGramCare: text.includes('GramCare'),
        hasRepoLabel: text.toLowerCase().includes('repository in development'),
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
      };
    `,
    );
    console.log("  [PUBLIC HOME]", homeCheck);
    if (!homeCheck.hasName || !homeCheck.hasTechCity || !homeCheck.hasGramCare || homeCheck.overflowX) {
      throw new Error(`Public homepage check failed: ${JSON.stringify(homeCheck)}`);
    }
    await evalJS(pageWs, `document.querySelector('#tech-city')?.scrollIntoView({ behavior: 'instant' });`);
    await sleep(900);
    await screenshot(pageWs, "m5_public_home.png");

    // 2. Prebuilt Case Study (/work/gramcare/)
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/work/gramcare/`, 1200);
    console.log("  [STEP 2 ERRORS]", pageErrors.length, pageErrors[pageErrors.length - 1] ?? "");
    const gramcareCheck = await evalJS(
      pageWs,
      `
      const text = document.body.innerText;
      return {
        hasTitle: text.includes('GramCare'),
        hasRepoLabel: text.toLowerCase().includes('repository in development'),
        hasTechCityLeak: Boolean(document.querySelector('#tech-city')),
      };
    `,
    );
    console.log("  [CASE STUDY]", gramcareCheck);
    if (!gramcareCheck.hasTitle || !gramcareCheck.hasRepoLabel || gramcareCheck.hasTechCityLeak) {
      throw new Error(`Case study check failed: ${JSON.stringify(gramcareCheck)}`);
    }

    // 3. Admin Dashboard
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/admin/dashboard/`, 1500);
    console.log("  [STEP 3 ERRORS]", pageErrors.length);
    const dashCheck = await evalJS(
      pageWs,
      `
      const text = document.body.innerText.toLowerCase();
      return {
        hasOverview: text.includes('overview'),
        hasDistricts: text.includes('tech city districts'),
        hasProjects: text.includes('projects'),
      };
    `,
    );
    console.log("  [ADMIN DASHBOARD]", dashCheck);
    if (!dashCheck.hasOverview || !dashCheck.hasDistricts) {
      throw new Error(`Dashboard check failed: ${JSON.stringify(dashCheck)}`);
    }
    await screenshot(pageWs, "m5_admin_dashboard.png");

    // 4. Admin Homepage Manager — edit Hero Primary Button Label
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/admin/homepage/`, 1200);
    await evalJS(
      pageWs,
      `
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      if (inputs[1]) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inputs[1], 'Discover My Projects');
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
      const saveBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Save Homepage'));
      saveBtn?.click();
    `,
    );
    await sleep(900);
    await screenshot(pageWs, "m5_admin_homepage.png");

    // 5. Tech City Studio Overview + Live Embedded 3D Canvas
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/admin/tech-city/`, 2200);
    const studioCheck = await evalJS(
      pageWs,
      `
      return {
        hasStudioTitle: document.body.innerText.includes('Tech City Studio'),
        hasEmbeddedCanvas: Boolean(document.querySelector('canvas')),
      };
    `,
    );
    console.log("  [TECH CITY STUDIO]", studioCheck);
    if (!studioCheck.hasStudioTitle || !studioCheck.hasEmbeddedCanvas) {
      throw new Error(`Tech City Studio check failed: ${JSON.stringify(studioCheck)}`);
    }
    await screenshot(pageWs, "m5_admin_tech_city.png");

    // 6. Publishing Center + Local Preview Publish Flow
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/admin/publishing/`, 1200);
    await evalJS(
      pageWs,
      `
      const pubBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Publish Changes Live'));
      pubBtn?.click();
    `,
    );
    await sleep(900);
    await screenshot(pageWs, "m5_admin_publishing.png");

    // 7. Admin Preview Mode on Public Homepage (?preview=1)
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/?preview=1`, 2800);
    console.log("  [STEP 7 ERRORS]", pageErrors.length, pageErrors[pageErrors.length - 1] ?? "");
    await screenshot(pageWs, "m5_preview_debug.png");
    const previewCheck = await evalJS(
      pageWs,
      `
      const text = document.body.innerText.toLowerCase();
      const raw = window.localStorage.getItem('portfolio_cms_draft_v2');
      const parsed = raw ? JSON.parse(raw) : null;
      const buttons = Array.from(document.querySelectorAll('a, button')).slice(0, 15).map((el) => el.innerText.trim());
      return {
        search: window.location.search,
        hasBanner: text.includes('previewing unpublished cms workspace changes'),
        hasDiscover: text.includes('discover my projects'),
        hasFooterYear: text.includes('2026 faizan patel'),
        hasTechCityCanvas: Boolean(document.querySelector('#tech-city canvas')),
        storedLabel: parsed?.hero?.primaryCta?.label ?? null,
        buttons,
      };
    `,
    );
    console.log("  [PUBLIC PREVIEW MODE]", previewCheck, { consoleErrors, pageErrors });
    if (!previewCheck.hasBanner || !previewCheck.hasDiscover) {
      throw new Error(`Preview mode check failed: ${JSON.stringify(previewCheck)}`);
    }

    // 8. Mobile Viewport Check (390x844)
    await sendCDP(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await navigateAndWait(pageWs, `http://127.0.0.1:${HTTP_PORT}/`, 2000);
    const mobileOverflow = await evalJS(
      pageWs,
      `return document.documentElement.scrollWidth > window.innerWidth;`,
    );
    console.log("  [MOBILE HOME]", { mobileOverflow });
    if (mobileOverflow) {
      throw new Error("Horizontal overflow detected on mobile viewport");
    }
    await screenshot(pageWs, "m5_mobile_home.png");

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(
        `Runtime errors detected! console=${JSON.stringify(consoleErrors)} page=${JSON.stringify(pageErrors)}`,
      );
    }

    console.log("=== ALL M5 E2E & VISUAL CHECKS PASSED WITH 0 RUNTIME ERRORS ===");
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error("E2E FAILURE:", err);
  process.exit(1);
});
