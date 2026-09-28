import { PLAYER_PROFILE } from './demoProfiles.js';
import { BenchmarkRecorder } from '../performance/BenchmarkRecorder.js';
const CYCLE_SECONDS = 22;
export class DemoBenchmarkScenario {
  constructor(monitor, player, stage, events, dof, props) {
    Object.assign(this, { monitor, player, stage, events, dof, props });
    this.recorder = new BenchmarkRecorder(); this.fired = new Set();
    this.input = { has: (direction) => this.direction() === direction };
  }
  configuration() { return { dof: this.dof.enabled, dofQuality: this.dof.quality, pixelRatio: this.dof.pixelRatio }; }
  start() {
    if (this.events.locked) return false;
    this.events.suspendAuto = true;
    this.player.position.fromArray(PLAYER_PROFILE.start);
    this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, 0.5);
    this.fired.clear(); this.recorder.start(this.configuration());
    return true;
  }
  restore(duration) {
    this.events.suspendAuto = false;
    this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, duration);
  }
  stop() { if (!this.active) return; this.recorder.stop(); this.restore(0.7); }
  direction() {
    const segment = Math.floor((this.elapsed % 8) / 2);
    return ['right', 'up', 'left', 'down'][segment];
  }
  fireOnce(cycle, at, action) {
    const key = `${cycle}:${at}`;
    if (this.elapsed % CYCLE_SECONDS >= at && !this.fired.has(key)) { this.fired.add(key); action(); }
  }
  update(dt) {
    if (this.phase !== 'warmup' && this.phase !== 'measuring') return;
    this.recorder.advance(dt);
    const cycle = Math.floor(this.elapsed / CYCLE_SECONDS);
    const { sign, wire, door } = this.props;
    this.fireOnce(cycle, 0, () => { this.dof.setProfile('StageEvent'); this.dof.focusTo(sign, 0.7); this.stage.play(sign, 'rise'); });
    this.fireOnce(cycle, 0.4, () => { wire.visible = true; this.dof.focusTo(wire, 0.7); this.stage.play(wire, 'wire_drop'); });
    this.fireOnce(cycle, 5, () => { this.dof.focusTo(sign, 0.7); this.stage.play(sign, 'fall'); });
    this.fireOnce(cycle, 9, () => { this.dof.focusTo(door, 0.7); this.stage.play(door, 'fall'); });
    this.fireOnce(cycle, 13, () => { this.stage.play(door, 'rise'); });
    this.fireOnce(cycle, 17, () => { this.dof.setProfile('Exploration'); this.dof.focusTo(this.player, 0.9); });
  }
  sample(frameSeconds) {
    if (!this.active) return;
    const wasActive = this.active;
    this.recorder.sample(frameSeconds, this.monitor.snapshot(), this.configuration());
    if (wasActive && this.phase === 'done') this.restore(0.8);
  }
  get active() { return this.recorder.active; }
  get phase() { return this.recorder.phase; }
  get elapsed() { return this.recorder.elapsed; }
  get result() { return this.recorder.result; }
  get label() {
    if (this.phase === 'warmup') return `準備 ${Math.ceil(this.recorder.remainingSeconds)}秒`;
    if (this.phase === 'measuring') return `計測 ${Math.ceil(this.recorder.remainingSeconds)}秒`;
    return this.phase === 'done' ? '計測結果' : '5分計測';
  }
}
