import { spawn } from "child_process";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(process.env.TEMP || "C:\\Temp", "chrome_splash_profile_" + Date.now());

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

async function runSplashVerification() {
  console.log("=== PROOFPATH AI: AUTOMATED SPLASH SCREEN & LOGO AUDIT ===");
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
    console.log("[SETUP] Chrome debugging instance connected.");

    const newTabRes = await fetch("http://127.0.0.1:9222/json/new?http://localhost:5173/", { method: "PUT" });
    const tab = await newTabRes.json();
    const cdp = new CDPClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    let testsPassed = 0;
    let testsFailed = 0;
    const test = (name, condition, extra = "") => {
      if (condition) {
        console.log(`  ✓ PASS: ${name} ${extra ? `(${extra})` : ""}`);
        testsPassed++;
      } else {
        console.error(`  ✗ FAIL: ${name} ${extra ? `(${extra})` : ""}`);
        testsFailed++;
      }
    };

    console.log("\n[1/3] Verifying Initial App Launch & Splash Screen Display...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/" });
    // Give it 600ms to mount initial frame
    await new Promise((r) => setTimeout(r, 600));

    const splashMounted = await cdp.eval(`
      !!document.querySelector('[data-testid="proofpath-splash"]') ||
      document.body.innerText.includes("FORENSIC VERIFICATION ENGINE")
    `);
    test("5-Second Splash Screen mounted on project open", splashMounted);

    const logoRendered = await cdp.eval(`
      !!document.querySelector('svg path[d*="M24 3L8 9V22"]')
    `);
    test("Signature ProofPath Logo emblem rendered in splash screen", logoRendered);

    const brandTextRendered = await cdp.eval(`
      document.body.innerText.includes("PROOFPATH") &&
      document.body.innerText.includes("Know what's missing before you decide")
    `);
    test("Brand title and tagline rendered in splash screen", brandTextRendered);

    const progressTrackerPresent = await cdp.eval(`
      document.body.innerText.includes("Initializing forensic modules")
    `);
    test("5-second forensic initialization meter present", progressTrackerPresent);

    console.log("\n[2/3] Waiting for 5-Second Duration & Elegant Fade-Out...");
    // 5000ms total + 800ms exit animation = wait 6500ms from here to be completely safe
    await new Promise((r) => setTimeout(r, 6500));

    const stillHasSplashText = await cdp.eval(`document.body.innerText.includes("FORENSIC VERIFICATION ENGINE")`);
    const splashElem = await cdp.eval(`!!document.querySelector('[data-testid="proofpath-splash"]')`);
    console.log(`  [DEBUG] stillHasSplashText: ${stillHasSplashText}, splashElem: ${splashElem}`);

    const splashFadedOut = !stillHasSplashText && !splashElem;
    test("Splash Screen completely fades out after 5 seconds", splashFadedOut);

    console.log("\n[3/3] Verifying Main Workspace Visibility & Branding...");
    const workspaceVisible = await cdp.eval(`
      document.body.innerText.includes("Start Investigation") &&
      document.body.innerText.includes("Explore Demo Mode")
    `);
    test("Main workspace and landing page fully interactive", workspaceVisible);

    const navbarLogoPresent = await cdp.eval(`
      !!document.querySelector('header svg path[d*="M24 3L8 9V22"]')
    `);
    test("New vector Logo integrated into top navigation bar", navbarLogoPresent);

    test("Zero console errors during splash screen lifecycle", cdp.errors.length === 0, `Errors: ${cdp.errors.length}`);

    console.log("\n========================================");
    console.log(`SPLASH SCREEN & LOGO AUDIT: ${testsPassed}/${testsPassed + testsFailed} PASSED`);
    console.log("========================================");

    cdp.close();
    chromeProcess.kill();
    process.exit(testsFailed === 0 ? 0 : 1);
  } catch (err) {
    console.error("[FATAL ERROR]", err);
    try { chromeProcess.kill(); } catch (e) {}
    process.exit(1);
  }
}

runSplashVerification();
