import { WalkableGrid } from '../core/world/WalkableGrid.js';
import { WorldCollision } from '../core/world/WorldCollision.js';
import { PLAYER_PROFILE, SCENE_PROFILE } from './demoProfiles.js';
import { POND_PROFILE } from '../presentation/water/waterProfiles.js';

// Only the small pond is blocked in the regression scene. Paths and AI do not
// depend on this layout; future games provide their own cell data.
export function createDemoCollision() {
  const cellSize = 0.25, [minX, maxX, minZ, maxZ] = PLAYER_PROFILE.bounds;
  const originX = minX - 0.5, originZ = minZ - 0.5;
  const width = Math.ceil((maxX - minX + 1) / cellSize) + 1;
  const height = Math.ceil((maxZ - minZ + 1) / cellSize) + 1;
  const grid = new WalkableGrid({ width, height, cellSize, originX, originZ, sightCells: new Uint8Array(width * height) });
  const [pondX, , pondZ] = SCENE_PROFILE.pond;
  for (let z = 0; z < height; z++) for (let x = 0; x < width; x++) {
    const point = grid.cellToWorld(x, z);
    if (((point.x - pondX) / (POND_PROFILE.width / 2)) ** 2 + ((point.z - pondZ) / (POND_PROFILE.depth / 2)) ** 2 < 1) grid.setWalkable(x, z, false);
  }
  return new WorldCollision(grid, { radius: 0.2 });
}
