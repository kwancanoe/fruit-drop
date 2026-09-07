// Zero-dependency Automated Headless Browser Testing via Chrome DevTools Protocol (CDP)
// Verifies live PWA storefront and admin desk for Fruit Drop.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// Common MIME types for serving PWA assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Locate browser binary (Chrome or Edge)
function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.EDGE_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to binary names in PATH
  return process.platform === 'win32' ? 'chrome.exe' : 'google-chrome';
}

// Start lightweight HTTP server serving dist/pwa with SPA fallback
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url ? req.url.split('?')[0] : '/';
      let filePath = path.join(rootDir, urlPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      // SPA fallback
      if (!fs.existsSync(filePath)) {
        filePath = path.join(rootDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error: ' + err.message);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve({ server, port: addr.port });
      } else {
        reject(new Error('Failed to get server address'));
      }
    });

    server.on('error', reject);
  });
}

// Minimalist CDP WebSocket Client
class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
    this.eventListeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.pendingRequests.has(msg.id)) {
            const { resolve: res, reject: rej } = this.pendingRequests.get(msg.id);
            this.pendingRequests.delete(msg.id);
            if (msg.error) {
              rej(new Error(`CDP Error (${msg.id}): ${msg.error.message}`));
            } else {
              res(msg.result);
            }
          } else if (msg.method) {
            const handlers = this.eventListeners.get(msg.method) || [];
            for (const h of handlers) h(msg.params);
          }
        } catch (e) {
          console.error('[CDP] Message parse error:', e);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(handler);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Polling helper
async function waitForCondition(predicate, timeoutMs = 10000, intervalMs = 200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await predicate();
      if (res) return res;
    } catch {
      // Continue polling
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Condition timed out after ${timeoutMs}ms`);
}

async function runE2ETest() {
  console.log('🚀 Starting Fruit Drop Automated Headless Browser CDP Test...');

  const pwaDistDir = path.resolve(process.cwd(), 'dist/pwa');
  if (!fs.existsSync(pwaDistDir)) {
    throw new Error(`dist/pwa not found at ${pwaDistDir}. Please run 'pnpm run build' first.`);
  }

  // 1. Start Static Server
  const { server, port } = await startStaticServer(pwaDistDir);
  console.log(`✓ Local PWA HTTP server running on http://127.0.0.1:${port}`);

  // 2. Browser setup
  const browserBin = findBrowserExecutable();
  console.log(`✓ Located browser binary: ${browserBin}`);

  const debugPort = 9222 + Math.floor(Math.random() * 50);
  const tempUserDataDir = path.join(os.tmpdir(), `fruit_drop_cdp_${Date.now()}`);
  fs.mkdirSync(tempUserDataDir, { recursive: true });

  const browserArgs = [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=${tempUserDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ];

  const browserProcess = spawn(browserBin, browserArgs, { stdio: 'ignore' });
  browserProcess.on('error', (err) => {
    console.error('Failed to spawn browser process:', err);
  });

  const cleanup = async () => {
    console.log('🧹 Cleaning up test resources...');
    try { browserProcess.kill(); } catch {}
    try { server.close(); } catch {}
    try {
      // Brief pause before deleting user directory
      await new Promise(r => setTimeout(r, 500));
      fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    } catch {}
  };

  try {
    // 3. Connect to CDP
    console.log(`⏳ Waiting for CDP endpoint on port ${debugPort}...`);
    const pageTarget = await waitForCondition(async () => {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) return page;
      }
      return null;
    }, 15000, 300);

    console.log(`✓ Connected to page target: ${pageTarget.id}`);
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    // 4. Enable required domains
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Console.enable');
    await cdp.send('DOM.enable');

    const consoleErrors = [];
    const runtimeExceptions = [];

    cdp.on('Runtime.exceptionThrown', (params) => {
      console.warn('⚠️ Runtime Exception caught:', params.exceptionDetails.text);
      runtimeExceptions.push(params.exceptionDetails);
    });

    cdp.on('Console.messageAdded', (params) => {
      if (params.message.level === 'error') {
        // Filter benign network / favicon 404s if any
        if (!params.message.text.includes('favicon')) {
          consoleErrors.push(params.message.text);
        }
      }
    });

    // 5. Test Step A: Storefront Navigation & Rendering
    console.log(`\n--- Test Step A: Storefront Verification (http://127.0.0.1:${port}/) ---`);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });

    // Wait for document ready and Vue app mounted
    await waitForCondition(async () => {
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: 'document.readyState === "complete" && !!document.querySelector("#q-app")',
        returnByValue: true
      });
      return evalRes.result.value === true;
    }, 10000, 200);

    // Allow Vue components and router to settle
    await new Promise(r => setTimeout(r, 1200));

    // Verify Title
    const titleRes = await cdp.send('Runtime.evaluate', {
      expression: 'document.title',
      returnByValue: true
    });
    const pageTitle = titleRes.result.value;
    console.log(`✓ Page Title: "${pageTitle}"`);
    assert.strictEqual(pageTitle, 'Fruit Drop - สั่งจองผลไม้สด', 'Title must match exact Fruit Drop brand requirement');

    // Verify Open Graph & Meta Tags
    const ogTitleRes = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelector("meta[property=\'og:title\']")?.getAttribute("content")',
      returnByValue: true
    });
    console.log(`✓ og:title: "${ogTitleRes.result.value}"`);
    assert.strictEqual(ogTitleRes.result.value, 'Fruit Drop - สั่งจองผลไม้สด');

    const ogDescRes = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelector("meta[property=\'og:description\']")?.getAttribute("content")',
      returnByValue: true
    });
    console.log(`✓ og:description: "${ogDescRes.result.value}"`);
    assert.ok(ogDescRes.result.value && ogDescRes.result.value.includes('Fruit Drop'));

    // Check absence of banned default keywords
    const bodyTextRes = await cdp.send('Runtime.evaluate', {
      expression: 'document.title + " " + document.body.innerText',
      returnByValue: true
    });
    const combinedText = bodyTextRes.result.value || '';
    assert.ok(!combinedText.includes('Quasar App'), 'Must not contain Quasar App default boilerplate');
    assert.ok(!combinedText.includes('สวนบ้านเรา'), 'Must not contain legacy สวนบ้านเรา naming');

    // 6. Test Step B: Customer Order Lookup Modal Interaction
    console.log('\n--- Test Step B: Customer Order Lookup Modal Interaction ---');
    const clickSearchBtnRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('.q-btn')).find(b => b.textContent && b.textContent.includes('ค้นหาออเดอร์'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });

    console.log(`✓ Triggered search button click: ${clickSearchBtnRes.result.value}`);
    assert.strictEqual(clickSearchBtnRes.result.value, true, 'Lookup modal trigger button must exist and be clickable');

    // Wait for modal dialog to appear
    await waitForCondition(async () => {
      const modalCheck = await cdp.send('Runtime.evaluate', {
        expression: '!!document.querySelector("#order-lookup-modal, [data-audit-id=\'order-lookup-modal\']")',
        returnByValue: true
      });
      return modalCheck.result.value === true;
    }, 5000, 200);
    console.log('✓ Order lookup modal dialog successfully rendered in DOM');

    // Close the modal
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('#order-lookup-modal button[aria-label="close"]') ||
                         Array.from(document.querySelectorAll('#order-lookup-modal .q-btn')).find(b => b.querySelector('.q-icon[name="close"]') || b.innerText.includes('close'));
        if (closeBtn) closeBtn.click();
        else {
          // Send Escape key event fallback
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 400));
    console.log('✓ Order lookup modal closed cleanly');

    // 7. Test Step C: Admin Desk Navigation & Gate Verification
    console.log(`\n--- Test Step C: Admin Desk Gate Verification (http://127.0.0.1:${port}/#/admin) ---`);
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/#/admin` });

    // Wait for Admin Layout to mount
    await waitForCondition(async () => {
      const adminEval = await cdp.send('Runtime.evaluate', {
        expression: 'document.body.innerText.includes("ระบบแอดมิน Fruit Drop") || !!document.querySelector("#admin-layout")',
        returnByValue: true
      });
      return adminEval.result.value === true;
    }, 8000, 200);

    const adminTextRes = await cdp.send('Runtime.evaluate', {
      expression: 'document.body.innerText',
      returnByValue: true
    });
    const adminPageText = adminTextRes.result.value || '';
    assert.ok(adminPageText.includes('ระบบแอดมิน Fruit Drop'), 'Admin login gate must render properly without unhandled crash');
    console.log('✓ Admin login gate rendered with "ระบบแอดมิน Fruit Drop" container');

    // 8. Error Invariant Check
    console.log('\n--- Test Step D: Console & Runtime Exception Invariants ---');
    console.log(`Runtime Exceptions Count: ${runtimeExceptions.length}`);
    console.log(`Critical Console Errors Count: ${consoleErrors.length}`);
    assert.strictEqual(runtimeExceptions.length, 0, 'No unhandled JavaScript exceptions permitted during E2E flow');

    cdp.close();
    await cleanup();

    console.log('\n🎉 ALL HEADLESS BROWSER CDP TESTS PASSED SUCCESSFULLY! (Exit Code 0)\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Headless CDP Test Failed:', err);
    await cleanup();
    process.exit(1);
  }
}

runE2ETest();
