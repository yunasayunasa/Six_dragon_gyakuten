export class Stats {
  constructor(monitor, dof, benchmark) { this.monitor = monitor; this.dof = dof; this.benchmark = benchmark; this.element = document.querySelector('#stats'); this.value = {}; }
  update(dt) {
    const metrics = this.monitor.update(dt);
    if (!metrics) return;
    this.value = { ...metrics, pixelRatio: this.dof.pixelRatio, dof: this.dof.enabled, quality: this.dof.quality, focus: this.dof.bokeh.uniforms.focus.value };
    const v = this.value;
    const b = this.benchmark;
    const result = b.result;
    this.element.textContent = `${v.fps.toFixed(1)} FPS  /  ${v.frameTime.toFixed(1)} ms\nDRAW ${v.drawCalls}  /  TRI ${v.triangles.toLocaleString()}\nDPR ${v.pixelRatio.toFixed(2)}  /  DOF ${v.quality} ${v.dof ? 'ON' : 'OFF'}\nFOCUS ${v.focus.toFixed(2)} m  /  RUN ${v.runtime.toFixed(0)} s\nGEO ${v.geometries}  TEX ${v.textures}  PROG ${v.programs ?? '—'}` + (b.active ? `\n${b.label}` : '') + (result ? `\n5 MIN: ${result.averageFPS.toFixed(1)} avg / ${result.minimumFPS.toFixed(1)} min FPS\nFRAME ${result.averageFrameTime.toFixed(1)} avg / ${result.maximumFrameTime.toFixed(1)} max ms\nDRAW ${result.drawCalls} TRI ${result.triangles}\nGEO ${result.geometriesStart}→${result.geometries} TEX ${result.texturesStart}→${result.textures}\nDOF ${result.dof} ${result.dofQuality} / DPR ${result.pixelRatio}` : '');
  }
  toggle() { this.element.hidden = !this.element.hidden; }
}
