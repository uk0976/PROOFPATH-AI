import fs from "fs";
import path from "path";

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
        errors.push(data.params.args.map(a => a.value || a.description).join(" "));
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
        
        // Wait for data fetching & render
        await new Promise(r => setTimeout(r, 1800));

        const screenshot = await send("Page.captureScreenshot", {
          format: "png",
          quality: 90,
          captureBeyondViewport: false
        });

        const outDir = "./audit";
        fs.mkdirSync(outDir, { recursive: true });
        const filePath = path.join(outDir, `${route.name}_${suffix}.png`);
        fs.writeFileSync(filePath, Buffer.from(screenshot.data, "base64"));

        await fetch("http://127.0.0.1:9222/json/close/" + tab.id);
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

async function run() {
  console.log("Starting visual audit across all routes...");
  for (const r of ROUTES) {
    try {
      const resDesk = await captureRoute(r, 1440, 900, "desktop");
      console.log(`[PASS] ${r.name} Desktop -> ${resDesk.path} (${resDesk.errors.length} console errors)`);
      if (resDesk.errors.length > 0) {
        console.warn(`       Errors: ${resDesk.errors.slice(0, 2).join("; ")}`);
      }
    } catch (e) {
      console.error(`[FAIL] ${r.name}:`, e.message);
    }
  }
  // Also capture mobile view for key responsive pages
  for (const r of [ROUTES[0], ROUTES[1], ROUTES[4], ROUTES[7]]) {
    try {
      const resMob = await captureRoute(r, 390, 844, "mobile");
      console.log(`[PASS] ${r.name} Mobile -> ${resMob.path}`);
    } catch (e) {
      console.error(`[FAIL] ${r.name} Mobile:`, e.message);
    }
  }
}

run();
