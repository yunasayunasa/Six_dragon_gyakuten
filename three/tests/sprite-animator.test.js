import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture } from 'three';
import { SpriteAnimator } from '../src/core/character/SpriteAnimator.js';
import { ACCEPTANCE_PLAYER_PROFILE } from '../src/demo/demoProfiles.js';

test('flat atlas retains the demo frame order and idle frame', () => {
  const texture = new Texture();
  const animator = new SpriteAnimator(texture, { columns: 5, rows: 5, clips: {
    Idle: { start: 0, frames: 1, fps: 0 }, Walk: { start: 0, frames: 25, fps: 14 },
  } });
  animator.setState('Walk'); animator.update(6 / 14);
  assert.equal(animator.frame, 6);
  assert.equal(texture.offset.x, 1 / 5);
  assert.equal(texture.offset.y, 3 / 5);
  animator.setState('Idle'); animator.update(1);
  assert.equal(animator.frame, 0);
});

test('direction rows and optional action clips stay within the atlas', () => {
  const texture = new Texture();
  const animator = new SpriteAnimator(texture, { columns: 8, rows: 16,
    directionRows: [0, 1, 2, 3, 4, 5, 6, 7],
    clips: { Idle: { frames: 1, fps: 0 }, Walk: { frames: 8, fps: 8 }, Attack: { frames: 8, fps: 8, rowOffset: 8, loop: false } },
  });
  animator.setState('Walk'); animator.setFacing(1, 0); animator.update(2 / 8);
  assert.equal(animator.direction, 2);
  assert.equal(texture.offset.x, 2 / 8);
  assert.equal(texture.offset.y, 1 - 3 / 16);
  animator.setState('Attack'); animator.update(2);
  assert.equal(animator.frame, 7);
  assert.equal(texture.offset.y, 1 - 11 / 16);
});

test('acceptance sheet selects front, right, back and left rows without mirroring', () => {
  const texture = new Texture();
  const { columns, rows, clips, directionRows } = ACCEPTANCE_PLAYER_PROFILE;
  const animator = new SpriteAnimator(texture, { columns, rows, clips, directionRows });
  animator.setState('Walk');
  for (const [x, z, row] of [[0, 1, 0], [1, 0, 6], [0, -1, 4], [-1, 0, 2]]) {
    animator.setFacing(x, z);
    assert.equal(texture.offset.y, 1 - (row + 1) / rows);
  }
  animator.update(2 / clips.Walk.fps);
  assert.equal(animator.frame, 2);
  animator.setState('Idle');
  assert.equal(animator.frame, 0);
});
