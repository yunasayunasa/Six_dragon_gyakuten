import { WalkableGrid } from '../core/world/WalkableGrid.js';
import { WorldCollision } from '../core/world/WorldCollision.js';
import { PLAYER_PROFILE, ACCEPTANCE_PLAYER_PROFILE, SCENE_PROFILE } from './demoProfiles.js';
import { POND_PROFILE } from '../presentation/water/waterProfiles.js';

// Explicit demo geometry. None of these coordinates are derived from meshes,
// and StageDirector never changes the navigation/collision masks.
export function createDemoCollision({ acceptance = false } = {}) {
  const profile = acceptance ? ACCEPTANCE_PLAYER_PROFILE : PLAYER_PROFILE;
  const cellSize = 0.25, [minX, maxX, minZ, maxZ] = profile.bounds;
  const originX = minX - 0.5, originZ = minZ - 0.5;
  const width = Math.ceil((maxX - minX + 1) / cellSize) + 1;
  const height = Math.ceil((maxZ - minZ + 1) / cellSize) + 1;
  const grid = new WalkableGrid({ width, height, cellSize, originX, originZ, sightCells: new Uint8Array(width * height) });
  const [pondX, , pondZ] = SCENE_PROFILE.pond;
  for (let z = 0; z < height; z++) for (let x = 0; x < width; x++) {
    const point = grid.cellToWorld(x, z);
    if (((point.x - pondX) / (POND_PROFILE.width / 2)) ** 2 + ((point.z - pondZ) / (POND_PROFILE.depth / 2)) ** 2 < 1) grid.setWalkable(x, z, false);
    if (!acceptance) continue;
    const [houseX, , houseZ] = SCENE_PROFILE.house;
    const house = Math.abs(point.x - houseX) < 2 && Math.abs(point.z - houseZ) < 1.5;
    const tree = [[-7, -3, 0.6], [-4, -6, 0.55]].some(([cx, cz, radius]) => Math.hypot(point.x - cx, point.z - cz) < radius);
    if (house || tree) { grid.setWalkable(x, z, false); grid.setSightBlocking(x, z, true); }
  }
  return new WorldCollision(grid, { radius: 0.2 });
}
