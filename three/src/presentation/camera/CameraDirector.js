import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_PROFILE as P } from '../../demo/profiles.js';
export class CameraDirector {
  constructor() {
    this.camera = new PerspectiveCamera(P.fov, 1, P.near, P.far);
    this.base = new Vector3().fromArray(P.target);
    this.target = this.base.clone();
    this.offset = new Vector3().fromArray(P.offset);
    this.camera.position.copy(this.base).add(this.offset);
    this.camera.lookAt(this.target);
  }
  update(dt, player, eventTarget, eventBlend) {
    const target = this.base.clone().addScaledVector(player.position, P.follow).addScaledVector(player.velocity, P.lookAhead);
    if (eventTarget) target.lerp(eventTarget, eventBlend * 0.55);
    this.target.lerp(target, 1 - Math.exp(-P.response * dt));
    this.camera.position.copy(this.target).addScaledVector(this.offset, 1 - eventBlend * P.eventPush);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
  resize(width, height) { this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); }
}
