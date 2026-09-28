import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
const Y_AXIS = new Vector3(0, 1, 0);

// One static geometry/material pair per batch. Moving or billboarding props stay
// separate PaperObjects so their individual transforms and depth remain intact.
export class SceneryBatch {
  constructor(geometry, material, count) {
    if (!Number.isInteger(count) || count < 1) throw Error('Batch count must be positive');
    this.mesh = new InstancedMesh(geometry, material, count);
    this.capacity = count;
    this.mesh.count = 0;
    this.count = 0;
    this.matrix = new Matrix4();
    this.rotation = new Quaternion();
    this.position = new Vector3();
    this.scale = new Vector3();
    this.mesh.frustumCulled = false;
  }

  add(position, scale, rotation = 0) {
    if (this.count >= this.capacity) throw Error('Scenery batch capacity exceeded');
    this.position.set(...position);
    this.scale.set(...scale);
    this.rotation.setFromAxisAngle(Y_AXIS, rotation);
    this.matrix.compose(this.position, this.rotation, this.scale);
    this.mesh.setMatrixAt(this.count++, this.matrix);
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    return this;
  }
}
