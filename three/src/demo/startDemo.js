import { Scene } from 'three';
import { createRenderer } from '../core/scene/createRenderer.js';
import { loadAssets } from './demoAssets.js';
import paperSound from './assets/acceptance-paper.mp3?url';
import { createForest } from './createForest.js';
import { AcceptanceDebug } from './AcceptanceDebug.js';
import { PlayerController } from '../core/character/PlayerController.js';
import { CameraDirector } from '../presentation/camera/CameraDirector.js';
import { DOFDirector } from '../presentation/dof/DOFDirector.js';
import { createLighting } from '../presentation/lighting/createLighting.js';
import { StageDirector } from '../presentation/stage/StageDirector.js';
import { StageEvents } from './StageEvents.js';
import { AudioHooks } from '../presentation/audio/AudioHooks.js';
import { AudioDirector } from '../presentation/audio/AudioDirector.js';
import { DemoBenchmarkScenario } from './DemoBenchmarkScenario.js';
import { PerformanceMonitor } from '../performance/PerformanceMonitor.js';
import { PLAYER_PROFILE, ACCEPTANCE_PLAYER_PROFILE, SCENE_PROFILE } from './demoProfiles.js';
import { createInput } from '../ui/mobileControls/input.js';
import { Stats } from '../ui/stats/Stats.js';
import { ApplicationLifecycle } from '../runtime/lifecycle/ApplicationLifecycle.js';
import { createDemoCollision } from './createDemoWorld.js';
import { OcclusionDirector } from '../presentation/occlusion/OcclusionDirector.js';
import { QualityManager } from '../runtime/quality/QualityManager.js';
export async function startDemo() {
  const params = new URLSearchParams(location.search);
  const acceptance = params.get('demo') !== 'regression';
  const renderer = createRenderer(document.querySelector('#app'));
  const scene = new Scene(); createLighting(scene, { fog: SCENE_PROFILE.fog });
  const textures = await loadAssets({ acceptance });
  const forest = createForest(scene, textures);
  const collision = createDemoCollision({ acceptance });
  const player = new PlayerController(textures, acceptance ? ACCEPTANCE_PLAYER_PROFILE : PLAYER_PROFILE, collision); scene.add(player);
  if (acceptance) player.paper.position.y = -0.45;
  const debug = acceptance ? new AcceptanceDebug(scene, collision, player) : null;
  const occlusion = new OcclusionDirector();
  for (const object of forest.occluders) occlusion.register(object);
  const camera = new CameraDirector();
  const mobile = matchMedia('(pointer: coarse)').matches;
  const dof = new DOFDirector(renderer, scene, camera.camera, { mobile });
  if (params.has('dpr')) dof.setPixelRatioCap(Number(params.get('dpr')));
  if (params.has('dofQuality')) dof.setQuality(params.get('dofQuality').toUpperCase());
  const audio = new AudioHooks();
  const audioDirector = new AudioDirector();
  if (acceptance) {
    for (const cue of ['StageRise', 'StageFall', 'WireMove']) audioDirector.register(cue, { url: paperSound, bus: 'se' });
    audioDirector.setVolume('master', 0.8);
    audioDirector.setVolume('se', 0.55);
  }
  let playedCues = 0;
  audio.on((cue) => { void audioDirector.play(cue).then((source) => { if (source) playedCues++; }).catch((error) => console.warn('Audio cue failed:', cue, error)); });
  const unlockAudio = () => {
    if (!acceptance || audioDirector.context?.state === 'running') return;
    void audioDirector.unlock().catch((error) => console.warn('Audio unlock failed:', error));
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  const stage = new StageDirector((cue, prop) => audio.emit(cue, prop));
  const events = new StageEvents(forest, stage, dof, player);
  const monitor = new PerformanceMonitor(renderer);
  const benchmark = new DemoBenchmarkScenario(monitor, player, stage, events, dof, forest);
  const stats = new Stats(monitor, dof, benchmark);
  audio.emit('WaterAmbient', forest.pond.group);
  const labels = () => { document.querySelector('#dof').textContent = `DOF ${dof.enabled ? 'ON' : 'OFF'}`; document.querySelector('#dof').setAttribute('aria-pressed', String(dof.enabled)); document.querySelector('#quality').textContent = dof.quality; document.querySelector('#audio').textContent = `音 ${audioDirector.muted ? 'OFF' : 'ON'}`; document.querySelector('#audio').setAttribute('aria-pressed', String(audioDirector.muted)); };
  const resize = () => { const width = window.visualViewport?.width || innerWidth, height = window.visualViewport?.height || innerHeight; camera.resize(width, height); dof.resize(width, height); labels(); };
  const qualityManager = new QualityManager(dof, { enabled: params.get('adaptive') === '1', onChange: resize });
  const runBenchmark = () => { if (benchmark.active) benchmark.stop(); else benchmark.start(); };
  let input;
  const lifecycle = new ApplicationLifecycle({
    onSuspend: () => { input?.reset(); void audioDirector.setPaused(true).catch((error) => console.warn('Audio suspend failed:', error)); },
    onResume: () => { void audioDirector.setPaused(false).catch((error) => console.warn('Audio resume failed:', error)); },
  });
  input = createInput({ toggleDOF: () => { dof.setEnabled(!dof.enabled); labels(); }, quality: () => { dof.cycleQuality(); qualityManager.manualQualityChanged(); }, mute: () => { audioDirector.setMuted(!audioDirector.muted); labels(); }, debug: () => { if (!debug) return; document.querySelector('#debug').setAttribute('aria-pressed', String(debug.toggle())); }, stats: () => stats.toggle(), stage: () => { if (!benchmark.active) events.startNext(); }, benchmark: runBenchmark, canInput: () => lifecycle.active });
  if (!acceptance) document.querySelector('#debug').hidden = true;
  window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
  resize();
  const status = document.querySelector('#status');
  document.querySelector('#loading').hidden = true;
  let sceneTime = 0;
  renderer.setAnimationLoop((now) => {
    const elapsed = lifecycle.tick(now);
    qualityManager.update(elapsed, { active: lifecycle.active, benchmark: benchmark.active });
    const dt = Math.min(elapsed, 0.1);
    if (lifecycle.active && benchmark.active) benchmark.update(elapsed);
    if (lifecycle.active && !benchmark.active) events.update(dt);
    stage.update(dt);
    player.update(dt, benchmark.active ? benchmark.input : input, camera.camera, events.locked && !benchmark.active);
    camera.update(dt, player, events.cameraTarget, events.blend);
    debug?.update();
    occlusion.update(dt, camera.camera, player);
    for (const object of forest.billboards) object.faceCamera(camera.camera);
    dof.update(dt, player);
    sceneTime += dt; forest.pond.update(sceneTime);
    renderer.info.reset(); dof.render(dt);
    if (lifecycle.active) benchmark.sample(elapsed);
    if (!document.hidden) stats.update(elapsed);
    status.textContent = benchmark.active ? benchmark.label : events.locked ? `Focus → ${events.current.id} → Player` : debug?.group.visible ? debug.label : '看板・ランタン・扉へ / 舞台ボタンで再演';
    const benchmarkButton = document.querySelector('#stats-toggle');
    const buttonLabel = benchmark.active ? `中止 · ${benchmark.label}` : benchmark.phase === 'done' ? '再計測' : '5分計測';
    if (benchmarkButton.textContent !== buttonLabel) benchmarkButton.textContent = buttonLabel;
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); status.textContent = '描画が中断されました。ページを再読み込みしてください。'; renderer.setAnimationLoop(null); });
  // Small read-only snapshot + explicit controls for reproducible A/B captures.
  window.__paperAB = {
    snapshot: () => ({ ...stats.value, acceptance, player: player.position.toArray(), frame: player.frame, direction: player.animator.direction, spriteState: player.animator.state, event: events.current?.id ?? null, eventPhase: events.current?.phase ?? null, eventBlend: events.blend, activeMotions: stage.active.size, signAngle: forest.sign.rotation.x, wireY: forest.wire.position.y, wireVisible: forest.wire.wire?.visible ?? false, doorAngle: forest.door.rotation.x, focus: dof.bokeh.uniforms.focus.value, viewport: [innerWidth, innerHeight], mobile, benchmark: benchmark.phase, benchmarkResult: benchmark.result, waterDepthSkipped: forest.pond.surface.userData.skipDepth, debugPath: debug?.route.length ?? null, debugLOS: debug?.hasSight ?? null, audioState: audioDirector.context?.state ?? 'locked', audioPlayed: playedCues, muted: audioDirector.muted, batchedTrees: forest.treeBatch.count, occludedIds: forest.occluders.flatMap((object, index) => occlusion.entries.get(object)?.opacity < 0.995 ? [index] : []) }),
    setDOF: (enabled) => { dof.setEnabled(enabled); labels(); },
    setQuality: (name) => { dof.setQuality(name); qualityManager.manualQualityChanged(); },
    setDPR: (cap) => { qualityManager.setManualCap(cap); },
    setPlayer: (x, z) => { player.position.set(x, 0, z); },
    focusWorldAt: (x, y, z, duration = 0.6) => { dof.focusTo({ getWorldPosition(out) { return out.set(x, y, z); } }, duration); },
    focusPlayer: (duration = 0.6) => { dof.focusTo(player, duration); },
    stage: (id) => id ? events.start(id) : events.startNext(),
    benchmark: () => runBenchmark(), pause: (value) => { lifecycle.setPaused(value); },
    setDebugTarget: (x, z) => debug?.setTarget(x, z),
  };
}
