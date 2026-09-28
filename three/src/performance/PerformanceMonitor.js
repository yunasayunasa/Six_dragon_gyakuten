// Read counters after the complete render pipeline, without resetting them here.
export class PerformanceMonitor {
  constructor(renderer) { this.renderer = renderer; this.elapsed = 0; this.frames = 0; this.started = performance.now(); }
  snapshot() {
    const { render, memory, programs } = this.renderer.info;
    return { drawCalls: render.calls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures, programs: programs?.length ?? null };
  }
  update(dt) {
    this.elapsed += dt; this.frames++;
    if (this.elapsed < 0.5) return null;
    const value = { ...this.snapshot(), fps: this.frames / this.elapsed, frameTime: this.elapsed * 1000 / this.frames, runtime: (performance.now() - this.started) / 1000 };
    this.elapsed = 0; this.frames = 0;
    return value;
  }
}
