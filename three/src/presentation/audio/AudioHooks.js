export const AUDIO_CUES = new Set(['StageRise', 'StageFall', 'WireMove', 'WireStop', 'WaterAmbient']);
export class AudioHooks {
  constructor() { this.listeners = new Set(); }
  on(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(name, source = null) {
    if (!AUDIO_CUES.has(name)) throw Error(`Unknown audio cue: ${name}`);
    for (const listener of this.listeners) listener(name, source);
  }
}
