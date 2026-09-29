import * as THREE from 'three';
import { glowTexture } from '../paper/textures';

/** 空中に漂う光の粒（夕日の埃・灯りの粒）。CPUで少数だけ動かす軽量版。 */
export class Motes extends THREE.Points {
  private vel: Float32Array;
  private phase: Float32Array;

  constructor(count: number, private box: THREE.Box3, color = '#ffe2b0', size = 0.09) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const size3 = box.getSize(new THREE.Vector3());
    for (let i = 0; i < count; i++) {
      pos[i * 3] = box.min.x + Math.random() * size3.x;
      pos[i * 3 + 1] = box.min.y + Math.random() * size3.y;
      pos[i * 3 + 2] = box.min.z + Math.random() * size3.z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    super(
      geo,
      new THREE.PointsMaterial({
        map: glowTexture(),
        color,
        size,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    this.vel = new Float32Array(count);
    this.phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.vel[i] = 0.05 + Math.random() * 0.12;
      this.phase[i] = Math.random() * 10;
    }
    this.frustumCulled = false;
  }

  update(dt: number, wind: number): void {
    const p = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    const b = this.box;
    for (let i = 0; i < this.vel.length; i++) {
      this.phase[i] += dt;
      a[i * 3] += (0.08 + wind * 0.25) * dt + Math.sin(this.phase[i] * 0.7) * 0.004;
      a[i * 3 + 1] += this.vel[i] * dt * 0.4 + Math.cos(this.phase[i]) * 0.003;
      if (a[i * 3] > b.max.x) a[i * 3] = b.min.x;
      if (a[i * 3 + 1] > b.max.y) a[i * 3 + 1] = b.min.y;
    }
    p.needsUpdate = true;
  }
}

/** 一瞬だけ弾ける紙吹雪・きらめき */
export class Burst extends THREE.Points {
  private v: Float32Array;
  private life = 0;
  private duration = 1.4;

  constructor(count = 60, color = '#fff3c4', size = 0.12) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    super(
      geo,
      new THREE.PointsMaterial({ map: glowTexture(), color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.v = new Float32Array(count * 3);
    this.visible = false;
    this.frustumCulled = false;
  }

  fire(at: THREE.Vector3, spread = 1.6): void {
    const p = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    for (let i = 0; i < this.v.length / 3; i++) {
      a[i * 3] = at.x;
      a[i * 3 + 1] = at.y;
      a[i * 3 + 2] = at.z;
      const th = Math.random() * Math.PI * 2;
      const up = 0.6 + Math.random() * 1.6;
      const r = Math.random() * spread;
      this.v[i * 3] = Math.cos(th) * r;
      this.v[i * 3 + 1] = up;
      this.v[i * 3 + 2] = Math.sin(th) * r * 0.5;
    }
    p.needsUpdate = true;
    this.life = 0;
    this.visible = true;
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.life += dt;
    const p = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    for (let i = 0; i < this.v.length / 3; i++) {
      this.v[i * 3 + 1] -= 1.6 * dt;
      a[i * 3] += this.v[i * 3] * dt;
      a[i * 3 + 1] += this.v[i * 3 + 1] * dt;
      a[i * 3 + 2] += this.v[i * 3 + 2] * dt;
    }
    p.needsUpdate = true;
    (this.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - this.life / this.duration);
    if (this.life > this.duration) this.visible = false;
  }
}
