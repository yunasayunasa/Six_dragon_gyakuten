import * as THREE from 'three';
import { Ease, type Tweens } from '../../engine';

/**
 * 飛空艇（提灯の気球を載せた木造の船）。紙の舞台の中に置く「本物の立体」。
 * 前が +x、上が +y。台本の `@演出 飛空艇 到着` で、雲の下から昇ってきて桟橋に横付けする。
 */

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 板張り（横に走る板の継ぎ目と木目） */
function plankTexture(base: string, line: string, rows: number): THREE.CanvasTexture {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    const rh = 256 / rows;
    for (let r = 0; r < rows; r++) {
      // 板ごとに少し色を変える
      g.fillStyle = `rgba(${r % 2 ? '255,230,200' : '60,30,10'},${0.04 + ((r * 37) % 7) * 0.012})`;
      g.fillRect(0, r * rh, 256, rh);
      g.fillStyle = line;
      g.fillRect(0, r * rh, 256, 2);
      // 板の継ぎ目（ずらして並べる）
      const off = ((r * 97) % 5) * 51;
      for (let x = off; x < 256 + 128; x += 128) g.fillRect(x % 256, r * rh, 2, rh);
      // 木目
      g.strokeStyle = 'rgba(40,20,8,.12)';
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        const y = r * rh + (k + 1) * (rh / 4);
        g.moveTo(0, y);
        for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + r + k) * 1.5);
        g.stroke();
      }
    }
  });
}

