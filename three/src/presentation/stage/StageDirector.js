import { STAGE_MOTION_PROFILES, ease } from './stageProfiles.js';
export class StageDirector {
  constructor(onCue = () => {}) { this.active = new Map(); this.onCue = onCue; }
  prepare(prop, type, options = {}) {
    const profile = { ...STAGE_MOTION_PROFILES[type], ...options };
    if (!profile.duration) throw Error(`Unknown stage motion: ${type}`);
    prop.prepare(type, profile);
    return profile;
  }
  play(prop, type, options = {}) {
    const previous = this.active.get(prop);
    if (previous) previous.cancelled = true;
    const profile = this.prepare(prop, type, options);
    const handle = { prop, type, profile, time: 0, done: false, cancelled: false };
    this.active.set(prop, handle);
    this.onCue({ rise: 'StageRise', fall: 'StageFall', wire_drop: 'WireMove' }[type], prop);
    return handle;
  }
  update(dt) {
    for (const [prop, motion] of this.active) {
      motion.time += dt;
      const p = motion.profile;
      const t = Math.max(0, Math.min(1, (motion.time - p.delay) / p.duration));
      if (motion.type === 'rise' || motion.type === 'fall') {
        const from = motion.type === 'rise' ? prop.foldAngle : 0;
        const to = motion.type === 'rise' ? 0 : prop.foldAngle;
        prop.rotation.x = from + (to - from) * ease(p.easing, t, p.bounce);
      } else if (motion.type === 'wire_drop') {
        const fall = Math.min(1, t / 0.67);
        prop.position.y = prop.landing.y + p.dropHeight * (1 - ease(p.easing, fall));
        if (t > 0.67 && t < 0.81) prop.position.y -= p.overshoot * Math.sin(Math.PI * (t - 0.67) / 0.14);
        const sway = Math.max(0, (t - 0.67) / 0.33);
        const swing = t < 0.67 ? 0 : Math.sin(sway * Math.PI * 4) * (1 - sway) ** 2;
        prop.rotation.z = p.swing * swing;
        prop.position.x = prop.landing.x + p.swing * 2.5 * swing;
        prop.updateWire();
      }
      if (motion.time >= p.delay + p.duration) {
        if (motion.type === 'wire_drop') { prop.position.copy(prop.landing); prop.rotation.z = 0; prop.updateWire(); this.onCue('WireStop', prop); }
        else prop.rotation.x = motion.type === 'rise' ? 0 : prop.foldAngle;
        motion.done = true; this.active.delete(prop);
      }
    }
  }
  get busy() { return this.active.size > 0; }
}
