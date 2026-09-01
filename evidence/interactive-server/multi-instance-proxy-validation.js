const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const project = path.join(repositoryRoot, 'BlazorServerApp', 'BlazorServerApp');
const proxyUrl = 'http://127.0.0.1:5200';
const backends = {
  A: { host: '127.0.0.1', port: 5201 },
  B: { host: '127.0.0.1', port: 5202 }
};
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function startBackend(instance, port, output) {
  const process = spawn('dotnet', [
    'run', '--no-build', '--no-launch-profile', '--urls', `http://127.0.0.1:${port}`
  ], {
    cwd: project,
    shell: false,
    windowsHide: true,
    env: {
      ...global.process.env,
      ASPNETCORE_ENVIRONMENT: 'Development',
      ServerInstance: instance
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  process.stdout.on('data', data => output.push(`[${instance}] ${data}`));
  process.stderr.on('data', data => output.push(`[${instance}] ${data}`));
  return process;
}

async function stopProcess(process) {
  if (!process || process.exitCode !== null) return;
  if (global.process.platform === 'win32') {
    await new Promise(resolve => {
      const killer = spawn('taskkill', ['/pid', String(process.pid), '/t', '/f'], {
        stdio: 'ignore', windowsHide: true
      });
      killer.once('exit', resolve);
      killer.once('error', resolve);
    });
  } else {
    process.kill('SIGTERM');
  }
}

async function waitForBackend(port) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/counter`);
      if (response.ok) return;
    } catch { }
    await delay(500);
  }
  throw new Error(`Backend on port ${port} did not start within 30 seconds.`);
}

function cookieBackend(request) {
  const match = /(?:^|;\s*)bo-backend=(A|B)(?:;|$)/.exec(request.headers.cookie || '');
  return match?.[1];
}

function createProxy(routeLog) {
  let nextBackend = 0;
  const chooseBackend = request => cookieBackend(request) || ['A', 'B'][nextBackend++ % 2];

  const server = http.createServer((request, response) => {
    const instance = chooseBackend(request);
    const target = backends[instance];
    routeLog.push(`${new Date().toISOString()} HTTP ${request.method} ${request.url} -> ${instance}`);

    const proxyRequest = http.request({
      host: target.host,
      port: target.port,
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        host: `${target.host}:${target.port}`,
        'x-forwarded-host': request.headers.host,
        'x-forwarded-proto': 'http',
        'x-proxy-backend': instance
      }
    }, proxyResponse => {
      response.writeHead(proxyResponse.statusCode, {
        ...proxyResponse.headers,
        'x-proxy-backend': instance
      });
      proxyResponse.pipe(response);
    });

    proxyRequest.on('error', error => {
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' });
      response.end(`Proxy error: ${error.message}`);
    });
    request.pipe(proxyRequest);
  });

  server.on('upgrade', (request, socket, head) => {
    const instance = chooseBackend(request);
    const target = backends[instance];
    routeLog.push(`${new Date().toISOString()} WS ${request.url} -> ${instance}`);
    const backendSocket = net.connect(target.port, target.host, () => {
      const headers = { ...request.headers, host: `${target.host}:${target.port}` };
      let requestText = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`;
      for (const [name, value] of Object.entries(headers)) {
        requestText += `${name}: ${value}\r\n`;
      }
      backendSocket.write(`${requestText}\r\n`);
      if (head.length) backendSocket.write(head);
      socket.pipe(backendSocket).pipe(socket);
    });
    backendSocket.on('error', () => socket.destroy());
  });

  return server;
}

function readDiagnostic(html, id) {
  const match = new RegExp(`<span id="${id}">([^<]*)</span>`).exec(html);
  return match?.[1]?.trim() || null;
}

