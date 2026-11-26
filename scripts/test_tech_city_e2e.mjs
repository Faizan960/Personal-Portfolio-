import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

const ARTIFACTS_DIR =
  "C:/Users/faiza/.gemini/antigravity/brain/6bd2f77f-4cd4-4dbb-a7cd-5ba8f3f2a817";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9231;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendCDP(
  ws,
  method,
  params = {},
  id = Math.floor(Math.random() * 1000000)
) {
  return new Promise((resolve, reject) => {
    const handleMsg = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener("message", handleMsg);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };
    ws.addEventListener("message", handleMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  console.log("=== TECH CITY E2E & VISUAL VERIFICATION SUITE ===");

  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--window-size=1440,920",
    "--hide-scrollbars",
  ]);

  await sleep(1800);

  try {
    const verRes = await fetch(`http://localhost:${PORT}/json/version`);
    const verData = await verRes.json();
    const ws = new WebSocket(verData.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener("open", resolve));

    const { targetId } = await sendCDP(ws, "Target.createTarget", {
      url: "about:blank",
    });
    const pageWs = new WebSocket(
      `ws://localhost:${PORT}/devtools/page/${targetId}`
    );
    await new Promise((resolve) => pageWs.addEventListener("open", resolve));

    const consoleErrors = [];
    const screencastFrames = [];
    let recording = false;

    pageWs.addEventListener("message", (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === "Runtime.exceptionThrown") {
        consoleErrors.push(msg.params.exceptionDetails);
      }
      if (
        msg.method === "Runtime.consoleAPICalled" &&
        msg.params.type === "error"
      ) {
        consoleErrors.push(msg.params.args);
      }
      if (msg.method === "Page.screencastFrame") {
        if (recording) {
          screencastFrames.push(Buffer.from(msg.params.data, "base64"));
        }
        sendCDP(pageWs, "Page.screencastFrameAck", {
          sessionId: msg.params.sessionId,
        }).catch(() => {});
      }
    });

    await sendCDP(pageWs, "Runtime.enable");
    await sendCDP(pageWs, "Page.enable");
    await sendCDP(pageWs, "DOM.enable");
    await sendCDP(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 920,
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log("1. Navigating to http://localhost:3000/ ...");
    await sendCDP(pageWs, "Page.navigate", { url: "http://localhost:3000/" });
    await sleep(3000);

    // Verify Hero + Tech City placement & zero Molecular Globe leftovers
    const structureCheck = await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `JSON.stringify({
        hasHero: !!document.getElementById("hero"),
        hasTechCity: !!document.getElementById("tech-city"),
        hasOldUniverse: !!document.getElementById("universe"),
        hasCanvas: !!document.querySelector("#tech-city canvas"),
        dirButtons: document.querySelectorAll("#tech-city nav button").length,
        heroBeforeCity: (() => {
          const h = document.getElementById("hero");
          const c = document.getElementById("tech-city");
          return h && c ? h.getBoundingClientRect().top < c.getBoundingClientRect().top : false;
        })()
      })`,
      returnByValue: true,
    });
    console.log("Homepage structure:", structureCheck.result.value);

    // Scroll to #tech-city and let intro build animation + camera settle finish
    await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `document.getElementById("tech-city").scrollIntoView({ behavior: "instant" });`,
    });
    await sleep(3200);

    // Start screencast recording for interaction video
    recording = true;
    await sendCDP(pageWs, "Page.startScreencast", {
      format: "png",
      everyNthFrame: 2,
      maxWidth: 1280,
      maxHeight: 820,
    });

    // Screenshot 1: Full city overview
    console.log("2. Capturing tech_city_overview.png ...");
    const overviewShot = await sendCDP(pageWs, "Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "tech_city_overview.png"),
      Buffer.from(overviewShot.data, "base64")
    );

    // Orbit & Zoom interaction test via mouse events
    console.log("3. Testing drag orbit & wheel zoom ...");
    const boxRes = await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `(() => {
        const r = document.querySelector("#tech-city canvas").getBoundingClientRect();
        return JSON.stringify({ cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
      })()`,
      returnByValue: true,
    });
    const { cx, cy } = JSON.parse(boxRes.result.value);
    await sendCDP(pageWs, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: cx,
      y: cy,
      button: "left",
      clickCount: 1,
    });
    await sendCDP(pageWs, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: cx + 140,
      y: cy - 40,
      button: "left",
    });
    await sendCDP(pageWs, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: cx + 140,
      y: cy - 40,
      button: "left",
    });
    await sendCDP(pageWs, "Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: cx,
      y: cy,
      deltaX: 0,
      deltaY: -180,
    });
    await sleep(1000);

    // Scenario 2: Select District (Web Development)
    console.log("4. Selecting District (Web Development) -> tech_city_district.png ...");
    await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll("#tech-city nav button")).find(b => b.textContent.startsWith("Web Development (Domain District)"));
        if (btn) btn.click();
      })()`,
    });
    await sleep(1600);
    const districtShot = await sendCDP(pageWs, "Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "tech_city_district.png"),
      Buffer.from(districtShot.data, "base64")
    );

    // Scenario 3: Select Skill Tower (Python)
    console.log("5. Selecting Skill Tower (Python) -> tech_city_skill.png ...");
    await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll("#tech-city nav button")).find(b => b.textContent.startsWith("Python (Skill Tower)"));
        if (btn) btn.click();
      })()`,
    });
    await sleep(1600);
    const skillShot = await sendCDP(pageWs, "Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "tech_city_skill.png"),
      Buffer.from(skillShot.data, "base64")
    );

    // Scenario 4: Search & Select Project Landmark (GramCare)
    console.log("6. Selecting Project Landmark (GramCare) -> tech_city_project.png ...");
    await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll("#tech-city nav button")).find(b => b.textContent.startsWith("GramCare (Project Landmark)"));
        if (btn) btn.click();
      })()`,
    });
    await sleep(1700);
    const projectShot = await sendCDP(pageWs, "Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "tech_city_project.png"),
      Buffer.from(projectShot.data, "base64")
    );

    // Scenario 5: Search Input + Technology Orbit View (Search "Deepfake", select, then select Kotlin satellite)
    console.log("7. Testing Search + Technology Orbit View -> tech_city_tech_orbit.png ...");
    await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `(() => {
        const inp = document.querySelector('#tech-city input[type="search"]');
        if (inp) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(inp, "Deepfake");
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.focus();
        }
      })()`,
    });
    await sleep(400);
    await sendCDP(pageWs, "Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    });
    await sleep(1600);
    await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll("#tech-city nav button")).find(b => b.textContent.startsWith("Kotlin (Technology Satellite)"));
        if (btn) btn.click();
      })()`,
    });
    await sleep(1600);
    const techShot = await sendCDP(pageWs, "Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "tech_city_tech_orbit.png"),
      Buffer.from(techShot.data, "base64")
    );

    // Stop screencast before resizing for mobile
    recording = false;
    await sendCDP(pageWs, "Page.stopScreencast");

    // Scenario 6: Mobile Responsive Layout (390x844)
    console.log("8. Testing Mobile View (390x844) -> tech_city_mobile.png ...");
    await sendCDP(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `(() => {
        document.getElementById("tech-city").scrollIntoView({ behavior: "instant" });
        const btn = Array.from(document.querySelectorAll("#tech-city nav button")).find(b => b.textContent.startsWith("GramCare (Project Landmark)"));
        if (btn) btn.click();
      })()`,
    });
    await sleep(1700);
    const mobileShot = await sendCDP(pageWs, "Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "tech_city_mobile.png"),
      Buffer.from(mobileShot.data, "base64")
    );

    // Scenario 7: Verify /work/gramcare/ and /admin/dashboard/ do NOT contain Tech City
    console.log("9. Verifying Tech City does NOT appear on /work/gramcare/ or /admin/dashboard/ ...");
    await sendCDP(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 920,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sendCDP(pageWs, "Page.navigate", {
      url: "http://localhost:3000/work/gramcare/",
    });
    await sleep(1200);
    const workCheck = await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `!!document.getElementById("tech-city")`,
      returnByValue: true,
    });

    await sendCDP(pageWs, "Page.navigate", {
      url: "http://localhost:3000/admin/dashboard/",
    });
    await sleep(1200);
    const adminCheck = await sendCDP(pageWs, "Runtime.evaluate", {
      expression: `!!document.getElementById("tech-city")`,
      returnByValue: true,
    });
    console.log(
      `Tech City absent on /work/gramcare/: ${!workCheck.result.value}, absent on /admin/dashboard/: ${!adminCheck.result.value}`
    );

    // Encode interaction screencast frames to MP4 if ffmpeg is present, else save key frames
    if (screencastFrames.length > 0) {
      const tmpFramesDir = path.join(ARTIFACTS_DIR, "scratch", "tc_frames");
      fs.mkdirSync(tmpFramesDir, { recursive: true });
      screencastFrames.forEach((buf, idx) => {
        fs.writeFileSync(
          path.join(tmpFramesDir, `frame_${String(idx).padStart(4, "0")}.png`),
          buf
        );
      });
      try {
        execSync(
          `ffmpeg -y -framerate 8 -i "${path.join(tmpFramesDir, "frame_%04d.png")}" -c:v libx264 -pix_fmt yuv420p "${path.join(ARTIFACTS_DIR, "tech_city_interaction.mp4")}"`,
          { stdio: "ignore" }
        );
        console.log(
          `Saved screen recording: ${path.join(ARTIFACTS_DIR, "tech_city_interaction.mp4")} (${screencastFrames.length} frames)`
        );
      } catch {
        console.log(
          `Captured ${screencastFrames.length} screencast frames in ${tmpFramesDir} (ffmpeg not available for mp4 muxing).`
        );
      }
    }

    pageWs.close();
    ws.close();

    console.log("Console errors detected:", consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.error(JSON.stringify(consoleErrors, null, 2));
      process.exitCode = 1;
    } else {
      console.log("PASSED: 0 runtime console errors across all Tech City scenarios!");
    }
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