/** 提灯の紙（朱色の和紙に竹ひごの横線、両脇に「灯」の紋） */
function lanternTexture(): THREE.CanvasTexture {
  return canvasTexture(1024, 512, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#a8261c');
    grd.addColorStop(0.5, '#d8452c');
    grd.addColorStop(1, '#a8261c');
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 512);
    // 和紙のむら
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(255,${200 + Math.random() * 55},${150 + Math.random() * 80},${Math.random() * 0.06})`;
      g.fillRect(Math.random() * 1024, Math.random() * 512, 2 + Math.random() * 8, 1 + Math.random() * 3);
    }
    // 竹ひご（提灯の輪）：横（u）は気球のまわり、縦（v）は長さの向き。輪は長さの向きに並ぶ
    g.fillStyle = 'rgba(60,14,8,.55)';
    for (let y = 512 / 26; y < 512; y += 512 / 26) g.fillRect(0, y, 1024, 3);
    // 紋：白い丸に墨の「灯」。気球の左右（u＝0 と 0.5）に。
    // 気球のまわり 1px と長さ 1px の長さが違うので、縦を縮めて丸に見せ、字は気球の上が上になるよう回す
    for (const cx of [0, 512, 1024]) {
      g.save();
      g.translate(cx, 256);
      g.scale(1, 0.66);
      g.rotate(cx === 512 ? Math.PI / 2 : -Math.PI / 2);
      g.fillStyle = '#fbf1dc';
      g.beginPath();
      g.arc(0, 0, 92, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#2b1d17';
      g.lineWidth = 8;
      g.stroke();
      g.fillStyle = '#2b1d17';
      g.font = 'bold 120px "Yuji Syuku", "Hiragino Mincho ProN", "Yu Mincho", serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('灯', 0, 6);
      g.restore();
    }
  });
}

/** 扇のひれの紙（放射状の骨と、生成りの紙にぼかし） */
function fanTexture(): THREE.CanvasTexture {
  return canvasTexture(256, 256, (g) => {
    const grd = g.createRadialGradient(0, 256, 20, 0, 256, 256);
    grd.addColorStop(0, '#f6e7c8');
    grd.addColorStop(0.75, '#f3d9a8');
    grd.addColorStop(1, '#d9774a');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(90,52,33,.75)';
    g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      g.beginPath();
      g.moveTo(0, 256);
      g.lineTo(Math.sin(a) * 300, 256 - Math.cos(a) * 300);
      g.stroke();
    }
  });
}

/** 灯りのにじみ */
function glowTexture(): THREE.CanvasTexture {
  return canvasTexture(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });
}

/** 雲のかたまり（プロペラの後ろに残る） */
function puffTexture(): THREE.CanvasTexture {
  return canvasTexture(64, 64, (g) => {
    for (let i = 0; i < 6; i++) {
      const x = 20 + Math.random() * 24;
      const y = 20 + Math.random() * 24;
      const grd = g.createRadialGradient(x, y, 0, x, y, 18);
      grd.addColorStop(0, 'rgba(255,255,255,.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
    }
  });
}

/**
 * 船体。長さ L・幅 W・深さ D。舳先（+x）は鋭く、艫（-x）は丸く少し切り落とした形。
 * 両端が少し反り上がる（舷弧）。上の縁（甲板の高さ）は y = 舷弧。
 */
function hullShape(L: number, W: number, D: number) {
  const width = (t: number) => (t > 0 ? Math.pow(Math.max(0, 1 - t * t), 0.5) * (1 - 0.2 * t) : 0.12 + 0.88 * Math.pow(Math.max(0, 1 - Math.pow(-t, 3)), 0.5));
  const depth = (t: number) => (t > 0 ? 0.15 + 0.85 * Math.pow(Math.max(0, 1 - t * t), 0.35) : 0.35 + 0.65 * Math.pow(Math.max(0, 1 - Math.pow(-t, 4)), 0.4));
  const sheer = (t: number) => 0.16 * D * t * t + 0.06 * D * Math.max(0, t);
  return { width: (t: number) => (W / 2) * width(t), depth: (t: number) => D * depth(t), sheer, x: (t: number) => (t * L) / 2 };
}

function hullGeometry(L: number, W: number, D: number, segL = 32, segC = 16): THREE.BufferGeometry {
  const s = hullShape(L, W, D);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segL; i++) {
    const t = (i / segL) * 2 - 1;
    const w = s.width(t);
    const d = s.depth(t);
    const top = s.sheer(t);
    for (let j = 0; j <= segC; j++) {
      const th = (j / segC) * Math.PI; // 0＝左舷の縁 → π/2＝竜骨 → π＝右舷の縁
      const sn = Math.sin(th);
      // 底はやや V 字（竜骨に向かってとがる）
      pos.push(s.x(t), top - d * Math.pow(sn, 0.75), w * Math.cos(th) * (1 - 0.1 * sn));
      uv.push(i / segL, j / segC);
    }
  }
  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segC; j++) {
      const a = i * (segC + 1) + j;
      const b = a + segC + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** 甲板（船体の上の縁に合わせた板）と、まわりの低い舷墻 */
function deckGeometry(L: number, W: number, D: number, wallH: number, segL = 32) {
  const s = hullShape(L, W, D);
  const deck: number[] = [];
  const deckUv: number[] = [];
  const wall: number[] = [];
  const wallUv: number[] = [];
  const deckIdx: number[] = [];
  const wallIdx: number[] = [];
  for (let i = 0; i <= segL; i++) {
    const t = (i / segL) * 2 - 1;
    const x = s.x(t);
    const y = s.sheer(t);
    const w = s.width(t) * 0.97;
    deck.push(x, y, w, x, y, -w);
    deckUv.push(i / segL, 0, i / segL, 1);
    // 舷墻：左右の縁に立つ板（内外どちらからも見えるように両面で描く）
    for (const side of [1, -1]) wall.push(x, y, w * side, x, y + wallH, w * side * 1.02);
    wallUv.push(i / segL, 0, i / segL, 1, i / segL, 0, i / segL, 1);
    if (i < segL) {
      const a = i * 2;
      deckIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      const b = i * 4;
      wallIdx.push(b, b + 4, b + 1, b + 1, b + 4, b + 5, b + 2, b + 6, b + 3, b + 3, b + 6, b + 7);
    }
  }
  const mk = (p: number[], u: number[], ix: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    return g;
  };
  return { deck: mk(deck, deckUv, deckIdx), wall: mk(wall, wallUv, wallIdx), shape: s };
}

/** 提灯の形の気球（長さ len、半径 r）。軸は x */
function lanternGeometry(len: number, r: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    // 両端はすぼまり、口金の大きさで切る
    const rad = r * (0.22 + 0.78 * Math.pow(Math.sin(k * Math.PI), 0.55));
    pts.push(new THREE.Vector2(rad, (k - 0.5) * len));
  }
  const g = new THREE.LatheGeometry(pts, 40);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** 輪郭の白フチ（紙の切り抜きと同じ縁取り）：法線方向に少し膨らませた裏面 */
function outlineOf(geo: THREE.BufferGeometry, thickness: number, color = '#fff4e2'): THREE.Mesh {
  const g = geo.clone();
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * thickness, p.getY(i) + n.getY(i) * thickness, p.getZ(i) + n.getZ(i) * thickness);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
}

/** 扇の形のひれ（要が原点、半径 r、開き角 spread） */
function fanGeometry(r: number, spread = Math.PI / 2): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * spread;
    // 扇の縁は少し波打つ
    const rr = r * (1 - 0.04 * Math.abs(Math.sin(i * 1.7)));
    shape.lineTo(Math.sin(a) * rr, Math.cos(a) * rr);
  }
  shape.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(shape);
  // UV：要を左下、外側を右上に（扇の紙の絵と合わせる）
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / r, p.getY(i) / r);
  return g;
}

export class Airship extends THREE.Group {
  /** 揺れ・傾きをつける本体（Airship 自体は位置と向き） */
  private body = new THREE.Group();
  private props: THREE.Object3D[] = [];
  private fins: Array<{ obj: THREE.Object3D; base: THREE.Euler; phase: number }> = [];
  private navLights: Array<{ sprite: THREE.Sprite; phase: number }> = [];
  private lanternMat: THREE.MeshStandardMaterial;
  private streamer: THREE.Mesh;
  private streamerBase: Float32Array;
  private puffs: Array<{ sprite: THREE.Sprite; life: number; vel: THREE.Vector3 }> = [];
  private puffClock = 0;
  private time = 0;
  /** プロペラの回る速さ（1＝全速） */
  private throttle = 0.4;
  /** 傾き（曲がるときに内側へ） */
  private bank = 0;
  private lastYaw = 0;

  constructor(private tweens: Tweens) {
    super();
    this.name = '飛空艇';
    this.add(this.body);
    const L = 5.2;
    const W = 1.8;
    const D = 0.85;

    // ---- 船体 ----
    const hullTex = plankTexture('#7a4a2c', 'rgba(40,20,8,.55)', 9);
    hullTex.wrapS = hullTex.wrapT = THREE.RepeatWrapping;
    hullTex.repeat.set(3, 1);
    const hullGeo = hullGeometry(L, W, D);
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ map: hullTex, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide }));
    hull.castShadow = true;
    this.body.add(hull, outlineOf(hullGeo, 0.035));
    // 喫水線の帯（朱）
    const band = new THREE.Mesh(hullGeometry(L * 1.003, W * 1.01, D * 0.55, 32, 2), new THREE.MeshStandardMaterial({ color: '#9c2a1e', roughness: 0.6, side: THREE.DoubleSide }));
    band.position.y = -D * 0.12;
    band.scale.set(1, 0.18, 1);
    this.body.add(band);

    const deckTex = plankTexture('#c08a58', 'rgba(70,40,20,.5)', 7);
    deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;
    deckTex.repeat.set(4, 1);
    const { deck, wall, shape } = deckGeometry(L, W, D, 0.22);
    this.body.add(new THREE.Mesh(deck, new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.85 })));
    this.body.add(new THREE.Mesh(wall, new THREE.MeshStandardMaterial({ color: '#6a3c22', roughness: 0.8, side: THREE.DoubleSide })));
    // 舷墻の上の手すり（朱塗り）
    const railMat = new THREE.MeshStandardMaterial({ color: '#b8322a', roughness: 0.5 });
    for (const side of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = (i / 20) * 1.9 - 0.95;
        pts.push(new THREE.Vector3(shape.x(t), shape.sheer(t) + 0.24, shape.width(t) * 0.99 * side));
      }
      this.body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03, 5), railMat));
    }

    // ---- 船室（艫寄り）と瓦屋根 ----
    const cabin = new THREE.Group();
    cabin.position.set(-1.05, shape.sheer(-0.4), 0);
    const windowTex = canvasTexture(256, 128, (g) => {
      g.fillStyle = '#e9d6b0';
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#5a3421';
      g.fillRect(0, 0, 256, 10);
      g.fillRect(0, 118, 256, 10);
      for (const x of [40, 152]) {
        // 障子の窓：明かりが透ける
        g.fillStyle = '#ffd98a';
        g.fillRect(x, 34, 64, 54);
        g.strokeStyle = '#5a3421';
        g.lineWidth = 4;
        g.strokeRect(x, 34, 64, 54);
        g.beginPath();
        g.moveTo(x + 32, 34);
        g.lineTo(x + 32, 88);
        g.moveTo(x, 61);
        g.lineTo(x + 64, 61);
        g.stroke();
      }
    });
    const cabinMat = new THREE.MeshStandardMaterial({ map: windowTex, emissiveMap: windowTex, emissive: '#ffb45a', emissiveIntensity: 0.55, roughness: 0.8 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.72, 1.15), cabinMat);
    box.position.y = 0.36;
    box.castShadow = true;
    cabin.add(box);
    const roofGeo = new THREE.CylinderGeometry(0.001, 0.98, 0.5, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale(1.25, 1, 0.95);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: '#3a3550', roughness: 0.6, flatShading: true }));
    roof.position.y = 0.97;
    roof.castShadow = true;
    cabin.add(roof, outlineOf(roofGeo, 0.03).translateY(0.97));
    this.body.add(cabin);

    // ---- 提灯の気球 ----
    const envLen = 5.4;
    const envR = 1.12;
    const envY = 2.75;
    const lanTex = lanternTexture();
    this.lanternMat = new THREE.MeshStandardMaterial({ map: lanTex, emissiveMap: lanTex, emissive: '#ff9a5a', emissiveIntensity: 0.25, roughness: 0.9 });
    const envGeo = lanternGeometry(envLen, envR);
    const env = new THREE.Mesh(envGeo, this.lanternMat);
    env.position.set(-0.15, envY, 0);
    env.castShadow = true;
    this.body.add(env);
    const envOutline = outlineOf(envGeo, 0.04);
    envOutline.position.copy(env.position);
    this.body.add(envOutline);
    // 黒漆の口金と、金の輪
    const capMat = new THREE.MeshStandardMaterial({ color: '#1e1614', roughness: 0.35, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#c89b3c', roughness: 0.3, metalness: 0.8 });
    for (const side of [1, -1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(envR * 0.3, envR * 0.34, 0.32, 24), capMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(-0.15 + side * (envLen / 2 + 0.1), envY, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(envR * 0.33, 0.035, 8, 28), goldMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.copy(cap.position).x -= side * 0.16;
      this.body.add(cap, ring);
    }
    // 艫の口金から垂れる房
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#c89b3c', roughness: 0.6 }));
    tassel.position.set(-0.15 - envLen / 2 - 0.3, envY - 0.35, 0);
    this.body.add(tassel);

    // 気球と船体をつなぐ綱
    const ropeMat = new THREE.LineBasicMaterial({ color: '#3a2618' });
    const rope: number[] = [];
    for (const t of [-0.7, -0.25, 0.2, 0.62]) {
      for (const side of [1, -1]) {
        const x = shape.x(t);
        rope.push(x, shape.sheer(t) + 0.24, shape.width(t) * side * 0.95, x * 0.92 - 0.15, envY - envR * 0.82, envR * 0.42 * side);
      }
    }
    const ropes = new THREE.BufferGeometry();
    ropes.setAttribute('position', new THREE.Float32BufferAttribute(rope, 3));
    this.body.add(new THREE.LineSegments(ropes, ropeMat));

    // ---- 扇のひれ（気球の尾翼と、船体の横の翼） ----
    const fanMat = new THREE.MeshStandardMaterial({ map: fanTexture(), roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    const addFin = (r: number, spread: number, pos: THREE.Vector3, rot: THREE.Euler) => {
      const m = new THREE.Mesh(fanGeometry(r, spread), fanMat);
      m.position.copy(pos);
      m.rotation.copy(rot);
      this.body.add(m);
      this.fins.push({ obj: m, base: rot.clone(), phase: Math.random() * 6 });
    };
    // 尾翼：上と左右（艫側へ広がる）
    addFin(1.15, Math.PI / 2.2, new THREE.Vector3(-0.15 - envLen / 2 + 0.5, envY + envR * 0.6, 0), new THREE.Euler(0, 0, Math.PI / 2.4));
    for (const side of [1, -1]) addFin(1.0, Math.PI / 2.4, new THREE.Vector3(-0.15 - envLen / 2 + 0.5, envY, side * envR * 0.65), new THREE.Euler(side * Math.PI / 2, 0, Math.PI / 2.4, 'XZY'));
    // 船体の横の翼（魚の胸びれのように）
    for (const side of [1, -1]) addFin(1.25, Math.PI / 2.6, new THREE.Vector3(0.35, shape.sheer(0.1) + 0.05, side * W * 0.5), new THREE.Euler(side * (Math.PI / 2 - 0.25), 0, Math.PI / 2.1, 'XZY'));

    // ---- 艫のプロペラ（左右2つ） ----
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#e9d6b0', roughness: 0.7, side: THREE.DoubleSide });
    const podMat = new THREE.MeshStandardMaterial({ color: '#5a3421', roughness: 0.6 });
    for (const side of [1, -1]) {
      const pod = new THREE.Group();
      pod.position.set(-L / 2 + 0.35, shape.sheer(-0.85) + 0.25, side * 0.62);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 12), podMat);
      hub.rotation.z = Math.PI / 2;
      pod.add(hub);
      const prop = new THREE.Group();
      prop.position.x = -0.26;
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.12), bladeMat);
        blade.position.y = 0.25;
        const arm = new THREE.Group();
        arm.rotation.x = (b / 4) * Math.PI * 2;
        blade.rotation.y = 0.5;
        arm.add(blade);
        prop.add(arm);
      }
      pod.add(prop);
      this.props.push(prop);
      this.body.add(pod);
    }

    // ---- 灯り：舳先の提灯・航海灯（左舷が赤、右舷が緑） ----
    const glow = glowTexture();
    const lamp = (color: string, size: number, pos: THREE.Vector3) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.position.copy(pos);
      s.scale.setScalar(size);
      this.body.add(s);
      return s;
    };
    // 舳先に突き出した棒と、そこに下がる提灯
    const sprit = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.2, 8), podMat);
    sprit.rotation.z = -Math.PI / 2 + 0.35;
    sprit.position.set(L / 2 + 0.25, shape.sheer(1) + 0.25, 0);
    this.body.add(sprit);
    const bowLamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: '#ffcc80', emissive: '#ffa040', emissiveIntensity: 1.6 }));
    bowLamp.scale.y = 1.25;
    bowLamp.position.set(L / 2 + 0.75, shape.sheer(1) + 0.18, 0);
    this.body.add(bowLamp);
    lamp('#ffb060', 1.1, bowLamp.position);
    this.navLights.push({ sprite: lamp('#ff4a3a', 0.55, new THREE.Vector3(0.3, shape.sheer(0.1) + 0.3, W * 0.5)), phase: 0 });
    this.navLights.push({ sprite: lamp('#5aff9a', 0.55, new THREE.Vector3(0.3, shape.sheer(0.1) + 0.3, -W * 0.5)), phase: Math.PI });
    lamp('#ffd9a0', 0.9, new THREE.Vector3(-1.05, shape.sheer(-0.4) + 0.45, 0.62));
    lamp('#ffd9a0', 0.9, new THREE.Vector3(-1.05, shape.sheer(-0.4) + 0.45, -0.62));

    // ---- 吹き流し（気球の艫からなびく） ----
    const sg = new THREE.PlaneGeometry(2.4, 0.22, 24, 1);
    sg.translate(-1.2, 0, 0);
    this.streamerBase = Float32Array.from(sg.getAttribute('position').array as ArrayLike<number>);
    this.streamer = new THREE.Mesh(
      sg,
      new THREE.MeshStandardMaterial({
        map: canvasTexture(256, 16, (g) => {
          const grd = g.createLinearGradient(0, 0, 256, 0);
          grd.addColorStop(0, '#f5f0e6');
          grd.addColorStop(0.5, '#b8322a');
          grd.addColorStop(1, '#3b4fa0');
          g.fillStyle = grd;
          g.fillRect(0, 0, 256, 16);
        }),
        side: THREE.DoubleSide,
        roughness: 0.9,
      }),
    );
    this.streamer.position.set(-0.15 - envLen / 2 - 0.25, envY + 0.15, 0);
    this.body.add(this.streamer);

    // ---- 雲の尾（プロペラの後ろ。船の外＝舞台に置く） ----
    const puffMat = new THREE.SpriteMaterial({ map: puffTexture(), color: '#ffe9dc', transparent: true, depthWrite: false, opacity: 0 });
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(puffMat.clone());
      s.visible = false;
      this.puffs.push({ sprite: s, life: 0, vel: new THREE.Vector3() });
    }

    this.visible = false;
  }

  /** 雲の尾を舞台に置く（船と一緒に動かないように、船の外に出す） */
  attachTrail(parent: THREE.Object3D): void {
    for (const p of this.puffs) parent.add(p.sprite);
  }

  /** 台本の `@演出 飛空艇 <合図>`。到着：雲の下から昇ってきて、dock の位置に横付けする */
  cue(signal: string): Promise<void> | void {
    if (signal === '到着' || signal === 'arrive') return this.arrive();
  }

  /** 横付けする場所（舞台の座標）と、そこでの向き */
  dock = new THREE.Vector3(6, 0.15, -8.6);

  private arrive(): Promise<void> {
    const d = this.dock;
    // 雲の海の下・左奥から現れ、大きく弧を描いて、桟橋と平行（舳先が +x）に止まる
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-30, -10, -40),
      new THREE.Vector3(-18, -3.5, -33),
      new THREE.Vector3(-7, 1.5, -24),
      new THREE.Vector3(-1, 2.2, -15),
      new THREE.Vector3(d.x - 4.5, d.y + 0.9, d.z - 1.6),
      new THREE.Vector3(d.x - 1.2, d.y + 0.2, d.z - 0.15),
      d.clone(),
    ]);
    this.visible = true;
    const p = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const place = (u: number) => {
      path.getPointAt(u, p);
      path.getTangentAt(Math.min(u, 0.999), tan);
      this.position.copy(p);
      // 前（+x）を進む向きへ。最後は桟橋と平行にそろえる
      const yaw = Math.atan2(-tan.z, tan.x) * (1 - Ease.inOutSine(Math.max(0, (u - 0.85) / 0.15)));
      this.rotation.y = yaw;
      // 曲がるときは内側へ傾く
      this.bank += (THREE.MathUtils.clamp((yaw - this.lastYaw) * 60, -0.35, 0.35) - this.bank) * 0.08;
      this.lastYaw = yaw;
    };
    place(0);
    return this.tweens.run(
      10,
      (k) => {
        place(k);
        // 着く間際はプロペラをゆるめる
        this.throttle = 1 - 0.7 * Ease.inOutSine(Math.max(0, (k - 0.7) / 0.3));
      },
      // 終わりにかけてゆっくり減速して止まる
      (k) => 1 - Math.pow(1 - k, 2.2),
      this,
    );
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.time += dt;
    const t = this.time;
    // ふわふわ浮く・ゆっくり揺れる
    this.body.position.y = Math.sin(t * 0.9) * 0.07;
    this.body.rotation.x = Math.sin(t * 0.7) * 0.025 + this.bank;
    this.body.rotation.z = Math.sin(t * 0.55 + 1) * 0.02;
    this.bank *= 0.98;
    for (const pr of this.props) pr.rotation.x += dt * (4 + this.throttle * 22);
    for (const f of this.fins) {
      f.obj.rotation.set(f.base.x, f.base.y + Math.sin(t * 1.6 + f.phase) * 0.08, f.base.z + Math.sin(t * 1.1 + f.phase) * 0.05, f.base.order);
    }
    // 航海灯の点滅と、提灯の明かりの揺らぎ
    for (const n of this.navLights) n.sprite.material.opacity = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 2.4 + n.phase)), 6);
    this.lanternMat.emissiveIntensity = 0.3 + Math.sin(t * 3.1) * 0.03 + Math.sin(t * 7.3) * 0.02;
    // 吹き流し：根元は動かず、先へいくほど大きく波打つ
    const pos = this.streamer.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const bx = this.streamerBase[i * 3];
      const k = -bx / 2.4;
      pos.setZ(i, Math.sin(t * 5 + bx * 3) * 0.22 * k);
      pos.setY(i, this.streamerBase[i * 3 + 1] + Math.sin(t * 3.2 + bx * 2) * 0.1 * k - k * k * 0.25);
    }
    pos.needsUpdate = true;
    this.updatePuffs(dt);
  }

  private updatePuffs(dt: number): void {
    this.puffClock -= dt;
    if (this.puffClock <= 0 && this.throttle > 0.35) {
      this.puffClock = 0.16;
      const p = this.puffs.find((x) => x.life <= 0);
      if (p) {
        // プロペラの少し後ろから出す
        const side = Math.random() < 0.5 ? 1 : -1;
        const local = new THREE.Vector3(-2.6 - Math.random() * 0.3, 0.6, side * 0.62);
        p.sprite.position.copy(this.body.localToWorld(local));
        p.sprite.parent?.worldToLocal(p.sprite.position);
        p.vel.set(-0.6, 0.15, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        p.life = 1;
        p.sprite.visible = true;
      }
    }
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt / 2.2;
      p.sprite.position.addScaledVector(p.vel, dt);
      const age = 1 - p.life;
      p.sprite.scale.setScalar(0.4 + age * 1.6);
      p.sprite.material.opacity = Math.min(1, age * 6) * Math.max(0, p.life) * 0.7;
      if (p.life <= 0) p.sprite.visible = false;
    }
  }
}
