import * as THREE from 'three';
import type { Assets } from '../core/Assets';
import { Ease, type Tweens } from '../core/tween';
import type { PostFX } from '../render/PostFX';
import type { QualityProfile } from '../render/quality';
import { PaperActor } from '../paper/PaperActor';
import { PaperSprite, type PaperOptions } from '../paper/PaperSprite';
import { cloneState, lerpLook, lookState, LOOKS, type LookState } from './Look';
import { Burst, Motes } from './Particles';

const backdropVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const backdropFrag = /* glsl */ `
uniform sampler2D tMap;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uTint;
uniform vec3 uGlow;
uniform vec2 uSun;
uniform float uScroll;
uniform float uHasMap;
varying vec2 vUv;
void main() {
  vec3 sky = mix(uHorizon, uTop, smoothstep(0.25, 1.0, vUv.y));
  vec3 col = sky;
  if (uHasMap > 0.5) {
    vec2 uv = vec2(fract(vUv.x * 1.0 + uScroll), clamp((vUv.y - 0.04) * 1.12, 0.0, 1.0));
    vec3 tex = texture2D(tMap, uv).rgb;
    // 絵の青空部分を夕焼けの空色へ寄せ、雲は色付きの光を受ける
    float cloud = smoothstep(0.55, 0.9, dot(tex, vec3(0.3, 0.4, 0.3)) + tex.r * 0.35 - tex.b * 0.2);
    vec3 lit = tex * uTint;
    col = mix(sky * (0.75 + tex * 0.35), lit, cloud);
  }
  float d = distance(vUv * vec2(2.4, 1.0), uSun * vec2(2.4, 1.0));
  col += uGlow * (exp(-d * 5.5) * 0.9 + exp(-d * 1.6) * 0.25);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export interface PropDef extends PaperOptions {
  image: string;
  x: number;
  z: number;
  y?: number;
  rotY?: number;
  /** 主人公が重なったら半透明にする前景物 */
  occluder?: boolean;
  id?: string;
}

/**
 * 舞台（シーン）本体。光・空・霧・床・紙の小物・役者・粒子をまとめて持つ。
 * ジャンルに依存しない。どのジャンルのモードもこの Stage の上で動く。
 */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly sprites: PaperSprite[] = [];
  readonly actors = new Map<string, PaperActor>();
  readonly occluders: PaperSprite[] = [];
  readonly named = new Map<string, THREE.Object3D>();
  private backdrop: THREE.Mesh | null = null;
  private backdropMat: THREE.ShaderMaterial;
  private motes: Motes[] = [];
  readonly burst: Burst;
  private look: LookState;
  wind = 0.3;
  private time = 0;

  constructor(
    private assets: Assets,
    private tweens: Tweens,
    private post: PostFX,
    private quality: QualityProfile,
  ) {
    this.look = lookState(LOOKS.sunset);
    this.scene.fog = new THREE.Fog(0xffffff, 10, 60);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = quality.shadows;
    this.sun.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    const sc = this.sun.shadow.camera;
    sc.left = -14;
    sc.right = 14;
    sc.top = 10;
    sc.bottom = -8;
    sc.near = 1;
    sc.far = 60;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    this.backdropMat = new THREE.ShaderMaterial({
      uniforms: {
        tMap: { value: null },
        uHasMap: { value: 0 },
        uTop: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uTint: { value: new THREE.Color() },
        uGlow: { value: new THREE.Color() },
        uSun: { value: new THREE.Vector2(0.3, 0.45) },
        uScroll: { value: 0 },
      },
      vertexShader: backdropVert,
      fragmentShader: backdropFrag,
      depthWrite: true,
      fog: false,
    });
    this.burst = new Burst(Math.max(24, quality.particles), '#fff0bf', 0.14);
    this.scene.add(this.burst);
    this.applyLook();
  }

  /** 遠景の一枚絵（空）を張る */
  async setBackdrop(image: string | null, opts: { width: number; height: number; z: number; y: number }): Promise<void> {
    const geo = new THREE.PlaneGeometry(opts.width, opts.height);
    const mesh = new THREE.Mesh(geo, this.backdropMat);
    mesh.position.set(0, opts.y, opts.z);
    mesh.renderOrder = -10;
    if (image) {
      const t = await this.assets.texture(image);
      t.wrapS = THREE.RepeatWrapping;
      t.needsUpdate = true;
      this.backdropMat.uniforms.tMap.value = t;
      this.backdropMat.uniforms.uHasMap.value = 1;
    }
    this.backdrop = mesh;
    this.scene.add(mesh);
  }

  /** 繰り返しテクスチャの床 */
  async addFloor(image: string, opts: { width: number; depth: number; z: number; repeat: [number, number]; color?: string }): Promise<THREE.Mesh> {
    const t = await this.assets.texture(image, { repeat: true });
    const tex = t.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...opts.repeat);
    tex.needsUpdate = true;
    const mat = new THREE.MeshLambertMaterial({ map: tex, color: opts.color ?? '#ffffff' });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(opts.width, opts.depth), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0, opts.z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  /** 単色の立体（板・柱・台座など舞台装置） */
  addBlock(size: [number, number, number], pos: [number, number, number], color: string, opts: { cast?: boolean; name?: string } = {}): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color }));
    mesh.position.set(...pos);
    mesh.castShadow = opts.cast ?? true;
    mesh.receiveShadow = true;
    if (opts.name) this.named.set(opts.name, mesh);
    this.scene.add(mesh);
    return mesh;
  }

  addCylinder(radius: number, height: number, pos: [number, number, number], color: string, cast = true): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, height, 10), new THREE.MeshLambertMaterial({ color }));
    mesh.position.set(pos[0], pos[1] + height / 2, pos[2]);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  async addProp(def: PropDef): Promise<PaperSprite> {
    const tex = await this.assets.texture(`props/${def.image}.webp`);
    const s = new PaperSprite(tex, def);
    s.position.set(def.x, def.y ?? 0, def.z);
    if (def.rotY) s.rotation.y = def.rotY;
    this.scene.add(s);
    this.sprites.push(s);
    if (def.occluder) this.occluders.push(s);
    if (def.id) this.named.set(def.id, s);
    // 影は主要な物だけ受ける（床・台座）。紙同士は受けない＝軽い
    return s;
  }

  addActor(actor: PaperActor, x: number, z: number, facing: 1 | -1 = 1): PaperActor {
    actor.position.set(x, 0, z);
    actor.faceInstant(facing);
    this.scene.add(actor);
    this.actors.set(actor.def.id, actor);
    return actor;
  }

  actor(id: string): PaperActor {
    const a = this.actors.get(id);
    if (!a) throw new Error(`役者がいません: ${id}`);
    return a;
  }

  addMotes(box: THREE.Box3, color?: string): void {
    const m = new Motes(this.quality.particles, box, color);
    this.motes.push(m);
    this.scene.add(m);
  }

  /** Lookを切り替える（seconds秒かけて補間） */
  setLook(name: string, seconds = 1.2): Promise<void> {
    const target = LOOKS[name];
    if (!target) throw new Error(`Lookがありません: ${name}`);
    const from = cloneState(this.look);
    const to = lookState(target);
    return this.tweens.run(
      seconds,
      (k) => {
        lerpLook(this.look, from, to, k);
        this.applyLook();
      },
      Ease.inOutSine,
      this.look,
    );
  }

  private applyLook(): void {
    const { colors: c, nums: n, sunDir } = this.look;
    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);
    this.hemi.intensity = n.hemiIntensity;
    this.sun.color.copy(c.sunColor);
    this.sun.intensity = n.sunIntensity;
    this.sun.position.copy(this.sun.target.position).addScaledVector(sunDir, 30);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(c.fogColor);
    fog.near = n.fogNear;
    fog.far = n.fogFar;
    const u = this.backdropMat.uniforms;
    (u.uTop.value as THREE.Color).copy(c.skyTop);
    (u.uHorizon.value as THREE.Color).copy(c.skyHorizon);
    (u.uTint.value as THREE.Color).copy(c.backdropTint);
    (u.uGlow.value as THREE.Color).copy(c.sunGlow);
    this.scene.background = c.skyHorizon;
    const g = this.post.grade;
    g.tint.copy(c.tint);
    g.shadowTint.copy(c.shadowTint);
    g.saturation = n.saturation;
    g.contrast = n.contrast;
    g.exposure = n.exposure;
    g.vignette = n.vignette;
    g.drama = n.drama;
    g.farBlur = n.farBlur;
    g.nearBlur = n.nearBlur;
  }

  /** 影を落とす範囲をカメラ付近に合わせる */
  centerShadow(x: number): void {
    this.sun.target.position.set(x, 0, 0);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.look.sunDir, 30);
  }

  update(dt: number, camera: THREE.Camera, player: THREE.Object3D | null): void {
    this.time += dt;
    this.backdropMat.uniforms.uScroll.value = this.time * 0.0015;
    for (const s of this.sprites) s.update(dt, camera, this.wind);
    for (const a of this.actors.values()) a.update(dt);
    for (const m of this.motes) m.update(dt, this.wind);
    this.burst.update(dt);
    if (player) this.updateOcclusion(camera, player);
    if (this.backdrop) this.backdrop.position.x = camera.position.x * 0.85; // 遠景はほぼ動かない＝奥行き感
  }

  /** 主人公の手前にある前景物を透かす */
  private updateOcclusion(camera: THREE.Camera, player: THREE.Object3D): void {
    const p = player.position;
    for (const s of this.occluders) {
      const inFront = s.position.z > p.z + 0.3 && s.position.z < camera.position.z;
      const near = Math.abs(s.position.x - p.x) < s.width * 0.55 + 0.3;
      s.setOpacity(inFront && near ? 0.35 : 1);
    }
  }
}
