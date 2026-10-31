import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(process.env.TEMP || "C:\\Temp", "chrome_qa_profile_" + Date.now());

async function waitForChrome(port = 9222, maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Chrome failed to start on port " + port);
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.msgId = 1;
    this.callbacks = new Map();
    this.errors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
          const msg = data.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(" ");
          this.errors.push(msg);
        }
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const result = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    return result.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

async function runQA() {
  console.log("=== PROOFPATH AI: AUTOMATED FRONTEND QA AUDIT ===");
  const chromeProcess = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${USER_DATA_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-gpu",
  ]);

  try {
    await waitForChrome(9222);
    console.log("[QA SETUP] Chrome debugging instance connected.");

    // Create a tab pointing to app
    const newTabRes = await fetch("http://127.0.0.1:9222/json/new?http://localhost:5173/", { method: "PUT" });
    const tab = await newTabRes.json();
    const cdp = new CDPClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const testResults = [];

    // Helper to log test step
    function recordTest(name, passed, detail = "") {
      const mark = passed ? "✓ PASS" : "✗ FAIL";
      console.log(`  ${mark}: ${name} ${detail ? `(${detail})` : ""}`);
      testResults.push({ name, passed, detail });
    }

    // -------------------------------------------------------------------------
    // TEST 1: Navigation & Route Mounting
    // -------------------------------------------------------------------------
    console.log("\n[1/7] Testing Navigation Items & Route Mounting...");
    const routesToTest = [
      { path: "/", titleCheck: "PROOFPATH AI" },
      { path: "/dashboard", titleCheck: "Research Investigations" },
      { path: "/research", titleCheck: "Initiate Forensic Information Audit" },
      { path: "/demo", titleCheck: "Scholarship" },
      { path: "/settings", titleCheck: "Platform Settings & API Keys" },
    ];

    for (const r of routesToTest) {
      await cdp.send("Page.navigate", { url: `http://localhost:5173${r.path}` });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const bodyText = await cdp.eval("document.body.innerText");
      const passed = bodyText.includes(r.titleCheck);
      recordTest(`Route Mount: ${r.path}`, passed, `Found '${r.titleCheck}'`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Research Workspace Form & Domain Presets
    // -------------------------------------------------------------------------
    console.log("\n[2/7] Testing Research Setup Form & Domain Presets...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/research" });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Click Scholarship preset button
    const presetClicked = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const scholarshipBtn = buttons.find(b => b.innerText.includes('Government Scholarship Inquiry'));
        if (scholarshipBtn) {
          scholarshipBtn.click();
          return true;
        }
        return false;
      })()
    `);
    recordTest("Click Domain Preset (Government Scholarship)", presetClicked);

    // Verify Title and Goal were populated
    const inputsValues = await cdp.eval(`
      (() => {
        const titleInput = document.querySelector('input[placeholder*="Serverless vs Kubernetes"]');
        const goalTextarea = document.querySelector('textarea[placeholder*="What exact claims"]');
        return {
          title: titleInput ? titleInput.value : '',
          goal: goalTextarea ? goalTextarea.value : ''
        };
      })()
    `);
    const isPopulated = inputsValues.title.includes("Scholarship") && inputsValues.goal.includes("scholarship");
    recordTest("Preset Input Population", isPopulated, `Title: "${inputsValues.title.slice(0, 30)}..."`);

    // -------------------------------------------------------------------------
    // TEST 3: Sources Ingestion Tab Switching
    // -------------------------------------------------------------------------
    console.log("\n[3/7] Testing Sources Ingestion Tabs...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/sources/demo-scholarship-investigation" });
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Click 'Web URLs' tab
    const urlTabClicked = await cdp.eval(`
      (() => {
        const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Web URLs'));
        if (tab) { tab.click(); return true; }
        return false;
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const urlInputRendered = await cdp.eval(`!!document.querySelector('input[placeholder*="grants.gov"]')`);
    recordTest("Sources Tab Switch -> Web URLs", urlTabClicked && urlInputRendered);

    // Click 'Plain Text / Memo' tab
    const textTabClicked = await cdp.eval(`
      (() => {
        const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Plain Text'));
        if (tab) { tab.click(); return true; }
        return false;
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const textareaRendered = await cdp.eval(`!!document.querySelector('textarea[placeholder*="Paste verbatim memorandum"]')`);
    recordTest("Sources Tab Switch -> Plain Text", textTabClicked && textareaRendered);

    // -------------------------------------------------------------------------
    // TEST 4: Gap Analysis Findings & Filters
    // -------------------------------------------------------------------------
    console.log("\n[4/7] Testing Gap Analysis Findings & Filters...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/gaps/demo-scholarship-investigation" });
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Click 'Missing' filter
    const missingClicked = await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Missing'));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const missingVisible = await cdp.eval(`
      document.body.innerText.includes('Mandatory International Medical & Repatriation Insurance')
    `);
    recordTest("Gap Analysis Missing Filter Click", missingClicked && missingVisible);

    // -------------------------------------------------------------------------
    // TEST 5: Contradiction Scope Comparison
    // -------------------------------------------------------------------------
    console.log("\n[5/7] Testing Contradiction Explorer Scope Comparison...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/contradictions/demo-scholarship-investigation" });
    await new Promise((resolve) => setTimeout(resolve, 1400));

    // Toggle 10 Scope Dimensions
    const toggleScopeClicked = await cdp.eval(`
      (() => {
        const btn = document.querySelector('button[data-testid="toggle-scope-dimensions"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('10 Scope Dimensions'));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const scopeTableRendered = await cdp.eval(`
      document.body.innerText.includes('Forensic Scope') || document.body.innerText.includes('Applicant Category')
    `);
    recordTest("Contradiction 10-Dimensional Comparison Toggle", toggleScopeClicked && scopeTableRendered);

    // Switch to Temporal tab
    const temporalTabClicked = await cdp.eval(`
      (() => {
        const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Temporal Intelligence'));
        if (tab) { tab.click(); return true; }
        return false;
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const temporalContent = await cdp.eval(`document.body.innerText.includes('Operative Sources') || document.body.innerText.includes('Temporal')`);
    recordTest("Switch to Temporal Intelligence Tab", temporalTabClicked && temporalContent);

    // -------------------------------------------------------------------------
    // TEST 6: Verification Checklist & Task Toggle
    // -------------------------------------------------------------------------
    console.log("\n[6/7] Testing Verification Checklist & Task Toggle...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/verification/demo-scholarship-investigation" });
    await new Promise((resolve) => setTimeout(resolve, 1600));

    // Toggle task checkbox
    const taskToggled = await cdp.eval(`
      (() => {
        const toggleBtn = document.querySelector('button[aria-label="Toggle task completion"]');
        if (toggleBtn) {
          toggleBtn.click();
          return true;
        }
        return false;
      })()
    `);
    recordTest("Interactive Checklist Checkbox Click", taskToggled);

    // Filter by Critical priority
    const filterCriticalClicked = await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'CRITICAL');
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    recordTest("Verification Priority Filter: CRITICAL", filterCriticalClicked);

    // -------------------------------------------------------------------------
    // TEST 7: Responsive Mobile Drawer Interaction
    // -------------------------------------------------------------------------
    console.log("\n[7/7] Testing Mobile Responsive Drawer Interaction...");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Click Hamburger Menu Icon
    const hamburgerClicked = await cdp.eval(`
      (() => {
        const btn = document.querySelector('button[aria-label="Open mobile menu"]');
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if drawer sheet is visible
    const drawerOpen = await cdp.eval(`
      (() => {
        const drawer = document.querySelector('div.fixed.inset-0.z-50');
        return !!drawer;
      })()
    `);
    recordTest("Mobile Drawer Open on Hamburger Click", hamburgerClicked && drawerOpen);

    // Click Close button in drawer
    const closeBtnClicked = await cdp.eval(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close mobile menu"]');
        if (closeBtn) { closeBtn.click(); return true; }
        return false;
      })()
    `);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const drawerClosed = await cdp.eval(`
      (() => {
        const drawer = document.querySelector('div.fixed.inset-0.z-50');
        return !drawer;
      })()
    `);
    recordTest("Mobile Drawer Close on Button Click", closeBtnClicked && drawerClosed);

    // -------------------------------------------------------------------------
    // CONSOLE ERROR SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n[CONSOLE ERRORS CHECK]");
    if (cdp.errors.length === 0) {
      console.log("  ✓ PASS: Zero uncaught JavaScript errors or console errors during all audit steps.");
    } else {
      console.warn(`  ! Logged ${cdp.errors.length} console error(s):`);
      cdp.errors.slice(0, 5).forEach((e) => console.warn("   -", e));
    }

    cdp.close();

    // Summary
    const total = testResults.length;
    const passedCount = testResults.filter((t) => t.passed).length;
    console.log(`\n========================================`);
    console.log(`FRONTEND QA AUDIT: ${passedCount}/${total} PASSED (${cdp.errors.length} console errors)`);
    console.log(`========================================\n`);

    if (passedCount !== total) {
      process.exit(1);
    }
  } finally {
    try {
      chromeProcess.kill();
    } catch (e) {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }
}

runQA().catch((err) => {
  console.error("QA script failed:", err);
  process.exit(1);
});
