/**
 * 効果音と音楽。効果音は素材が無くても鳴るように WebAudio で合成する。
 * スマホでは最初のタップまで音が出せないため unlock() を入力時に呼ぶ。
 */
export type SE = 'blip' | 'select' | 'confirm' | 'cancel' | 'item' | 'shout' | 'wrong' | 'paper' | 'rise' | 'reveal' | 'step';

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmEl: HTMLAudioElement | null = null;
  private bgmSource: MediaElementAudioSourceNode | null = null;
  /** 素材ファイルで鳴らす効果音（無ければ合成音） */
  private files = new Map<SE, { data: Promise<ArrayBuffer>; buffer: AudioBuffer | null }>();
  muted = false;
  seVolume = 0.5;
  bgmVolume = 0.32;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolume;
      this.bgmGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.bgmEl && this.bgmEl.paused && !this.muted) void this.bgmEl.play().catch(() => {});
  }

  suspend(): void {
    void this.ctx?.suspend();
    this.bgmEl?.pause();
  }

  resume(): void {
    if (this.muted) return;
    void this.ctx?.resume();
    if (this.bgmEl) void this.bgmEl.play().catch(() => {});
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    if (this.bgmEl) {
      if (m) this.bgmEl.pause();
      else void this.bgmEl.play().catch(() => {});
    }
  }

  playBgm(url: string): void {
    if (this.bgmEl?.dataset.src === url) return;
    this.bgmEl?.pause();
    const el = new Audio(url);
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.dataset.src = url;
    this.bgmEl = el;
    if (this.ctx && this.bgmGain) {
      this.bgmSource = this.ctx.createMediaElementSource(el);
      this.bgmSource.connect(this.bgmGain);
    } else el.volume = this.bgmVolume;
    if (!this.muted) void el.play().catch(() => {});
  }

  fadeBgm(to: number, seconds = 1): void {
    if (this.bgmGain && this.ctx) this.bgmGain.gain.setTargetAtTime(to * this.bgmVolume, this.ctx.currentTime, seconds / 3);
  }

  /** 効果音を素材ファイルに差し替える（先に読み込んでおき、鳴らす時に解読する） */
  useFile(se: SE, url: string): void {
    const data = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`効果音を読めません: ${url}`);
      return r.arrayBuffer();
    });
    data.catch(() => this.files.delete(se)); // 読めなければ合成音のまま
    this.files.set(se, { data, buffer: null });
  }

  private playFile(ctx: AudioContext, entry: { data: Promise<ArrayBuffer>; buffer: AudioBuffer | null }): void {
    const start = (buf: AudioBuffer) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = this.seVolume * 1.6;
      src.connect(g).connect(this.master!);
      src.start();
    };
    if (entry.buffer) return start(entry.buffer);
    // decodeAudioData は元のデータを使い切るので、複製して渡す
    void entry.data
      .then((d) => ctx.decodeAudioData(d.slice(0)))
      .then((buf) => {
        entry.buffer = buf;
        start(buf);
      })
      .catch(() => {});
  }

  play(se: SE): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const file = this.files.get(se);
    if (file) return this.playFile(ctx, file);
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = this.seVolume;
    out.connect(this.master);
    const tone = (type: OscillatorType, f0: number, f1: number, start: number, dur: number, vol: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + start);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + start + dur);
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(vol, t + start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g).connect(out);
      o.start(t + start);
      o.stop(t + start + dur + 0.02);
    };
    const noise = (start: number, dur: number, vol: number, freq: number, q = 0.8) => {
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(out);
      src.start(t + start);
    };
    switch (se) {
      case 'blip':
        tone('triangle', 740 + Math.random() * 60, 700, 0, 0.045, 0.12);
        break;
      case 'step':
        noise(0, 0.05, 0.25, 900, 1.2);
        break;
      case 'select':
        tone('sine', 880, 1180, 0, 0.07, 0.25);
        break;
      case 'confirm':
        tone('sine', 660, 990, 0, 0.09, 0.3);
        tone('sine', 990, 1320, 0.07, 0.12, 0.22);
        break;
      case 'cancel':
        tone('sine', 520, 330, 0, 0.12, 0.25);
        break;
      case 'paper':
        noise(0, 0.22, 0.5, 2400, 0.6);
        noise(0.05, 0.15, 0.3, 5200, 0.7);
        break;
      case 'rise':
        // 紙が次々に立ち上がる音（素材ファイルが無いときの代わり）
        for (let i = 0; i < 6; i++) noise(i * 0.2, 0.18, 0.4, 2200 + i * 300, 0.6);
        break;
      case 'item':
        [0, 0.09, 0.18, 0.3].forEach((s, i) => tone('triangle', [784, 988, 1175, 1568][i], [784, 988, 1175, 1568][i], s, 0.28, 0.25));
        break;
      case 'shout':
        noise(0, 0.35, 0.9, 700, 0.5);
        tone('sawtooth', 160, 60, 0, 0.45, 0.35);
        tone('square', 320, 120, 0, 0.25, 0.12);
        break;
      case 'wrong':
        tone('square', 300, 220, 0, 0.16, 0.18);
        tone('square', 220, 150, 0.15, 0.3, 0.18);
        break;
      case 'reveal':
        tone('sine', 392, 392, 0, 0.5, 0.2);
        tone('sine', 587, 587, 0.08, 0.6, 0.18);
        tone('sine', 784, 784, 0.16, 0.9, 0.16);
        noise(0, 0.6, 0.15, 6000, 0.4);
        break;
    }
  }
}
