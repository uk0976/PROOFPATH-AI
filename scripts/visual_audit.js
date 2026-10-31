import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(process.env.TEMP || "C:\\Temp", "chrome_audit_profile_" + Date.now());

const ROUTES = [
  { name: "01_landing", path: "/" },
  { name: "02_dashboard", path: "/dashboard" },
  { name: "03_research_workspace", path: "/research" },
  { name: "04_research_plan", path: "/research/demo-scholarship-investigation/plan" },
  { name: "05_intelligence_dashboard", path: "/intelligence/demo-scholarship-investigation" },
  { name: "06_investigation_dossier", path: "/investigation/demo-scholarship-investigation" },
  { name: "07_sources_explorer", path: "/sources/demo-scholarship-investigation" },
  { name: "08_gap_analysis", path: "/gaps/demo-scholarship-investigation" },
  { name: "09_contradictions", path: "/contradictions/demo-scholarship-investigation" },
  { name: "10_evidence_graph", path: "/evidence/demo-scholarship-investigation" },
  { name: "11_blindspots", path: "/blindspots/demo-scholarship-investigation" },
  { name: "12_verification_planner", path: "/verification/demo-scholarship-investigation" },
  { name: "13_report_interface", path: "/report/demo-scholarship-investigation" },
  { name: "14_settings", path: "/settings" }
];

async function waitForChrome(port = 9222, maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error("Chrome failed to start on port " + port);
}

async function captureRoute(route, width = 1440, height = 900, suffix = "desktop") {
  const url = `http://localhost:5173${route.path}`;
  const newTabRes = await fetch("http://127.0.0.1:9222/json/new?" + encodeURIComponent(url), { method: "PUT" });
  const tab = await newTabRes.json();
  const wsUrl = tab.webSocketDebuggerUrl;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();
    const errors = [];

    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((res, rej) => {
        callbacks.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
        errors.push(data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(" "));
      }
      if (data.id && callbacks.has(data.id)) {
        const { res, rej } = callbacks.get(data.id);
        callbacks.delete(data.id);
        if (data.error) rej(data.error);
        else res(data.result);
      }
    };

    ws.onerror = (err) => reject(err);

    ws.onopen = async () => {
      try {
        await send("Page.enable");
        await send("Runtime.enable");
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: width < 768
        });
        await send("Page.navigate", { url });
        
        // Wait for page load and any animation to settle
        await new Promise(r => setTimeout(r, 1500));

        const screenshot = await send("Page.captureScreenshot", {
          format: "png",
          quality: 90,
          captureBeyondViewport: false
        });

        const outDir = "./audit";
        fs.mkdirSync(outDir, { recursive: true });
        const filePath = path.join(outDir, `${route.name}_${suffix}.png`);
        fs.writeFileSync(filePath, Buffer.from(screenshot.data, "base64"));

        try { await fetch("http://127.0.0.1:9222/json/close/" + tab.id); } catch {}
        ws.close();
        resolve({ name: route.name, path: filePath, errors });
      } catch (err) {
        try { await fetch("http://127.0.0.1:9222/json/close/" + tab.id); } catch {}
        ws.close();
        reject(err);
      }
    };
  });
}

async function main() {
  console.log("Spawning isolated Chrome instance...");
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${USER_DATA_DIR}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900"
  ], { stdio: "ignore" });

  try {
    await waitForChrome();
    console.log("Chrome ready on port 9222. Running audits...");

    const auditResults = [];

    for (const route of ROUTES) {
      try {
        const res = await captureRoute(route, 1440, 900, "desktop");
        console.log(`[PASS] ${route.name} Desktop -> ${res.path} (${res.errors.length} console errs)`);
        auditResults.push(res);
      } catch (err) {
        console.error(`[FAIL] ${route.name} Desktop:`, err.message || err);
      }
    }

    // Capture mobile responsive views for core pages
    const mobileRoutes = [ROUTES[0], ROUTES[1], ROUTES[2], ROUTES[4], ROUTES[7], ROUTES[8]];
    for (const route of mobileRoutes) {
      try {
        const res = await captureRoute(route, 390, 844, "mobile");
        console.log(`[PASS] ${route.name} Mobile -> ${res.path}`);
        auditResults.push(res);
      } catch (err) {
        console.error(`[FAIL] ${route.name} Mobile:`, err.message || err);
      }
    }

    console.log(`Audit complete! Captured ${auditResults.length} views.`);
  } finally {
    console.log("Terminating Chrome...");
    chromeProc.kill("SIGTERM");
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  }
}

main().catch(console.error);
