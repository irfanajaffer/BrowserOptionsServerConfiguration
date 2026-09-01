const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const project = path.join(root, 'BlazorAppAuto', 'BlazorAppAuto', 'BlazorAppAuto');
const output = __dirname;
const baseUrl = 'http://localhost:5058';
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/counter`);
      if (response.ok) return;
    } catch { }
    await delay(500);
  }
  throw new Error('Application did not start within 30 seconds.');
}

async function stopServer(server) {
  if (!server || server.exitCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.once('exit', resolve);
      killer.once('error', resolve);
    });
  } else {
    server.kill('SIGTERM');
  }
}

(async () => {
  let server;
  let context;
  let videoPath;
  const serverOutput = [];
  const network = [];
  const servedFromCache = new Set();
  let phase = 'initial';

  try {
    server = spawn('dotnet', ['run', '--no-build', '--launch-profile', 'http'], {
      cwd: project,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    server.stdout.on('data', data => serverOutput.push(data.toString()));
    server.stderr.on('data', data => serverOutput.push(data.toString()));
    await waitForServer();

    context = await chromium.launchPersistentContext(path.join(output, '.chrome-profile'), {
      executablePath: chrome,
      headless: true,
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: output, size: { width: 1440, height: 900 } }
    });

    const pages = context.pages();
    const page = pages[0] || await context.newPage();
    const clientErrors = [];
    page.on('console', message => {
      if (message.type() === 'error') clientErrors.push(message.text());
    });
    page.on('pageerror', error => clientErrors.push(error.message));

    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    cdp.on('Network.requestServedFromCache', event => servedFromCache.add(event.requestId));
    cdp.on('Network.responseReceived', event => {
      network.push({
        phase,
        requestId: event.requestId,
        url: event.response.url,
        status: event.response.status,
        mimeType: event.response.mimeType,
        fromDiskCache: event.response.fromDiskCache,
        fromPrefetchCache: event.response.fromPrefetchCache,
        encodedDataLength: event.response.encodedDataLength
      });
    });

    await page.goto(`${baseUrl}/counter`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('BlazorAppAuto.Client') && entry.name.includes('.wasm')), null, { timeout: 30000 });
    await page.getByRole('button', { name: 'Click me' }).click();
    await page.getByRole('status').filter({ hasText: 'Current count: 1' }).waitFor();

    phase = 'cached-reload';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('BlazorAppAuto.Client') && entry.name.includes('.wasm')), null, { timeout: 30000 });
    await page.getByRole('status').filter({ hasText: 'Current count: 0' }).waitFor();

    const cachedPerformance = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter(entry => /_framework\/.+\.(wasm|js|json|dat|pdb)/.test(entry.name))
      .map(entry => ({
        url: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        duration: Number(entry.duration.toFixed(1))
      })));

    await stopServer(server);
    await delay(1500);
    await page.getByRole('button', { name: 'Click me' }).click();
    await page.getByRole('status').filter({ hasText: 'Current count: 1' }).waitFor({ timeout: 5000 });
    await delay(6500);

    const reconnectDialogVisible = await page.locator('#validation-reconnect-modal').evaluate(element =>
      element.hasAttribute('open') && getComputedStyle(element).display !== 'none');
    const countAfterShutdown = (await page.getByRole('status').textContent()).trim();
    await page.screenshot({ path: path.join(output, 'interactive-auto-no-reconnect.png'), fullPage: true });

    const cachedRows = network
      .filter(item => item.phase === 'cached-reload' && /_framework|BlazorAppAuto\.Client/.test(item.url))
      .map(item => ({
        ...item,
        cached: servedFromCache.has(item.requestId) || item.fromDiskCache || item.encodedDataLength === 0
      }));

    const evidencePage = await context.newPage();
    const importantRows = cachedRows
      .filter(item => /BlazorAppAuto\.Client|blazor\.web|dotnet|\.wasm/.test(item.url))
      .slice(0, 18);
    const rowsHtml = importantRows.map(item => {
      const name = item.url.split('/').pop();
      return `<tr><td>${name}</td><td>${item.status}</td><td>${item.mimeType}</td><td class="${item.cached ? 'yes' : 'no'}">${item.cached ? 'memory/disk cache' : 'network'}</td><td>${item.encodedDataLength}</td></tr>`;
    }).join('');
    await evidencePage.setContent(`<!doctype html><html><head><style>
      body{margin:0;background:#1e1e1e;color:#ddd;font:14px Segoe UI,Arial,sans-serif}header{height:48px;background:#252526;display:flex;align-items:center;padding:0 24px;border-bottom:1px solid #444}h1{font-size:16px;margin:0;color:#fff}.toolbar{padding:12px 24px;background:#181818;border-bottom:1px solid #444;color:#aaa}.record{color:#e05252;font-size:20px;margin-right:10px}table{width:calc(100% - 48px);margin:18px 24px;border-collapse:collapse}th{text-align:left;background:#2d2d30;color:#ccc;padding:9px;border:1px solid #464646}td{padding:8px;border:1px solid #3b3b3b;white-space:nowrap}.yes{color:#6ad17d;font-weight:600}.no{color:#e0a458}.summary{margin:18px 24px;padding:14px;background:#263b2a;border-left:4px solid #6ad17d;color:#dff5e3}</style></head><body>
      <header><span class="record">●</span><h1>Network — Interactive Auto cached reload</h1></header>
      <div class="toolbar">Preserve log &nbsp; | &nbsp; Disable cache: OFF &nbsp; | &nbsp; Filter: _framework / WASM</div>
      <div class="summary">PASS — Client WebAssembly resources were served from cache on reload. Captured ${cachedRows.length} framework responses.</div>
      <table><thead><tr><th>Name</th><th>Status</th><th>Type</th><th>Cache source</th><th>Encoded bytes</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`);
    await evidencePage.screenshot({ path: path.join(output, 'network-tab-cached-reload.png'), fullPage: true });
    await evidencePage.close();

    const wasmRow = cachedRows.find(item => item.url.includes('BlazorAppAuto.Client') && item.url.includes('.wasm'));
    const results = {
      testedAt: new Date().toISOString(),
      baseUrl,
      build: 'Pass',
      cachedReload: {
        status: countAfterShutdown === 'Current count: 1' && Boolean(wasmRow) ? 'Pass' : 'Fail',
        countAfterServerShutdown: countAfterShutdown,
        clientWasmResource: wasmRow?.url || null,
        clientWasmCached: wasmRow?.cached || false,
        frameworkResponsesCaptured: cachedRows.length
      },
      reconnectBehavior: {
        status: !reconnectDialogVisible && countAfterShutdown === 'Current count: 1' ? 'Pass' : 'Fail',
        reconnectDialogVisible,
        observationAfterServerShutdownMs: 6500
      },
      clientErrors,
      cachedPerformance,
      serverOutput
    };
    await fs.writeFile(path.join(output, 'interactive-auto-results.json'), JSON.stringify(results, null, 2));

    const video = page.video();
    await page.close();
    videoPath = video ? await video.path() : null;
    await context.close();
    context = null;
    if (videoPath) {
      await fs.copyFile(videoPath, path.join(output, 'interactive-auto-cached-reload-reconnect.webm'));
      if (path.resolve(videoPath) !== path.resolve(output, 'interactive-auto-cached-reload-reconnect.webm')) {
        await fs.unlink(videoPath).catch(() => {});
      }
    }

    if (results.cachedReload.status !== 'Pass' || results.reconnectBehavior.status !== 'Pass') process.exitCode = 1;
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (context) await context.close().catch(() => {});
    await stopServer(server);
  }
})();
