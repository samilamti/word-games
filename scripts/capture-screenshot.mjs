/**
 * Screenshot a local URL to a PNG file after running an init script in the page
 * — via the Chrome DevTools Protocol over a WebSocket. Zero npm deps: uses the
 * system Chrome + Node 24's global fetch/WebSocket.
 *
 * Built to capture the IAP review screenshot from the live paywall (the preview
 * MCP only returns images inline; the App Store Connect upload needs a file).
 *
 * Run (dev server must be up — npm run dev on :5188):
 *   node scripts/capture-screenshot.mjs [url] [outfile] [cssWidth] [cssHeight] [dpr]
 * Defaults: http://localhost:5188/  build/ios/iap-review-screenshot.png  414 896 2
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const URL_ = process.argv[2] ?? 'http://localhost:5188/';
const OUT = process.argv[3] ?? 'build/ios/iap-review-screenshot.png';
const W = Number(process.argv[4] ?? 414);
const H = Number(process.argv[5] ?? 896);
const DPR = Number(process.argv[6] ?? 2);

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;

// Runs in the page before capture: raise the localized paywall on demand.
const INIT_JS = `(function () {
  try { window.__lexicaDev && window.__lexicaDev.enable(); } catch (e) {}
  try { window.__lexicaUnlock && window.__lexicaUnlock.disable(); } catch (e) {}
  try { window.__lexicaPaywall && window.__lexicaPaywall.open('campaign'); } catch (e) {}
  return typeof window.__lexicaPaywall;
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*', // Chrome 111+ rejects CDP WS handshakes without this
  '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  '--user-data-dir=/tmp/lexica-chrome-cap', // isolate from Sami's real Chrome profile
  '--hide-scrollbars', '--disable-gpu',
  `--window-size=${W},${H}`,
], { stdio: 'ignore' });

try {
  // Wait for the debugger to expose a page target.
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('Chrome remote debugger never came up');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error(`WS: ${e.message ?? e}`)); });

  let nextId = 1;
  const pending = new Map();
  const events = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${JSON.stringify(m.error)}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true });

  await send('Page.navigate', { url: URL_ });
  for (let i = 0; i < 100 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await sleep(900); // React render + web fonts

  const init = await send('Runtime.evaluate', { expression: INIT_JS, returnByValue: true });
  if (init?.result?.value !== 'object') console.warn(`  ⚠ paywall hook was "${init?.result?.value}" — capture may be blank`);
  await sleep(700); // paywall mount

  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(data, 'base64'));
  console.log(`✓ wrote ${OUT}  (${W}×${H} css @ ${DPR}x → ${W * DPR}×${H * DPR} px)`);
  ws.close();
} finally {
  chrome.kill('SIGTERM');
}
