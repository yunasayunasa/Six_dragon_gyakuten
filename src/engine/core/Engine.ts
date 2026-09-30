import * as THREE from 'three';
import { Assets } from './Assets';
import { Input } from './Input';
import { Tweens } from './tween';
import { gameSize, preventZoom, updateRotation } from './screen';
import { PostFX } from '../render/PostFX';
import { pickQuality, type QualityProfile } from '../render/quality';
import { CameraRig } from '../stage/CameraRig';
import { Stage } from '../stage/Stage';
import { Sound } from '../audio/Sound';
import { Hud } from '../ui/Hud';

/** ジャンルごとの遊び方。Engine は常に1つのモードを動かす。 */
export interface Mode {
  enter(engine: Engine): void | Promise<void>;
  exit?(engine: Engine): void;
  update(dt: number, engine: Engine): void;
}

/**
 * エンジン本体。描画・時間・入力・音・UI・舞台をまとめ、現在のモードを毎フレーム動かす。
 * ゲーム固有の知識は持たない。
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly quality: QualityProfile;
  readonly post: PostFX;
  readonly rig: CameraRig;
  readonly stage: Stage;
  readonly tweens = new Tweens();
  readonly input = new Input();
  readonly sound = new Sound();
  readonly assets = new Assets();
  readonly hud: Hud;
  private mode: Mode | null = null;
  private last = 0;
  private paused = false;
  private statsEl: HTMLElement | null = null;
  private fpsAcc = { t: 0, frames: 0, fps: 0 };
  /** 毎フレーム呼ばれる追加処理（デバッグ・演出用） */
  readonly onFrame = new Set<(dt: number) => void>();
  focusOverride: number | null = null;
  /** 手前の物を透かす基準になる主人公 */
  player: THREE.Object3D | null = null;

  constructor(container: HTMLElement) {
    this.quality = pickQuality();
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    container.appendChild(this.renderer.domElement);
    this.assets.maxAnisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.post = new PostFX(this.renderer, this.quality);
    this.rig = new CameraRig(16 / 9); // 実際の縦横比は resize() で決まる
    this.stage = new Stage(this.assets, this.tweens, this.post, this.quality);
    this.hud = new Hud(this.input, this.sound);
    if (new URLSearchParams(location.search).has('stats')) {
      this.statsEl = document.createElement('div');
      this.statsEl.className = 'stats';
      document.body.appendChild(this.statsEl);
    }
    preventZoom();
    addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => this.setPaused(document.hidden));
    addEventListener('pagehide', () => this.setPaused(true));
    addEventListener('pageshow', () => this.setPaused(false));
    this.resize();
  }

  private resize = () => {
    updateRotation();
    const { w, h } = gameSize();
    const dpr = Math.min(devicePixelRatio || 1, this.quality.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, dpr);
    this.rig.setAspect(w / h);
  };

  setPaused(p: boolean): void {
    if (p === this.paused) return;
    this.paused = p;
    this.input.reset();
    if (p) this.sound.suspend();
    else {
      this.sound.resume();
      this.last = performance.now(); // 復帰直後に時間が飛ばないようにする
    }
  }

  async setMode(mode: Mode): Promise<void> {
    this.mode?.exit?.(this);
    this.mode = mode;
    await mode.enter(this);
  }

  start(): void {
    this.last = performance.now();
    this.renderer.setAnimationLoop(this.frame);
  }

  private frame = (now: number) => {
    if (this.paused) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.renderer.info.reset();
    this.input.poll();
    this.hud.update(dt);
    this.tweens.update(dt);
    this.mode?.update(dt, this);
    this.onFrame.forEach((f) => f(dt));
    this.rig.update(dt);
    this.stage.update(dt, this.rig.camera, this.player);
    this.post.grade.focusDistance = this.focusOverride ?? this.rig.focusDistance();
    this.post.render(this.stage.scene, this.rig.camera, dt);
    if (this.statsEl) this.updateStats(dt);
  };

  private updateStats(dt: number): void {
    const a = this.fpsAcc;
    a.t += dt;
    a.frames++;
    if (a.t >= 0.5) {
      a.fps = a.frames / a.t;
      a.t = 0;
      a.frames = 0;
      const info = this.renderer.info;
      this.statsEl!.textContent = `${a.fps.toFixed(0)} fps  q=${this.quality.name}  dpr=${this.renderer.getPixelRatio().toFixed(2)}\ncalls ${info.render.calls}  tris ${info.render.triangles}  tex ${info.memory.textures}`;
    }
  }
}
