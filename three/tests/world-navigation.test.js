import test from 'node:test';
import assert from 'node:assert/strict';
import { WalkableGrid } from '../src/core/world/WalkableGrid.js';
import { WorldCollision } from '../src/core/world/WorldCollision.js';
import { findGridPath } from '../src/core/navigation/GridPathfinder.js';
import { hasGridLineOfSight } from '../src/core/world/GridVisibility.js';
import { createDemoCollision } from '../src/demo/createDemoWorld.js';

test('collision respects negative origins, player radius, and fast-frame crossings', () => {
  const grid = new WalkableGrid({ width: 7, height: 5, originX: -3, originZ: -2 });
  for (let z = 0; z < 5; z++) grid.setWalkable(3, z, false);
  const collision = new WorldCollision(grid, { radius: 0.2 });
  assert.equal(grid.worldToCell(-3, -2).x, 0);
  const moved = collision.move({ x: -2, z: 0 }, 4, 1);
  assert.ok(moved.x < -0.5, `wall crossed at x=${moved.x}`);
  assert.ok(moved.z > 0, 'free axis must slide along the wall');
  assert.equal(grid.canOccupy(-3.6, 0, 0.2), false);
});

test('path and sight use separate masks; unreachable and same-cell cases are explicit', () => {
  const grid = new WalkableGrid({ width: 5, height: 3, sightCells: new Uint8Array(15) });
  grid.setWalkable(2, 1, false); // A pond can still be seen across.
  assert.equal(hasGridLineOfSight(grid, { x: 0, z: 1 }, { x: 4, z: 1 }), true);
  const route = findGridPath(grid, { x: 0, z: 1 }, { x: 4, z: 1 });
  assert.ok(route.length > 5);
  assert.deepEqual(route.at(-1), { x: 4, z: 1 });
  grid.setSightBlocking(2, 1, true);
  assert.equal(hasGridLineOfSight(grid, { x: 0, z: 1 }, { x: 4, z: 1 }), false);
  assert.deepEqual(findGridPath(grid, { x: 0, z: 0 }, { x: 0, z: 0 }), [{ x: 0, z: 0 }]);
  for (let z = 0; z < 3; z++) grid.setWalkable(1, z, false);
  assert.deepEqual(findGridPath(grid, { x: 0, z: 1 }, { x: 4, z: 1 }), []);
});

test('regression scene blocks walking through the pond without hiding it', () => {
  const collision = createDemoCollision();
  assert.equal(collision.grid.canOccupy(-5.2, -0.6, 0.2), false);
  const cell = collision.grid.worldToCell(-5.2, -0.6);
  assert.equal(collision.grid.blocksSightCell(cell.x, cell.z), false);
  assert.equal(collision.grid.canOccupy(-3, 2, 0.2), true);
});
