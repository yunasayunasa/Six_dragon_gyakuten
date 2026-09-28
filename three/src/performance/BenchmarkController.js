import { PLAYER_PROFILE } from '../demo/profiles.js';
const WARMUP_SECONDS = 10;
const MEASURE_SECONDS = 300;
const CYCLE_SECONDS = 22;
export class BenchmarkController {
  constructor(renderer, player, stage, events, dof, props) {
    Object.assign(this, { renderer, player, stage, events, dof, props });
    this.phase = 'idle'; this.elapsed = 0; this.result = null; this.fired = new Set();
    this.input = { has: (direction) => this.direction() === direction };
  }
  start() {
    if (this.events.locked) return false;
    this.events.suspendAuto = true;
    this.player.position.fromArray(PLAYER_PROFILE.start);
    this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, 0.5);
    this.phase = 'warmup'; this.elapsed = 0; this.result = null; this.fired.clear();
    this.configuration = { dof: this.dof.enabled, dofQuality: this.dof.quality, pixelRatio: this.dof.pixelRatio };
    this.configurationChanged = false;
    this.resetSamples();
    return true;
  }
  stop() {
    if (this.phase !== 'warmup' && this.phase !== 'measuring') return;
    this.phase = 'cancelled'; this.events.suspendAuto = false;
    this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, 0.7);
  }
  resetSamples() {
    this.frames = 0; this.frameSeconds = 0; this.maxFrameMs = 0;
    this.drawCalls = 0; this.triangles = 0; this.minFPS = Infinity;
    this.windowSeconds = 0; this.windowFrames = 0;
  }
  direction() {
    const segment = Math.floor((this.elapsed % 8) / 2);
    return ['right', 'up', 'left', 'down'][segment];
  }
  fireOnce(cycle, at, action) {
    const key = `${cycle}:${at}`;
    if (this.elapsed % CYCLE_SECONDS >= at && !this.fired.has(key)) { this.fired.add(key); action(); }
  }
  update(dt) {
    if (this.phase !== 'warmup' && this.phase !== 'measuring') return;
    this.elapsed += dt;
    const cycle = Math.floor(this.elapsed / CYCLE_SECONDS);
    const { sign, wire, door } = this.props;
    this.fireOnce(cycle, 0, () => { this.dof.setProfile('StageEvent'); this.dof.focusTo(sign, 0.7); this.stage.play(sign, 'rise'); });
    this.fireOnce(cycle, 0.4, () => { wire.visible = true; this.dof.focusTo(wire, 0.7); this.stage.play(wire, 'wire_drop'); });
    this.fireOnce(cycle, 5, () => { this.dof.focusTo(sign, 0.7); this.stage.play(sign, 'fall'); });
    this.fireOnce(cycle, 9, () => { this.dof.focusTo(door, 0.7); this.stage.play(door, 'fall'); });
    this.fireOnce(cycle, 13, () => { this.stage.play(door, 'rise'); });
    this.fireOnce(cycle, 17, () => { this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, 0.9); });
  }
  sample(frameSeconds) {
    if (this.phase !== 'warmup' && this.phase !== 'measuring') return;
    if (this.phase === 'warmup' && this.elapsed >= WARMUP_SECONDS) {
      this.phase = 'measuring'; this.resetSamples();
      this.baselineMemory = { geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures };
      return;
    }
    if (this.phase !== 'measuring') return;
    if (this.dof.enabled !== this.configuration.dof || this.dof.quality !== this.configuration.dofQuality || this.dof.pixelRatio !== this.configuration.pixelRatio) this.configurationChanged = true;
    const seconds = Math.max(0, Math.min(frameSeconds, MEASURE_SECONDS - this.frameSeconds));
    this.frames++; this.frameSeconds += seconds;
    this.maxFrameMs = Math.max(this.maxFrameMs, frameSeconds * 1000);
    this.drawCalls += this.renderer.info.render.calls;
    this.triangles += this.renderer.info.render.triangles;
    this.windowSeconds += seconds; this.windowFrames++;
    if (this.windowSeconds >= 1) {
      this.minFPS = Math.min(this.minFPS, this.windowFrames / this.windowSeconds);
      this.windowSeconds = 0; this.windowFrames = 0;
    }
    if (this.frameSeconds >= MEASURE_SECONDS) this.finish();
  }
  finish() {
    const memory = this.renderer.info.memory;
    this.result = {
      averageFPS: this.frames / this.frameSeconds,
      minimumFPS: Number.isFinite(this.minFPS) ? this.minFPS : 0,
      averageFrameTime: this.frameSeconds * 1000 / this.frames,
      maximumFrameTime: this.maxFrameMs,
      drawCalls: Math.round(this.drawCalls / this.frames),
      triangles: Math.round(this.triangles / this.frames),
      geometries: memory.geometries,
      textures: memory.textures,
      geometriesStart: this.baselineMemory.geometries,
      texturesStart: this.baselineMemory.textures,
      programs: this.renderer.info.programs?.length ?? null,
      dof: this.configurationChanged ? 'MIXED' : this.configuration.dof,
      dofQuality: this.configurationChanged ? 'MIXED' : this.configuration.dofQuality,
      pixelRatio: this.configurationChanged ? 'MIXED' : this.configuration.pixelRatio,
    };
    this.phase = 'done'; this.events.suspendAuto = false;
    this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, 0.8);
  }
  get active() { return this.phase === 'warmup' || this.phase === 'measuring'; }
  get label() {
    if (this.phase === 'warmup') return `準備 ${Math.ceil(Math.max(0, WARMUP_SECONDS - this.elapsed))}秒`;
    if (this.phase === 'measuring') return `計測 ${Math.ceil(Math.max(0, WARMUP_SECONDS + MEASURE_SECONDS - this.elapsed))}秒`;
    if (this.phase === 'done') return '計測結果';
    return '5分計測';
  }
}
