// Optional local visual check. An already-running Chromium CDP endpoint is required.
// This checks translucent-water/Bokeh depth in four front/back combinations.
import { mkdir, writeFile } from 'node:fs/promises';
const endpoint = process.env.CDP_URL || 'http://127.0.0.1:9232';
const url = process.env.TEST_URL || 'http://127.0.0.1:4174/Six_dragon_gyakuten/';
const tabs = await (await fetch(`${endpoint}/json/list`)).json();
const tab = tabs.find((t) => t.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let seq = 0; const pending = new Map(), errors = [];
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(message.error) : p.resolve(message.result); }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ' ' + JSON.stringify(message.params.exceptionDetails.exception));
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((a) => a.value || a.description).join(' '));
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir('test-results', { recursive: true });
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url });
  let ready = false;
  for (let i = 0; i < 60; i++) { await wait(500); if (await evaluate('Boolean(window.__paperAB)')) { ready = true; break; } }
  if (!ready) throw Error('Boot timeout');
  const cases = [
    ['player-front_focus-front', 2.2, 2.5],
    ['player-front_focus-back', 2.2, -3.2],
    ['player-back_focus-front', -3.2, 2.5],
    ['player-back_focus-back', -3.2, -3.2],
  ];
  const results = [];
  for (const [name, playerZ, focusZ] of cases) {
    await evaluate(`window.__paperAB.setPlayer(-5.2,${playerZ}); window.__paperAB.focusWorldAt(-5.2,0.9,${focusZ},0.7)`);
    await wait(1800);
    const snapshot = await evaluate('window.__paperAB.snapshot()');
    if (!snapshot.waterDepthSkipped || !Number.isFinite(snapshot.focus)) throw Error(`Depth setup failed: ${name}`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`test-results/water-${name}.png`, Buffer.from(shot.data, 'base64'));
    results.push({ name, focus: snapshot.focus, fps: snapshot.fps, drawCalls: snapshot.drawCalls, triangles: snapshot.triangles });
  }
  await evaluate('window.__paperAB.setDPR(1); window.__paperAB.setQuality("LOW")');
  await wait(700);
  const lowAtOne = await evaluate('window.__paperAB.snapshot()');
  await evaluate('window.__paperAB.setQuality("MEDIUM")');
  await wait(700);
  const mediumAtOne = await evaluate('window.__paperAB.snapshot()');
  if (lowAtOne.pixelRatio !== 1 || lowAtOne.quality !== 'LOW' || mediumAtOne.pixelRatio !== 1 || mediumAtOne.quality !== 'MEDIUM') throw Error(`Independent DPR/DOF quality comparison failed: ${JSON.stringify({ lowAtOne, mediumAtOne })}`);
  if (errors.length) throw Error(errors.join('\n'));
  const result = { result: 'PASS', renderer: 'Chromium software WebGL; not iPhone FPS', waterDepthSkipped: true, cases: results, qualityCases: ['DPR0.85/LOW', 'DPR1.00/LOW', 'DPR1.00/MEDIUM'], errors };
  await writeFile('test-results/water-depth.json', JSON.stringify(result, null, 2));
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally { ws.close(); }
