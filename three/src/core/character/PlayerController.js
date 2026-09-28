import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, Vector3, MathUtils } from 'three';
import { PaperObject } from '../paper/PaperObject.js';
import { PLAYER_PROFILE } from './defaultProfiles.js';
import { SpriteAnimator } from './SpriteAnimator.js';
export class PlayerController extends Group {
  constructor(textures, profile = PLAYER_PROFILE, collision = null) {
    super();
    this.profile = { ...PLAYER_PROFILE, ...profile };
    this.collision = collision;
    const P = this.profile;
    this.position.fromArray(P.start);
    this.atlas = textures.player.clone();
    this.animator = new SpriteAnimator(this.atlas, {
      columns: P.columns, rows: P.rows, directionRows: P.directionRows,
      clips: P.clips ?? { Idle: { start: 0, frames: 1, fps: 0 }, Walk: { start: 0, frames: P.frames, fps: P.fps } },
    });
    this.paper = new PaperObject(this.atlas, { height: P.height, width: P.height * P.aspect });
    this.add(this.paper);
    const shadow = new Mesh(new PlaneGeometry(1.55, 1.1), new MeshBasicMaterial({ map: textures.shadow, transparent: true, opacity: 0.45, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.018;
    shadow.userData.skipDepth = true;
    this.add(shadow);
    this.velocity = new Vector3();
    this.frame = 0;
  }
  animate(frame) {
    this.frame = frame;
    this.animator.show(frame);
  }
  update(dt, input, camera, locked) {
    const P = this.profile;
    const x = locked ? 0 : Number(input.has('right')) - Number(input.has('left'));
    const z = locked ? 0 : Number(input.has('down')) - Number(input.has('up'));
    this.velocity.set(x, 0, z).normalize().multiplyScalar(P.speed);
    if (this.collision) {
      const next = this.collision.move(this.position, this.velocity.x * dt, this.velocity.z * dt);
      this.position.set(next.x, this.position.y, next.z);
    } else this.position.addScaledVector(this.velocity, dt);
    this.position.x = MathUtils.clamp(this.position.x, P.bounds[0], P.bounds[1]);
    this.position.z = MathUtils.clamp(this.position.z, P.bounds[2], P.bounds[3]);
    this.paper.rotation.y = Math.atan2(camera.position.x - this.position.x, camera.position.z - this.position.z);
    if (x && !P.directionRows) this.paper.mesh.scale.x = x < 0 ? -1 : 1;
    this.animator.setState(x || z ? 'Walk' : 'Idle');
    if (P.directionRows && (x || z)) {
      const cameraYaw = Math.atan2(camera.position.x - this.position.x, camera.position.z - this.position.z);
      this.animator.setFacing(x, z, cameraYaw);
    }
    this.animator.update(dt);
    this.frame = this.animator.frame;
  }
  focusPoint() { return this.position.clone().add(new Vector3(0, 1.2, 0)); }
}
