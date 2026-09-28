import { Vector3 } from 'three';
import { STAGE_PROFILE as P, SCENE_PROFILE } from './demoProfiles.js';
import { smooth } from '../presentation/dof/math.js';
export class StageEvents {
  constructor(props, stage, dof, player) {
    this.stage = stage; this.dof = dof; this.player = player;
    this.entries = [
      { id: 'sign', prop: props.sign, motion: 'rise', point: new Vector3(...SCENE_PROFILE.stageSign), radius: P.triggerRadius },
      { id: 'wire', prop: props.wire, motion: 'wire_drop', point: new Vector3(4, 0, -3.4), radius: P.triggerRadius },
      { id: 'door', prop: props.door, motion: 'fall', point: new Vector3(5.2, 0, -4.7), radius: 1.9 },
    ];
    this.completed = new Set(); this.nextManual = 0;
    this.current = null; this.blend = 0; this.suspendAuto = false;
  }
  start(id) {
    if (this.current) return false;
    const entry = this.entries.find((item) => item.id === id);
    if (!entry) throw Error(`Unknown stage event: ${id}`);
    this.stage.prepare(entry.prop, entry.motion);
    entry.prop.visible = true;
    this.dof.setProfile('StageEvent');
    this.dof.focusTo(entry.prop, P.focus);
    this.current = { ...entry, phase: 'focus', elapsed: 0, handle: null };
    this.blend = 0;
    return true;
  }
  startNext() {
    if (this.current) return false;
    const entry = this.entries[this.nextManual % this.entries.length];
    this.nextManual++;
    return this.start(entry.id);
  }
  update(dt) {
    if (!this.current && !this.suspendAuto) {
      const near = this.entries.find((e) => !this.completed.has(e.id) && this.player.position.distanceTo(e.point) < e.radius);
      if (near) this.start(near.id);
    }
    const state = this.current;
    if (!state) { this.blend = 0; return; }
    state.elapsed += dt;
    if (state.phase === 'focus') {
      this.blend = smooth(state.elapsed / P.focus);
      if (state.elapsed >= P.focus) { state.handle = this.stage.play(state.prop, state.motion); state.phase = 'motion'; state.elapsed = 0; this.blend = 1; }
    } else if (state.phase === 'motion') {
      this.blend = 1;
      if (state.handle.done) { state.phase = 'hold'; state.elapsed = 0; }
    } else if (state.phase === 'hold') {
      this.blend = 1;
      if (state.elapsed >= P.hold) { this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, P.restore); state.phase = 'restore'; state.elapsed = 0; }
    } else if (state.phase === 'restore') {
      this.blend = 1 - smooth(state.elapsed / P.restore);
      if (state.elapsed >= P.restore) { this.completed.add(state.id); this.current = null; this.blend = 0; }
    }
  }
  get locked() { return this.current !== null; }
  get cameraTarget() {
    if (!this.current) return null;
    return this.current.point.clone().add(new Vector3(0, 1.2, 0));
  }
}
