import { Scene } from 'three';
import { createRenderer } from '../core/scene/createRenderer.js';
import { loadAssets } from './demoAssets.js';
import { createForest } from './createForest.js';
import { PlayerController } from '../core/character/PlayerController.js';
import { CameraDirector } from '../presentation/camera/CameraDirector.js';
import { DOFDirector } from '../presentation/dof/DOFDirector.js';
import { createLighting } from '../presentation/lighting/createLighting.js';
import { StageDirector } from '../presentation/stage/StageDirector.js';
import { StageEvents } from './StageEvents.js';
import { AudioHooks } from '../presentation/audio/AudioHooks.js';
import { DemoBenchmarkScenario } from './DemoBenchmarkScenario.js';
import { PerformanceMonitor } from '../performance/PerformanceMonitor.js';
import { PLAYER_PROFILE, SCENE_PROFILE } from './demoProfiles.js';
import { createInput } from '../ui/mobileControls/input.js';
import { Stats } from '../ui/stats/Stats.js';
export async function startDemo() {
  const renderer = createRenderer(document.querySelector('#app'));
  const scene = new Scene(); createLighting(scene, { fog: SCENE_PROFILE.fog });
  const textures = await loadAssets();
  const forest = createForest(scene, textures);
  const player = new PlayerController(textures, PLAYER_PROFILE); scene.add(player);
  const camera = new CameraDirector();
  const mobile = matchMedia('(pointer: coarse)').matches;
  const dof = new DOFDirector(renderer, scene, camera.camera, { mobile });
  const params = new URLSearchParams(location.search);
  if (params.has('dpr')) dof.setPixelRatioCap(Number(params.get('dpr')));
  if (params.has('dofQuality')) dof.setQuality(params.get('dofQuality').toUpperCase());
  const audio = new AudioHooks();
  const stage = new StageDirector((cue, prop) => audio.emit(cue, prop));
  const events = new StageEvents(forest, stage, dof, player);
  const monitor = new PerformanceMonitor(renderer);
  const benchmark = new DemoBenchmarkScenario(monitor, player, stage, events, dof, forest);
  const stats = new Stats(monitor, dof, benchmark);
  audio.emit('WaterAmbient', forest.pond.group);
  const labels = () => { document.querySelector('#dof').textContent = `DOF ${dof.enabled ? 'ON' : 'OFF'}`; document.querySelector('#dof').setAttribute('aria-pressed', String(dof.enabled)); document.querySelector('#quality').textContent = dof.quality; };
  const resize = () => { const width = window.visualViewport?.width || innerWidth, height = window.visualViewport?.height || innerHeight; camera.resize(width, height); dof.resize(width, height); labels(); };
  const runBenchmark = () => { if (benchmark.active) benchmark.stop(); else benchmark.start(); };
  const input = createInput({ toggleDOF: () => { dof.setEnabled(!dof.enabled); labels(); }, quality: () => { dof.cycleQuality(); resize(); }, stats: () => stats.toggle(), stage: () => { if (!benchmark.active) events.startNext(); }, benchmark: runBenchmark });
  window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { previous = performance.now(); });
  resize();
  const status = document.querySelector('#status');
  document.querySelector('#loading').hidden = true;
  let previous = performance.now();
  let paused = false;
  let sceneTime = 0;
  renderer.setAnimationLoop((now) => {
    const elapsed = (now - previous) / 1000; previous = now;
    const dt = paused || document.hidden ? 0 : Math.min(elapsed, 0.1);
    if (!paused && !document.hidden && benchmark.active) benchmark.update(elapsed);
    if (!benchmark.active) events.update(dt);
    stage.update(dt);
    player.update(dt, benchmark.active ? benchmark.input : input, camera.camera, events.locked && !benchmark.active);
    camera.update(dt, player, events.cameraTarget, events.blend);
    for (const object of forest.billboards) object.faceCamera(camera.camera);
    dof.update(dt, player);
    sceneTime += dt; forest.pond.update(sceneTime);
    renderer.info.reset(); dof.render(dt);
    if (!paused && !document.hidden) benchmark.sample(elapsed);
    if (!document.hidden) stats.update(elapsed);
    status.textContent = benchmark.active ? benchmark.label : events.locked ? `Focus → ${events.current.id} → Player` : '看板・ランタン・扉へ / 舞台ボタンで再演';
    const benchmarkButton = document.querySelector('#stats-toggle');
    const buttonLabel = benchmark.active ? `中止 · ${benchmark.label}` : benchmark.phase === 'done' ? '再計測' : '5分計測';
    if (benchmarkButton.textContent !== buttonLabel) benchmarkButton.textContent = buttonLabel;
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); status.textContent = '描画が中断されました。ページを再読み込みしてください。'; renderer.setAnimationLoop(null); });
  // Small read-only snapshot + explicit controls for reproducible A/B captures.
  window.__paperAB = {
    snapshot: () => ({ ...stats.value, player: player.position.toArray(), frame: player.frame, event: events.current?.id ?? null, eventPhase: events.current?.phase ?? null, eventBlend: events.blend, activeMotions: stage.active.size, signAngle: forest.sign.rotation.x, wireY: forest.wire.position.y, wireVisible: forest.wire.wire?.visible ?? false, doorAngle: forest.door.rotation.x, focus: dof.bokeh.uniforms.focus.value, viewport: [innerWidth, innerHeight], mobile, benchmark: benchmark.phase, benchmarkResult: benchmark.result, waterDepthSkipped: forest.pond.surface.userData.skipDepth }),
    setDOF: (enabled) => { dof.setEnabled(enabled); labels(); },
    setQuality: (name) => { dof.setQuality(name); resize(); },
    setDPR: (cap) => { dof.setPixelRatioCap(cap); resize(); },
    setPlayer: (x, z) => { player.position.set(x, 0, z); },
    focusWorldAt: (x, y, z, duration = 0.6) => { dof.focusTo({ getWorldPosition(out) { return out.set(x, y, z); } }, duration); },
    focusPlayer: (duration = 0.6) => { dof.focusTo(player, duration); },
    stage: (id) => id ? events.start(id) : events.startNext(),
    benchmark: () => runBenchmark(), pause: (value) => { paused = value; },
  };
}
