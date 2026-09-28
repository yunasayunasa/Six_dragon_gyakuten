import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PaperBokehPass } from './PaperBokehPass.js';
import { DOF_PROFILES, QUALITY_PROFILES } from '../../demo/profiles.js';
import { axialDistance, damp } from './math.js';
export class DOFDirector {
  constructor(renderer, scene, camera, mobile) {
    this.renderer = renderer; this.camera = camera; this.mobile = mobile;
    this.quality = mobile ? 'MEDIUM' : 'HIGH'; this.enabled = true;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bokeh = new PaperBokehPass(scene, camera, { focus: 19, aperture: DOF_PROFILES.Exploration.aperture, maxblur: DOF_PROFILES.Exploration.maxBlur });
    this.composer.addPass(this.bokeh);
    this.composer.addPass(new OutputPass());
    this.initialized = false;
  }
  update(dt, target, eventBlend) {
    const a = DOF_PROFILES.Exploration, b = DOF_PROFILES.Event;
    const uniforms = this.bokeh.uniforms;
    const distance = axialDistance(this.camera, target);
    // Initialize before the first frame; every subsequent focus change eases.
    uniforms.focus.value = this.initialized ? damp(uniforms.focus.value, distance, a.response + (b.response - a.response) * eventBlend, dt) : distance;
    this.initialized = true;
    uniforms.aperture.value = a.aperture + (b.aperture - a.aperture) * eventBlend;
    uniforms.maxblur.value = (a.maxBlur + (b.maxBlur - a.maxBlur) * eventBlend) * QUALITY_PROFILES[this.quality].blurScale;
  }
  setEnabled(value) { this.enabled = value; this.bokeh.enabled = value; }
  cycleQuality() { const names = Object.keys(QUALITY_PROFILES); this.quality = names[(names.indexOf(this.quality) + 1) % names.length]; }
  resize(width, height) {
    const profile = QUALITY_PROFILES[this.quality];
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, profile[this.mobile ? 'mobile' : 'desktop']);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(width, height);
  }
  render(dt) { this.composer.render(dt); }
}
