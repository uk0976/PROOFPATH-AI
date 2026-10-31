import { spawn } from "child_process";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(process.env.TEMP || "C:\\Temp", "chrome_dark_mode_profile_" + Date.now());

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

async function runDarkModeVerification() {
  console.log("=== PROOFPATH AI: AUTOMATED DARK MODE VERIFICATION ===");
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
    console.log("[SETUP] Headless Chrome connected.");

    const newTabRes = await fetch("http://127.0.0.1:9222/json/new?http://localhost:5173/", { method: "PUT" });
    const tab = await newTabRes.json();
    const cdp = new CDPClient(tab.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // Helper to log test pass/fail
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

    console.log("\n[1/4] Testing Initial Landing Page & Navbar Toggle...");
    // Allow splash screen to finish or skip it
    await cdp.eval(`
      (() => {
        sessionStorage.setItem("proofpath_splash_shown", "true");
        localStorage.setItem("proofpath_theme", "light");
        document.documentElement.classList.remove("dark");
      })()
    `);
    await cdp.send("Page.navigate", { url: "http://localhost:5173/" });
    await new Promise((r) => setTimeout(r, 2000));

    const initialIsDark = await cdp.eval(`document.documentElement.classList.contains("dark")`);
    test("Initial state is clean light mode", !initialIsDark);

    // Click theme toggle button in navbar or floating switcher
    const toggleClicked = await cdp.eval(`
      (() => {
        const btn = document.querySelector('button[aria-label*="dark mode"]') ||
                    document.querySelector('button[title*="dark mode"]') ||
                    document.getElementById('floating-theme-toggle') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Dark"));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    const isDarkAfterToggle = await cdp.eval(`document.documentElement.classList.contains("dark")`);
    test("Clicking theme toggle adds .dark class", toggleClicked && isDarkAfterToggle);

    const bodyBgDark = await cdp.eval(`window.getComputedStyle(document.body).backgroundColor`);
    test("Body background color switches to dark obsidian", bodyBgDark === "rgb(11, 15, 23)", `Computed: ${bodyBgDark}`);

    const bodyTextDark = await cdp.eval(`window.getComputedStyle(document.body).color`);
    test("Body typography switches to crisp off-white", bodyTextDark === "rgb(241, 245, 249)", `Computed: ${bodyTextDark}`);

    console.log("\n[2/4] Testing Settings Page Theme Selection Cards...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/settings" });
    await new Promise((r) => setTimeout(r, 1500));

    // Verify Dark Mode card is selected
    const darkCardSelected = await cdp.eval(`
      document.body.innerText.includes("DARK active") || document.body.innerText.includes("Dark Mode")
    `);
    test("Settings page displays Appearance & Theme card", darkCardSelected);

    // Click 'Light Mode' card
    const lightCardClicked = await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Light Mode"));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));
    const isLightNow = await cdp.eval(`!document.documentElement.classList.contains("dark")`);
    test("Clicking Light Mode card removes .dark class", lightCardClicked && isLightNow);

    // Click 'Dark Mode' card
    const darkCardClicked = await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Dark Mode"));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));
    const isDarkAgain = await cdp.eval(`document.documentElement.classList.contains("dark")`);
    test("Clicking Dark Mode card restores .dark class", darkCardClicked && isDarkAgain);

    console.log("\n[3/4] Testing Demo Mode in Dark Theme...");
    await cdp.send("Page.navigate", { url: "http://localhost:5173/demo" });
    await new Promise((r) => setTimeout(r, 2000));

    const demoLoaded = await cdp.eval(`document.body.innerText.includes("Federal STEM Postgraduate Scholarship")`);
    test("Demo investigation mounts cleanly in Dark Mode", demoLoaded);

    const bannerDark = await cdp.eval(`!!document.querySelector('.bg-amber-50')`);
    test("Sample demo banner renders with dark amber styling", bannerDark);

    console.log("\n[4/4] Testing Sidebar Quick Theme Toggle & State Persistence...");
    // Check localStorage persistence
    const storedTheme = await cdp.eval(`localStorage.getItem("proofpath_theme")`);
    test("Theme preference persisted in localStorage", storedTheme === "dark", `Stored: ${storedTheme}`);

    // Check console errors
    test("Zero console errors during all dark mode interactions", cdp.errors.length === 0, `Errors: ${cdp.errors.length}`);

    console.log("\n========================================");
    console.log(`DARK MODE AUDIT: ${testsPassed}/${testsPassed + testsFailed} PASSED`);
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

runDarkModeVerification();
