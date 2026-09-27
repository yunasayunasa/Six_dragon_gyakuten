const fs = require('node:fs');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  let target;
  for (let i = 0; i < 20; i++) {
    try {
      const pages = await (await fetch('http://127.0.0.1:9229/json/list')).json();
      target = pages.find(page => page.url.startsWith('https://127.0.0.1:8769/'));
      if (target) break;
    } catch {}
    await sleep(500);
  }
  if (!target) throw new Error('Headless Edge page unavailable');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  let id = 0;
  ws.onmessage = event => {
    const packet = JSON.parse(event.data);
    if (packet.id && pending.has(packet.id)) { pending.get(packet.id)(packet); pending.delete(packet.id); }
    if (packet.method === 'Runtime.exceptionThrown' || packet.method === 'Log.entryAdded') errors.push(JSON.stringify(packet.params).slice(0, 500));
  };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  function command(method, params = {}) { return new Promise(resolve => { const key = ++id; pending.set(key, resolve); ws.send(JSON.stringify({ id: key, method, params })); }); }
  await command('Runtime.enable'); await command('Log.enable'); await command('Page.enable');
  const mobile = process.argv.includes('--mobile');
  if (mobile) {
    await command('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true, screenWidth: 844, screenHeight: 390 });
    await command('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await command('Page.reload', { ignoreCache: false });
    await sleep(15000);
  }
  const tapAuto = process.argv.includes('--tap-auto');
  if (tapAuto) {
    await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 634, y: 355, id: 1 }] });
    await sleep(150);
    await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(12000);
  }
  let state;
  for (let i = 0; i < 35; i++) {
    const packet = await command('Runtime.evaluate', { expression: '({secure:isSecureContext,ready:document.readyState,canvas:document.querySelector("canvas")?.getAttribute("width"),error:document.querySelector(".godot-error")?.textContent || "", loading:document.body.innerText.slice(0,180)})', returnByValue: true });
    state = packet.result?.result?.value;
    if (state?.canvas && !state.loading.includes('Game engine')) break;
    await sleep(1000);
  }
  const shot = await command('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) fs.writeFileSync(tapAuto ? 'validation/web-after-tap.png' : mobile ? 'validation/web-mobile-emulation.png' : 'validation/web-running.png', Buffer.from(shot.result.data, 'base64'));
  console.log(JSON.stringify({ state, errors: errors.slice(0, 6), screenshot: Boolean(shot.result?.data) }));
  ws.close();
  if (!state?.secure || state?.error || errors.some(x => /exceptionThrown/.test(x))) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
