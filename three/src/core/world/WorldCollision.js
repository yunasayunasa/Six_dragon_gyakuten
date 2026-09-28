// Small steps prevent a fast frame from jumping across a blocked grid cell.
export class WorldCollision {
  constructor(grid, { radius = 0.2 } = {}) { this.grid = grid; this.radius = radius; }
  move(position, dx, dz) {
    const x0 = position.x, z0 = position.z;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (this.grid.cellSize * 0.5)));
    let x = x0, z = z0;
    for (let i = 0; i < steps; i++) {
      const stepX = dx / steps, stepZ = dz / steps;
      if (this.grid.canOccupy(x + stepX, z, this.radius)) x += stepX;
      if (this.grid.canOccupy(x, z + stepZ, this.radius)) z += stepZ;
    }
    return { x, z };
  }
}
