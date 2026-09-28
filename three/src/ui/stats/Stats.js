export class Stats {
  constructor(renderer, dof) { this.renderer = renderer; this.dof = dof; this.element = document.querySelector('#stats'); this.elapsed = 0; this.frames = 0; this.value = {}; }
  update(dt) {
    this.elapsed += dt; this.frames++;
    if (this.elapsed < 0.5) return;
    const info = this.renderer.info.render;
    this.value = { fps: this.frames / this.elapsed, frameTime: this.elapsed * 1000 / this.frames, drawCalls: info.calls, triangles: info.triangles, pixelRatio: this.dof.pixelRatio, dof: this.dof.enabled, quality: this.dof.quality, focus: this.dof.bokeh.uniforms.focus.value };
    const v = this.value;
    this.element.textContent = `${v.fps.toFixed(1)} FPS  /  ${v.frameTime.toFixed(1)} ms\nDRAW ${v.drawCalls}  /  TRI ${v.triangles.toLocaleString()}\nDPR ${v.pixelRatio.toFixed(2)}  /  ${v.quality}\nDOF ${v.dof ? 'ON' : 'OFF'}  /  FOCUS ${v.focus.toFixed(2)} m`;
    this.elapsed = 0; this.frames = 0;
  }
  toggle() { this.element.hidden = !this.element.hidden; }
}