async function validateWithoutAffinity() {
  const observations = [];
  for (let index = 0; index < 8; index++) {
    const detailed = index % 2 === 1;
    const url = `${proxyUrl}/counter${detailed ? '?detailed=true' : ''}`;
    const response = await fetch(url);
    const html = await response.text();
    const observation = {
      url,
      proxyBackend: response.headers.get('x-proxy-backend'),
      serverInstance: readDiagnostic(html, 'server-instance'),
      variant: readDiagnostic(html, 'request-variant'),
      logLevel: readDiagnostic(html, 'configured-log-level')
    };
    const expected = detailed
      ? { variant: 'detailed', logLevel: 'Trace' }
      : { variant: 'normal', logLevel: 'Warning' };
    observation.pass = response.ok &&
      observation.proxyBackend === observation.serverInstance &&
      observation.variant === expected.variant &&
      observation.logLevel === expected.logLevel;
    observations.push(observation);
  }

  const instances = new Set(observations.map(item => item.serverInstance));
  return {
    status: observations.every(item => item.pass) && instances.size === 2 ? 'Pass' : 'Fail',
    observations
  };
}

async function readPageState(page) {
  return {
    instance: (await page.locator('#server-instance').textContent()).trim(),
    variant: (await page.locator('#request-variant').textContent()).trim(),
    logLevel: (await page.locator('#configured-log-level').textContent()).trim(),
    requestId: (await page.locator('#request-id').textContent()).trim(),
    proxyHost: (await page.locator('#proxy-host').textContent()).trim()
  };
}

async function validateStickyClients(browser) {
  const contextA = await browser.newContext({ viewport: { width: 760, height: 820 } });
  const contextB = await browser.newContext({ viewport: { width: 760, height: 820 } });
  await contextA.addCookies([{ name: 'bo-backend', value: 'A', url: proxyUrl }]);
  await contextB.addCookies([{ name: 'bo-backend', value: 'B', url: proxyUrl }]);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const browserMessages = [];
  for (const [client, page] of [['A', pageA], ['B', pageB]]) {
    page.on('console', message => browserMessages.push(`[client ${client}] ${message.type()}: ${message.text()}`));
    page.on('pageerror', error => browserMessages.push(`[client ${client}] pageerror: ${error.message}`));
  }

  try {
    await Promise.all([
      pageA.goto(`${proxyUrl}/counter`, { waitUntil: 'domcontentloaded' }),
      pageB.goto(`${proxyUrl}/counter?detailed=true`, { waitUntil: 'domcontentloaded' })
    ]);
    await Promise.all([
      pageA.locator('#server-instance').waitFor(),
      pageB.locator('#server-instance').waitFor()
    ]);
    for (let attempt = 0; attempt < 60; attempt++) {
      if (browserMessages.filter(message => message.includes('WebSocket connected')).length >= 2) break;
      await delay(250);
    }
    if (browserMessages.filter(message => message.includes('WebSocket connected')).length < 2) {
      throw new Error('Both Interactive Server circuits did not connect through the proxy.');
    }
    await Promise.all([
      pageA.getByRole('button', { name: 'Click me' }).click(),
      pageB.getByRole('button', { name: 'Click me' }).click()
    ]);
    await Promise.all([
      pageA.getByText('Current count: 1').waitFor(),
      pageB.getByText('Current count: 1').waitFor()
    ]);

    const reloadStates = [];
    for (let index = 0; index < 3; index++) {
      await Promise.all([
        pageA.reload({ waitUntil: 'domcontentloaded' }),
        pageB.reload({ waitUntil: 'domcontentloaded' })
      ]);
      reloadStates.push({ normal: await readPageState(pageA), detailed: await readPageState(pageB) });
    }

    const normal = await readPageState(pageA);
    const detailed = await readPageState(pageB);
    const statesPass = reloadStates.every(state =>
      state.normal.instance === 'A' && state.normal.variant === 'normal' && state.normal.logLevel === 'Warning' &&
      state.detailed.instance === 'B' && state.detailed.variant === 'detailed' && state.detailed.logLevel === 'Trace');
    const status = statesPass && normal.requestId !== detailed.requestId &&
      normal.proxyHost === '127.0.0.1:5200' && detailed.proxyHost === '127.0.0.1:5200'
      ? 'Pass' : 'Fail';

    await Promise.all([
      pageA.getByRole('button', { name: 'Click me' }).click(),
      pageB.getByRole('button', { name: 'Click me' }).click()
    ]);
    await Promise.all([
      pageA.getByText('Current count: 1').waitFor(),
      pageB.getByText('Current count: 1').waitFor()
    ]);

    const normalImage = path.join(__dirname, 'multi-instance-normal.png');
    const detailedImage = path.join(__dirname, 'multi-instance-detailed.png');
    await Promise.all([
      pageA.screenshot({ path: normalImage, fullPage: true }),
      pageB.screenshot({ path: detailedImage, fullPage: true })
    ]);

    const [normalBase64, detailedBase64] = await Promise.all([
      fs.readFile(normalImage, 'base64'),
      fs.readFile(detailedImage, 'base64')
    ]);
    const evidencePage = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
    await evidencePage.setContent(`<!doctype html><html><head><style>
      body{margin:0;background:#202124;color:#eee;font:15px Segoe UI,Arial,sans-serif}header{padding:18px 24px;background:#27292d;border-bottom:1px solid #555}h1{margin:0 0 7px;font-size:22px}.pass{color:#81c995;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px}.pane{background:#303134;border:1px solid #5f6368;border-radius:8px;overflow:hidden}.url{padding:11px 14px;background:#3c4043;font-family:Consolas,monospace}.label{padding:10px 14px;color:#bdc1c6}.pane img{width:100%;display:block}</style></head><body>
      <header><h1>Multiple server instances through one reverse proxy</h1><div class="pass">${status.toUpperCase()} — BrowserOptions remained isolated per request and per client</div></header>
      <div class="grid">
        <section class="pane"><div class="url">${proxyUrl}/counter</div><div class="label">Client A · sticky backend A · normal / Warning</div><img src="data:image/png;base64,${normalBase64}"></section>
        <section class="pane"><div class="url">${proxyUrl}/counter?detailed=true</div><div class="label">Client B · sticky backend B · detailed / Trace</div><img src="data:image/png;base64,${detailedBase64}"></section>
      </div></body></html>`);
    await evidencePage.screenshot({
      path: path.join(__dirname, 'multi-instance-proxy-side-by-side.png'),
      fullPage: true
    });
    await evidencePage.close();

    return { status, normal, detailed, reloadStates, browserMessages };
  } finally {
    await fs.writeFile(
      path.join(__dirname, 'multi-instance-proxy-browser-console.txt'),
      `${browserMessages.join('\n')}\n`
    ).catch(() => {});
    await Promise.all([contextA.close(), contextB.close()]);
  }
}

