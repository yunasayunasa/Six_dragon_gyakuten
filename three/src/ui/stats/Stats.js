export class Stats {
  constructor(renderer, dof, benchmark) { this.renderer = renderer; this.dof = dof; this.benchmark = benchmark; this.element = document.querySelector('#stats'); this.elapsed = 0; this.frames = 0; this.value = {}; this.started = performance.now(); }
  update(dt) {
    this.elapsed += dt; this.frames++;
    if (this.elapsed < 0.5) return;
    const info = this.renderer.info.render;
    const memory = this.renderer.info.memory;
    this.value = { fps: this.frames / this.elapsed, frameTime: this.elapsed * 1000 / this.frames, drawCalls: info.calls, triangles: info.triangles, pixelRatio: this.dof.pixelRatio, dof: this.dof.enabled, quality: this.dof.quality, focus: this.dof.bokeh.uniforms.focus.value, geometries: memory.geometries, textures: memory.textures, programs: this.renderer.info.programs?.length ?? null, runtime: (performance.now() - this.started) / 1000 };
    const v = this.value;
    const b = this.benchmark;
    const result = b.result;
    this.element.textContent = `${v.fps.toFixed(1)} FPS  /  ${v.frameTime.toFixed(1)} ms\nDRAW ${v.drawCalls}  /  TRI ${v.triangles.toLocaleString()}\nDPR ${v.pixelRatio.toFixed(2)}  /  DOF ${v.quality} ${v.dof ? 'ON' : 'OFF'}\nFOCUS ${v.focus.toFixed(2)} m  /  RUN ${v.runtime.toFixed(0)} s\nGEO ${v.geometries}  TEX ${v.textures}  PROG ${v.programs ?? '—'}` + (b.active ? `\n${b.label}` : '') + (result ? `\n5 MIN: ${result.averageFPS.toFixed(1)} avg / ${result.minimumFPS.toFixed(1)} min FPS\nFRAME ${result.averageFrameTime.toFixed(1)} avg / ${result.maximumFrameTime.toFixed(1)} max ms\nDRAW ${result.drawCalls} TRI ${result.triangles}\nGEO ${result.geometriesStart}→${result.geometries} TEX ${result.texturesStart}→${result.textures}\nDOF ${result.dof} ${result.dofQuality} / DPR ${result.pixelRatio}` : '');
    this.elapsed = 0; this.frames = 0;
  }
  toggle() { this.element.hidden = !this.element.hidden; }
}
