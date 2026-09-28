// Optional visual smoke: an already-running Chromium CDP endpoint is required.
// Not an iPhone performance benchmark. No browser automation dependency.
import { mkdir, writeFile } from 'node:fs/promises';
const endpoint = process.env.CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.TEST_URL || 'http://127.0.0.1:4173/Six_dragon_gyakuten/';
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  let ready = false;
  for (let i = 0; i < 50; i++) { await wait(500); if (await evaluate('Boolean(window.__paperAB)')) { ready = true; break; } }
  if (!ready) throw Error('Boot timeout');
  await wait(2000);
  await evaluate('window.__paperAB.pause(true)');
  const desktop = await evaluate('window.__paperAB.snapshot()');
  for (const enabled of [true, false]) {
    await evaluate(`window.__paperAB.setDOF(${enabled})`); await wait(800);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`test-results/desktop-${enabled ? 'on' : 'off'}.png`, Buffer.from(shot.data, 'base64'));
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
  await evaluate('window.__paperAB.setQuality("LOW")');
  await evaluate('window.__paperAB.setDOF(true); window.__paperAB.pause(false)');
  const start = await evaluate('window.__paperAB.snapshot()');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' }); await wait(1000);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
  const moved = await evaluate('window.__paperAB.snapshot()');
  if (moved.player[0] <= start.player[0]) throw Error('Keyboard movement failed');
  await evaluate('window.__paperAB.stage()');
  let completed = false, maxBlend = 0, focusMin = Infinity, focusMax = 0;
  for (let i = 0; i < 50; i++) { await wait(300); const s = await evaluate('window.__paperAB.snapshot()'); maxBlend = Math.max(maxBlend, s.stageBlend); focusMin = Math.min(focusMin, s.focus); focusMax = Math.max(focusMax, s.focus); if (!s.stageActive) { completed = true; break; } }
  const after = await evaluate('window.__paperAB.snapshot()');
  if (!completed || maxBlend < 0.8 || Math.abs(after.stageAngle) > 0.01 || after.stageBlend !== 0) throw Error(`Stage sequence failed: ${JSON.stringify(after)}`);
  if (focusMax - focusMin < 0.25) throw Error('Stage focus did not visibly travel');
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.reload'); await wait(4000);
  const mobile = await evaluate('window.__paperAB.snapshot()');
  if (mobile.quality !== 'MEDIUM' || mobile.pixelRatio > 1.25) throw Error('Mobile quality default failed');
  const rect = await evaluate('(()=>{const r=document.querySelector("[data-move=left]").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [rect] }); await wait(1000);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const touchMoved = await evaluate('window.__paperAB.snapshot()');
  if (touchMoved.player[0] >= mobile.player[0]) throw Error('Touch movement failed');
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('test-results/mobile-landscape.png', Buffer.from(screenshot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }); await wait(1000);
  const portrait = await evaluate('({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth})');
  if (portrait.scroll > portrait.width) throw Error('Portrait horizontal overflow');
  if (errors.length) throw Error(errors.join('\n'));
  const result = { result: 'PASS', browser: 'Chromium / software WebGL; not device FPS', desktop, mobile, keyboardMovement: true, touchMovement: true, stage: { completed, maxBlend, focusMin, focusMax }, portrait, errors };
  await writeFile('test-results/smoke.json', JSON.stringify(result, null, 2));
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally { ws.close(); }
