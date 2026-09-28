import { Group, Mesh, CylinderGeometry, MeshBasicMaterial, Vector3, Quaternion } from 'three';
const UP = new Vector3(0, 1, 0);
export class StageProp extends Group {
  constructor(paper, { pivot = [0, 0, 0], foldAngle = -Math.PI / 2 } = {}) {
    super();
    this.position.copy(paper.position).add(new Vector3().fromArray(pivot));
    paper.position.set(0, 0, 0).sub(new Vector3().fromArray(pivot));
    this.paper = paper; this.add(paper);
    this.foldAngle = foldAngle;
    this.landing = this.position.clone();
    this.wire = null;
    this.wireAnchor = new Vector3();
    this.wireEnd = new Vector3();
    this.wireDirection = new Vector3();
    this.wireRotation = new Quaternion();
  }
  focusPoint() { return this.paper.mesh.getWorldPosition(new Vector3()); }
  prepare(type, profile) {
    this.position.copy(this.landing);
    this.rotation.set(type === 'rise' ? this.foldAngle : 0, 0, 0);
    if (type !== 'wire_drop') { if (this.wire) this.wire.visible = false; return; }
    if (!this.wire) {
      this.wire = new Mesh(new CylinderGeometry(0.012, 0.012, 1, 5), new MeshBasicMaterial({ color: 0xc4b99b }));
      this.wire.userData.skipDepth = true;
      this.parent.add(this.wire);
    }
    this.position.y = this.landing.y + profile.dropHeight;
    this.wireAnchor.copy(this.landing).add(new Vector3(0, profile.dropHeight + 2.1, 0));
    this.wire.visible = true;
    this.updateWire();
  }
  updateWire() {
    if (!this.wire?.visible) return;
    this.getWorldPosition(this.wireEnd);
    this.parent.worldToLocal(this.wireEnd);
    this.wireDirection.copy(this.wireAnchor).sub(this.wireEnd);
    const length = this.wireDirection.length();
    this.wire.position.copy(this.wireAnchor).add(this.wireEnd).multiplyScalar(0.5);
    this.wire.scale.y = length;
    this.wire.quaternion.copy(this.wireRotation.setFromUnitVectors(UP, this.wireDirection.normalize()));
  }
}
