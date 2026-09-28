import { BufferGeometry, CircleGeometry, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, Points, PointsMaterial, Vector3 } from 'three';
import { findGridPath } from '../core/navigation/GridPathfinder.js';
import { hasGridLineOfSight } from '../core/world/GridVisibility.js';

// Read-only visualization of existing masks and navigation. Hidden by default.
export class AcceptanceDebug {
  constructor(scene, collision, player, target = { x: -7.6, z: -1.8 }) {
    this.collision = collision; this.player = player; this.target = target;
    this.group = new Group(); this.group.visible = false;
    const blocked = [];
    const grid = collision.grid;
    for (let z = 0; z < grid.height; z++) for (let x = 0; x < grid.width; x++) {
      if (grid.isCellWalkable(x, z)) continue;
      const point = grid.cellToWorld(x, z);
      blocked.push(new Vector3(point.x, 0.08, point.z));
    }
    this.blocks = new Points(new BufferGeometry().setFromPoints(blocked), new PointsMaterial({ color: 0xff866b, size: 4, sizeAttenuation: false }));
    this.path = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0xffe59e }));
    this.sight = new Line(new BufferGeometry(), new LineBasicMaterial({ color: 0x82f4b9 }));
    this.marker = new Mesh(new CircleGeometry(0.15, 12), new MeshBasicMaterial({ color: 0xffe59e, depthWrite: false }));
    this.marker.rotation.x = -Math.PI / 2; this.marker.userData.skipDepth = true;
    this.group.add(this.blocks, this.path, this.sight, this.marker);
    scene.add(this.group);
    this.route = []; this.hasSight = false; this.lastCell = null;
  }

  setTarget(x, z) { this.target = { x, z }; this.lastCell = null; this.update(); }
  toggle() { this.group.visible = !this.group.visible; this.lastCell = null; this.update(); return this.group.visible; }
  update() {
    if (!this.group.visible) return;
    const grid = this.collision.grid;
    const from = { x: this.player.position.x, z: this.player.position.z };
    const cell = grid.worldToCell(from.x, from.z);
    const key = `${cell.x}:${cell.z}`;
    if (key === this.lastCell) return;
    this.lastCell = key;
    this.route = findGridPath(grid, from, this.target, { radius: this.collision.radius });
    this.hasSight = hasGridLineOfSight(grid, from, this.target);
    this.path.geometry.dispose();
    this.path.geometry = new BufferGeometry().setFromPoints(this.route.map((point) => new Vector3(point.x, 0.1, point.z)));
    this.path.visible = this.route.length > 1;
    this.sight.geometry.dispose();
    this.sight.geometry = new BufferGeometry().setFromPoints([new Vector3(from.x, 0.12, from.z), new Vector3(this.target.x, 0.12, this.target.z)]);
    this.sight.material.color.setHex(this.hasSight ? 0x82f4b9 : 0xff6b72);
    this.marker.position.set(this.target.x, 0.13, this.target.z);
  }

  get label() { return `PATH ${this.route.length ? this.route.length - 1 : '不可'} / LOS ${this.hasSight ? '通過' : '遮断'}`; }
}