(async () => {
  const serverOutput = [];
  const routeLog = [];
  let backendA;
  let backendB;
  let proxy;
  let browser;

  try {
    backendA = startBackend('A', 5201, serverOutput);
    backendB = startBackend('B', 5202, serverOutput);
    await Promise.all([waitForBackend(5201), waitForBackend(5202)]);

    proxy = createProxy(routeLog);
    await new Promise((resolve, reject) => {
      proxy.once('error', reject);
      proxy.listen(5200, '127.0.0.1', resolve);
    });

    const noAffinity = await validateWithoutAffinity();
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const stickyClients = await validateStickyClients(browser);
    const results = {
      testedAt: new Date().toISOString(),
      proxyUrl,
      backends,
      noAffinity,
      stickyClients,
      status: noAffinity.status === 'Pass' && stickyClients.status === 'Pass' ? 'Pass' : 'Fail'
    };

    await Promise.all([
      fs.writeFile(path.join(__dirname, 'multi-instance-proxy-results.json'), JSON.stringify(results, null, 2)),
      fs.writeFile(path.join(__dirname, 'multi-instance-proxy-routes.txt'), `${routeLog.join('\n')}\n`),
      fs.writeFile(path.join(__dirname, 'multi-instance-proxy-server.log'), serverOutput.join(''))
    ]);
    console.log(JSON.stringify(results, null, 2));
    if (results.status !== 'Pass') global.process.exitCode = 1;
  } catch (error) {
    console.error(error);
    serverOutput.push(`[validation error] ${error.stack || error}\n`);
    global.process.exitCode = 1;
  } finally {
    await Promise.all([
      fs.writeFile(path.join(__dirname, 'multi-instance-proxy-routes.txt'), `${routeLog.join('\n')}\n`),
      fs.writeFile(path.join(__dirname, 'multi-instance-proxy-server.log'), serverOutput.join(''))
    ]).catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (proxy) await new Promise(resolve => proxy.close(resolve));
    await Promise.all([stopProcess(backendA), stopProcess(backendB)]);
  }
})();
