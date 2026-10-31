import fs from "fs";
import path from "path";

async function takeScreenshot(url, outputPath, width = 1440, height = 900) {
  // 1. Create a new target/tab
  const newTabRes = await fetch("http://127.0.0.1:9222/json/new?" + encodeURIComponent(url), { method: "PUT" });
  const tab = await newTabRes.json();
  const wsUrl = tab.webSocketDebuggerUrl;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((res, rej) => {
        callbacks.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
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
        await send("Emulation.setDeviceMetricsOverride", {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false
        });
        await send("Page.navigate", { url });
        
        // Wait for page to render
        await new Promise(r => setTimeout(r, 2000));

        const screenshot = await send("Page.captureScreenshot", {
          format: "png",
          quality: 90,
          captureBeyondViewport: false
        });

        const buf = Buffer.from(screenshot.data, "base64");
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, buf);

        // Close tab
        await fetch("http://127.0.0.1:9222/json/close/" + tab.id);
        ws.close();
        resolve(outputPath);
      } catch (err) {
        try { await fetch("http://127.0.0.1:9222/json/close/" + tab.id); } catch {}
        ws.close();
        reject(err);
      }
    };
  });
}

const targetUrl = process.argv[2] || "http://localhost:5173/";
const outFile = process.argv[3] || "./audit/landing.png";

takeScreenshot(targetUrl, outFile)
  .then((p) => console.log("Screenshot saved:", p))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
