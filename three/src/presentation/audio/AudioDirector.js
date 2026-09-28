const BUSES = ['bgm', 'se', 'voice', 'ambient'];

// AudioContext is created only after unlock(), normally inside a user gesture.
// Cue names and URLs belong to the game/demo, never to the engine.
export class AudioDirector {
  constructor({ contextFactory = () => new AudioContext(), fetcher = fetch } = {}) {
    this.contextFactory = contextFactory;
    this.fetcher = fetcher;
    this.context = null;
    this.tracks = new Map();
    this.buffers = new Map();
    this.active = new Map();
    this.volumes = new Map([['master', 1], ...BUSES.map((bus) => [bus, 1])]);
    this.muted = false;
  }

  register(name, { url, bus = 'se', loop = false }) {
    if (!url || !BUSES.includes(bus)) throw Error('Audio track needs a URL and valid bus');
    this.tracks.set(name, { url, bus, loop });
    this.buffers.delete(url);
  }

  async unlock() {
    if (!this.context) {
      this.context = this.contextFactory();
      this.master = this.context.createGain(); this.master.connect(this.context.destination);
      this.buses = new Map(BUSES.map((bus) => {
        const gain = this.context.createGain(); gain.gain.value = this.volumes.get(bus);
        gain.connect(this.master); return [bus, gain];
      }));
      this.applyMasterVolume();
    }
    await this.context.resume();
  }

  async load(url) {
    if (!this.buffers.has(url)) {
      const request = (async () => {
        const response = await this.fetcher(url);
        if (!response.ok) throw Error(`Audio fetch failed: ${response.status}`);
        return this.context.decodeAudioData(await response.arrayBuffer());
      })();
      this.buffers.set(url, request);
      request.catch(() => this.buffers.delete(url));
    }
    return this.buffers.get(url);
  }

  async play(name) {
    const track = this.tracks.get(name);
    if (!track) return null;
    await this.unlock();
    const buffer = await this.load(track.url);
    const source = this.context.createBufferSource();
    source.buffer = buffer; source.loop = track.loop;
    source.connect(this.buses.get(track.bus));
    if (!this.active.has(name)) this.active.set(name, new Set());
    this.active.get(name).add(source);
    source.onended = () => this.active.get(name)?.delete(source);
    source.start();
    return source;
  }

  stop(name) {
    for (const source of this.active.get(name) ?? []) source.stop();
    this.active.delete(name);
  }

  setVolume(bus, volume) {
    if (!this.volumes.has(bus) || !Number.isFinite(volume) || volume < 0 || volume > 1) throw Error('Invalid audio volume');
    this.volumes.set(bus, volume);
    if (bus === 'master') this.applyMasterVolume();
    else if (this.buses) this.buses.get(bus).gain.value = volume;
  }

  setMuted(value) { this.muted = Boolean(value); this.applyMasterVolume(); }
  applyMasterVolume() { if (this.master) this.master.gain.value = this.muted ? 0 : this.volumes.get('master'); }
  async setPaused(value) {
    if (!this.context) return;
    if (value) await this.context.suspend();
    else await this.context.resume();
  }

  async dispose() {
    for (const name of this.active.keys()) this.stop(name);
    if (this.context) await this.context.close();
    this.context = null;
    this.buffers.clear();
  }
}
