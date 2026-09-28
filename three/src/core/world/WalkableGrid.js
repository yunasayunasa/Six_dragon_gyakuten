// Cell coordinates refer to cell centres; origin is the world position of (0, 0).
export class WalkableGrid {
  constructor({ width, height, cellSize = 1, originX = 0, originZ = 0, cells, sightCells } = {}) {
    if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 || !(cellSize > 0)) throw Error('Invalid grid dimensions');
    if (cells && cells.length !== width * height) throw Error('Invalid walkable cell count');
    if (sightCells && sightCells.length !== width * height) throw Error('Invalid sight cell count');
    Object.assign(this, { width, height, cellSize, originX, originZ });
    this.cells = cells ? Uint8Array.from(cells) : new Uint8Array(width * height).fill(1);
    // A separate mask permits a pond to block movement without blocking vision.
    this.sightCells = sightCells ? Uint8Array.from(sightCells) : null;
  }

  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.width && z < this.height; }
  index(x, z) { return z * this.width + x; }
  worldToCell(x, z) { return { x: Math.round((x - this.originX) / this.cellSize), z: Math.round((z - this.originZ) / this.cellSize) }; }
  cellToWorld(x, z) { return { x: this.originX + x * this.cellSize, z: this.originZ + z * this.cellSize }; }
  isCellWalkable(x, z) { return this.inBounds(x, z) && this.cells[this.index(x, z)] !== 0; }
  blocksSightCell(x, z) { return !this.inBounds(x, z) || (this.sightCells ? this.sightCells[this.index(x, z)] !== 0 : !this.isCellWalkable(x, z)); }
  setWalkable(x, z, value) { if (!this.inBounds(x, z)) throw Error('Cell outside grid'); this.cells[this.index(x, z)] = Number(Boolean(value)); }
  setSightBlocking(x, z, value) {
    if (!this.inBounds(x, z)) throw Error('Cell outside grid');
    if (!this.sightCells) this.sightCells = Uint8Array.from(this.cells, (value) => Number(!value));
    this.sightCells[this.index(x, z)] = Number(Boolean(value));
  }
  canOccupy(x, z, radius = 0) {
    for (const [dx, dz] of [[0, 0], [radius, radius], [-radius, radius], [radius, -radius], [-radius, -radius]]) {
      const cell = this.worldToCell(x + dx, z + dz);
      if (!this.isCellWalkable(cell.x, cell.z)) return false;
    }
    return true;
  }
}
