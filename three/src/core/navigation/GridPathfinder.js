// Four-neighbour BFS for small, equal-cost walkable grids.
export function findGridPath(grid, start, goal, { radius = 0 } = {}) {
  const from = grid.worldToCell(start.x, start.z), to = grid.worldToCell(goal.x, goal.z);
  if (!grid.canOccupy(start.x, start.z, radius) || !grid.canOccupy(goal.x, goal.z, radius)) return [];
  const count = grid.width * grid.height, previous = new Int32Array(count).fill(-1), queue = new Int32Array(count);
  const begin = grid.index(from.x, from.z), end = grid.index(to.x, to.z);
  let head = 0, tail = 1;
  queue[0] = begin; previous[begin] = begin;
  while (head < tail && previous[end] === -1) {
    const current = queue[head++], x = current % grid.width, z = Math.floor(current / grid.width);
    for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const nx = x + dx, nz = z + dz;
      if (!grid.inBounds(nx, nz)) continue;
      const next = grid.index(nx, nz);
      if (previous[next] !== -1) continue;
      const world = grid.cellToWorld(nx, nz);
      if (!grid.canOccupy(world.x, world.z, radius)) continue;
      previous[next] = current;
      queue[tail++] = next;
    }
  }
  if (previous[end] === -1) return [];
  const path = [];
  for (let current = end; current !== begin; current = previous[current]) path.push(grid.cellToWorld(current % grid.width, Math.floor(current / grid.width)));
  path.push(grid.cellToWorld(from.x, from.z));
  return path.reverse();
}
