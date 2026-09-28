import './style.css';
import { Scene } from 'three';
import { createRenderer } from './core/scene/createRenderer.js';
import { loadAssets } from './demo/assets.js';
import { createForest } from './demo/createForest.js';
import { PlayerController } from './core/player/PlayerController.js';
import { CameraDirector } from './presentation/camera/CameraDirector.js';
import { DOFDirector } from './presentation/dof/DOFDirector.js';
import { createLighting } from './presentation/lighting/createLighting.js';
import { StageDirector } from './presentation/stage/StageDirector.js';
import { createInput } from './ui/mobileControls/input.js';
import { Stats } from './ui/stats/Stats.js';
async function boot() {
  const renderer = createRenderer(document.querySelector('#app'));
  const scene = new Scene(); createLighting(scene);
  const textures = await loadAssets();
  const forest = createForest(scene, textures);
  const player = new PlayerController(textures); scene.add(player);
  const camera = new CameraDirector();
  const mobile = matchMedia('(pointer: coarse)').matches;
  const dof = new DOFDirector(renderer, scene, camera.camera, mobile);
  const stage = new StageDirector(forest.stage);
  const stats = new Stats(renderer, dof);
  const labels = () => { document.querySelector('#dof').textContent = `DOF ${dof.enabled ? 'ON' : 'OFF'}`; document.querySelector('#dof').setAttribute('aria-pressed', String(dof.enabled)); document.querySelector('#quality').textContent = dof.quality; };
  const resize = () => { const width = window.visualViewport?.width || innerWidth, height = window.visualViewport?.height || innerHeight; camera.resize(width, height); dof.resize(width, height); labels(); };
  const input = createInput({ toggleDOF: () => { dof.setEnabled(!dof.enabled); labels(); }, quality: () => { dof.cycleQuality(); resize(); }, stats: () => stats.toggle(), stage: () => stage.start() });
  window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize); resize();
  const status = document.querySelector('#status');
  document.querySelector('#loading').hidden = true;
  let previous = performance.now();
  let paused = false;
  renderer.setAnimationLoop((now) => {
    const elapsed = (now - previous) / 1000; previous = now;
    const dt = paused || document.hidden ? 0 : Math.min(elapsed, 0.1);
    stage.update(dt, player);
    player.update(dt, input, camera.camera, stage.active);
    camera.update(dt, player, stage.target, stage.blend);
    for (const object of forest.billboards) object.faceCamera(camera.camera);
    const target = player.focusPoint().lerp(stage.target, stage.blend);
    dof.update(dt, target, stage.blend);
    renderer.info.reset(); dof.render(dt);
    if (!document.hidden) stats.update(elapsed);
    status.textContent = stage.active ? 'Focus → 舞台 → Player' : '看板へ歩く / 舞台ボタンで再演';
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); status.textContent = '描画が中断されました。ページを再読み込みしてください。'; renderer.setAnimationLoop(null); });
  // Small read-only snapshot + explicit controls for reproducible A/B captures.
  window.__paperAB = {
    snapshot: () => ({ ...stats.value, player: player.position.toArray(), frame: player.frame, stageActive: stage.active, stageBlend: stage.blend, stageAngle: forest.stage.rotation.x, focus: dof.bokeh.uniforms.focus.value, viewport: [innerWidth, innerHeight], mobile }),
    setDOF: (enabled) => { dof.setEnabled(enabled); labels(); },
    setQuality: (name) => { if (!['HIGH', 'MEDIUM', 'LOW'].includes(name)) throw Error('Unknown quality'); dof.quality = name; resize(); },
    stage: () => stage.start(), pause: (value) => { paused = value; },
  };
}
boot().catch((error) => { console.error(error); document.querySelector('#loading').textContent = `起動できませんでした: ${error.message}`; });
