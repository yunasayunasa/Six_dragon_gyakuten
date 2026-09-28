export function hasGridLineOfSight(grid, start, end) {
  const steps = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / (grid.cellSize * 0.2)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cell = grid.worldToCell(start.x + (end.x - start.x) * t, start.z + (end.z - start.z) * t);
    if (grid.blocksSightCell(cell.x, cell.z)) return false;
  }
  return true;
}
