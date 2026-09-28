import { Box3, Vector3 } from 'three';

const corners = (box) => [
  [box.min.x, box.min.y, box.min.z], [box.min.x, box.min.y, box.max.z],
  [box.min.x, box.max.y, box.min.z], [box.min.x, box.max.y, box.max.z],
  [box.max.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.max.z],
  [box.max.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.max.z],
];

// Registration clones materials once. Shared textures and geometry remain shared.
// A faded mesh is omitted from the paper DOF depth prepass, so its transparent
// color does not leave an opaque rectangle in the depth buffer.
export class OcclusionDirector {
  constructor({ opacity = 0.3, response = 10, margin = 0.03 } = {}) {
    this.opacity = opacity; this.response = response; this.margin = margin;
    this.entries = new Map();
    this.box = new Box3(); this.point = new Vector3(); this.projected = new Vector3(); this.targetPoint = new Vector3();
  }

  register(object) {
    if (this.entries.has(object)) return;
    const meshes = [];
    object.traverse((mesh) => {
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const original = mesh.material;
      const faded = original.clone();
      mesh.material = faded;
      meshes.push({ mesh, original, faded, skipDepth: mesh.userData.skipDepth });
    });
    this.entries.set(object, { object, meshes, opacity: 1 });
  }

  overlaps(entry, camera, target) {
    this.box.setFromObject(entry.object);
    if (this.box.isEmpty()) return false;
    const focus = typeof target.focusPoint === 'function' ? target.focusPoint() : target.getWorldPosition(this.targetPoint);
    const targetDepth = -this.projected.copy(focus).applyMatrix4(camera.matrixWorldInverse).z;
    const objectDepth = -this.projected.copy(this.box.getCenter(this.point)).applyMatrix4(camera.matrixWorldInverse).z;
    if (objectDepth >= targetDepth || objectDepth <= 0) return false;
    const targetScreen = this.projected.copy(focus).project(camera);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const corner of corners(this.box)) {
      const point = this.point.set(...corner).project(camera);
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    }
    return targetScreen.x >= minX - this.margin && targetScreen.x <= maxX + this.margin
      && targetScreen.y >= minY - this.margin && targetScreen.y <= maxY + this.margin;
  }

  update(dt, camera, target) {
    for (const entry of this.entries.values()) {
      const goal = entry.object.visible && this.overlaps(entry, camera, target) ? this.opacity : 1;
      entry.opacity += (goal - entry.opacity) * (1 - Math.exp(-this.response * dt));
      if (goal === 1 && entry.opacity > 0.995) entry.opacity = 1;
      const active = entry.opacity < 0.995;
      for (const { mesh, original, faded, skipDepth } of entry.meshes) {
        faded.opacity = original.opacity * entry.opacity;
        if (faded.transparent !== (active || original.transparent) || faded.alphaTest !== (active ? 0.02 : original.alphaTest)) {
          faded.transparent = active || original.transparent;
          faded.alphaTest = active ? 0.02 : original.alphaTest;
          faded.depthWrite = active ? false : original.depthWrite;
          faded.needsUpdate = true;
        }
        mesh.userData.skipDepth = active || skipDepth === true;
      }
    }
  }

  dispose() {
    for (const entry of this.entries.values()) {
      for (const { mesh, original, faded, skipDepth } of entry.meshes) {
        mesh.material = original;
        if (skipDepth === undefined) delete mesh.userData.skipDepth;
        else mesh.userData.skipDepth = skipDepth;
        faded.dispose();
      }
    }
    this.entries.clear();
  }
}
