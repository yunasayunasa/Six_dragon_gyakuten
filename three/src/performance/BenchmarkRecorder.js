const WARMUP_SECONDS = 10;
const MEASURE_SECONDS = 300;
// Aggregation only: callers supply frame metrics and the comparison configuration.
export class BenchmarkRecorder {
  constructor() { this.phase = 'idle'; this.elapsed = 0; this.result = null; this.resetSamples(); }
  start(configuration) {
    this.phase = 'warmup'; this.elapsed = 0; this.result = null;
    this.configuration = { ...configuration }; this.configurationChanged = false; this.resetSamples();
  }
  advance(dt) { if (this.active) this.elapsed += dt; }
  stop() { if (this.active) this.phase = 'cancelled'; }
  resetSamples() {
    this.frames = 0; this.frameSeconds = 0; this.maxFrameMs = 0;
    this.drawCalls = 0; this.triangles = 0; this.minFPS = Infinity;
    this.windowSeconds = 0; this.windowFrames = 0;
  }
  sample(frameSeconds, metrics, configuration) {
    if (this.phase !== 'warmup' && this.phase !== 'measuring') return;
    if (this.phase === 'warmup' && this.elapsed >= WARMUP_SECONDS) {
      this.phase = 'measuring'; this.resetSamples();
      this.baselineMemory = { geometries: metrics.geometries, textures: metrics.textures };
      return;
    }
    if (this.phase !== 'measuring') return;
    if (configuration.dof !== this.configuration.dof || configuration.dofQuality !== this.configuration.dofQuality || configuration.pixelRatio !== this.configuration.pixelRatio) this.configurationChanged = true;
    const seconds = Math.max(0, Math.min(frameSeconds, MEASURE_SECONDS - this.frameSeconds));
    this.frames++; this.frameSeconds += seconds;
    this.maxFrameMs = Math.max(this.maxFrameMs, frameSeconds * 1000);
    this.drawCalls += metrics.drawCalls;
    this.triangles += metrics.triangles;
    this.windowSeconds += seconds; this.windowFrames++;
    if (this.windowSeconds >= 1) {
      this.minFPS = Math.min(this.minFPS, this.windowFrames / this.windowSeconds);
      this.windowSeconds = 0; this.windowFrames = 0;
    }
    if (this.frameSeconds >= MEASURE_SECONDS) this.finish(metrics);
  }
  finish(metrics) {
    this.result = {
      averageFPS: this.frames / this.frameSeconds,
      minimumFPS: Number.isFinite(this.minFPS) ? this.minFPS : 0,
      averageFrameTime: this.frameSeconds * 1000 / this.frames,
      maximumFrameTime: this.maxFrameMs,
      drawCalls: Math.round(this.drawCalls / this.frames),
      triangles: Math.round(this.triangles / this.frames),
      geometries: metrics.geometries,
      textures: metrics.textures,
      geometriesStart: this.baselineMemory.geometries,
      texturesStart: this.baselineMemory.textures,
      programs: metrics.programs,
      dof: this.configurationChanged ? 'MIXED' : this.configuration.dof,
      dofQuality: this.configurationChanged ? 'MIXED' : this.configuration.dofQuality,
      pixelRatio: this.configurationChanged ? 'MIXED' : this.configuration.pixelRatio,
    };
    this.phase = 'done';
  }
  get active() { return this.phase === 'warmup' || this.phase === 'measuring'; }
  get remainingSeconds() { return Math.max(0, (this.phase === 'warmup' ? WARMUP_SECONDS : WARMUP_SECONDS + MEASURE_SECONDS) - this.elapsed); }
}
