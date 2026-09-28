import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, Vector3, MathUtils } from 'three';
import { PaperObject } from '../paper/PaperObject.js';
import { PLAYER_PROFILE as P } from '../../demo/profiles.js';
export class PlayerController extends Group {
  constructor(textures) {
    super();
    this.position.fromArray(P.start);
    this.atlas = textures.player.clone();
    this.atlas.repeat.set(1 / P.columns, 1 / P.rows);
    this.paper = new PaperObject(this.atlas, { height: P.height, width: P.height * 128 / 208 });
    this.add(this.paper);
    const shadow = new Mesh(new PlaneGeometry(1.55, 1.1), new MeshBasicMaterial({ map: textures.shadow, transparent: true, opacity: 0.45, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.018;
    shadow.userData.skipDepth = true;
    this.add(shadow);
    this.velocity = new Vector3();
    this.clock = 0;
    this.frame = 0;
    this.animate(0);
  }
  animate(frame) {
    this.frame = frame;
    this.atlas.offset.set(frame % P.columns / P.columns, 1 - (Math.floor(frame / P.columns) + 1) / P.rows);
  }
  update(dt, input, camera, locked) {
    const x = locked ? 0 : Number(input.has('right')) - Number(input.has('left'));
    const z = locked ? 0 : Number(input.has('down')) - Number(input.has('up'));
    this.velocity.set(x, 0, z).normalize().multiplyScalar(P.speed);
    this.position.addScaledVector(this.velocity, dt);
    this.position.x = MathUtils.clamp(this.position.x, P.bounds[0], P.bounds[1]);
    this.position.z = MathUtils.clamp(this.position.z, P.bounds[2], P.bounds[3]);
    this.paper.rotation.y = Math.atan2(camera.position.x - this.position.x, camera.position.z - this.position.z);
    if (x) this.paper.mesh.scale.x = x < 0 ? -1 : 1;
    this.clock = x || z ? this.clock + dt : 0;
    this.animate(x || z ? Math.floor(this.clock * P.fps) % P.frames : 0);
  }
  focusPoint() { return this.position.clone().add(new Vector3(0, 1.2, 0)); }
}
