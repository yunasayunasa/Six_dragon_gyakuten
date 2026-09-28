import { Vector3 } from 'three';
import { STAGE_PROFILE as P } from '../../demo/profiles.js';
import { smooth } from '../dof/math.js';
export function stageFrame(time) {
  const riseEnd = P.focus + P.rise, holdEnd = riseEnd + P.hold, end = holdEnd + P.restore;
  return { active: time < end, blend: time < P.focus ? smooth(time / P.focus) : time < holdEnd ? 1 : 1 - smooth((time - holdEnd) / P.restore), rise: smooth((time - P.focus) / P.rise), end };
}
export class StageDirector {
  constructor(prop) { this.prop = prop; this.active = false; this.triggered = false; this.time = 0; this.blend = 0; prop.rotation.x = -Math.PI / 2; this.target = prop.position.clone().add(new Vector3(0, 1.7, 0)); }
  start() { if (this.active) return; this.active = true; this.triggered = true; this.time = 0; this.prop.rotation.x = -Math.PI / 2; }
  update(dt, player) {
    if (!this.triggered && player.position.distanceTo(this.prop.position) < P.triggerRadius) this.start();
    if (!this.active) return;
    this.time += dt;
    const frame = stageFrame(this.time);
    this.blend = frame.blend;
    this.prop.rotation.x = -(1 - frame.rise) * Math.PI / 2;
    this.active = frame.active;
  }
}
