import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PaperBokehPass } from './PaperBokehPass.js';
import { DOF_PROFILES } from './defaultProfiles.js';
import { QUALITY_PROFILES } from '../../runtime/quality/defaultProfiles.js';
import { axialDistance, damp } from './math.js';
import { Vector3 } from 'three';
export class DOFDirector {
  constructor(renderer, scene, camera, { mobile = false, profiles = DOF_PROFILES, qualityProfiles = QUALITY_PROFILES } = {}) {
    this.profiles = profiles; this.qualityProfiles = qualityProfiles;
    this.renderer = renderer; this.camera = camera; this.mobile = mobile;
    this.quality = mobile ? 'LOW' : 'HIGH'; this.enabled = true;
    this.pixelRatioCap = null;
    this.profileName = 'Exploration'; this.focusCommand = null;
    this.aperture = this.profiles.Exploration.aperture;
    this.maxBlur = this.profiles.Exploration.maxBlur;
    this.worldPoint = new Vector3();
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bokeh = new PaperBokehPass(scene, camera, { focus: 19, aperture: this.profiles.Exploration.aperture, maxblur: this.profiles.Exploration.maxBlur });
    this.composer.addPass(this.bokeh);
    this.composer.addPass(new OutputPass());
    this.initialized = false;
  }
  focusTo(object, duration = 0.8) { this.focusCommand = { object, from: this.bokeh.uniforms.focus.value, duration, elapsed: 0 }; }
  focusDistanceTo(distance, duration = 0.8) {
    if (!Number.isFinite(distance) || distance <= 0) throw Error('Focus distance must be positive');
    this.focusCommand = { distance, from: this.bokeh.uniforms.focus.value, duration, elapsed: 0 };
  }
  setProfile(name) {
    if (!this.profiles[name]) throw Error(`Unknown DOF profile: ${name}`);
    this.profileName = name;
  }
  targetDistance(object) {
    const point = typeof object.focusPoint === 'function' ? object.focusPoint() : object.getWorldPosition(this.worldPoint);
    return axialDistance(this.camera, point);
  }
  update(dt, explorationTarget) {
    const profile = this.profiles[this.profileName];
    const uniforms = this.bokeh.uniforms;
    const command = this.focusCommand;
    const distance = command ? (command.object ? this.targetDistance(command.object) : command.distance) : this.targetDistance(explorationTarget);
    if (!this.initialized) uniforms.focus.value = distance;
    else if (command) {
      command.elapsed = Math.min(command.duration, command.elapsed + dt);
      const t = command.duration <= 0 ? 1 : command.elapsed / command.duration;
      const eased = t * t * (3 - 2 * t);
      uniforms.focus.value = command.from + (distance - command.from) * eased;
    } else uniforms.focus.value = damp(uniforms.focus.value, distance, profile.response, dt);
    this.initialized = true;
    this.aperture = damp(this.aperture, profile.aperture, 5, dt);
    this.maxBlur = damp(this.maxBlur, profile.maxBlur, 5, dt);
    uniforms.aperture.value = this.aperture;
    uniforms.maxblur.value = this.maxBlur * this.qualityProfiles[this.quality].blurScale;
  }
  setEnabled(value) { this.enabled = value; this.bokeh.enabled = value; }
  setQuality(name) { if (!this.qualityProfiles[name]) throw Error(`Unknown DOF quality: ${name}`); this.quality = name; }
  cycleQuality() { const names = this.mobile ? ['LOW', 'MEDIUM', 'HIGH'] : ['HIGH', 'MEDIUM', 'LOW']; this.quality = names[(names.indexOf(this.quality) + 1) % names.length]; }
  setPixelRatioCap(cap) { if (cap !== null && (!Number.isFinite(cap) || cap < 0.5 || cap > 2)) throw Error('DPR cap must be 0.5–2'); this.pixelRatioCap = cap; }
  resize(width, height) {
    const profile = this.qualityProfiles[this.quality];
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.pixelRatioCap ?? profile[this.mobile ? 'mobile' : 'desktop']);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(width, height);
  }
  render(dt) { this.composer.render(dt); }
}
