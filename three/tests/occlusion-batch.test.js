import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Vector3 } from 'three';
import { OcclusionDirector } from '../src/presentation/occlusion/OcclusionDirector.js';
import { SceneryBatch } from '../src/core/scene/SceneryBatch.js';

test('occlusion fades only an overlapping foreground object and restores depth/material', () => {
  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 3, 10); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
  const object = new Group();
  const original = new MeshBasicMaterial({ alphaTest: 0.45 });
  const mesh = new Mesh(new PlaneGeometry(3, 3), original);
  mesh.position.set(0, 1.5, 2); object.add(mesh);
  const target = { focusPoint: () => new Vector3(0, 1.2, 0) };
  const director = new OcclusionDirector(); director.register(object);
  assert.notEqual(mesh.material, original);
  director.update(1, camera, target);
  assert.ok(mesh.material.opacity < 0.4);
  assert.equal(mesh.userData.skipDepth, true);
  director.update(2, camera, { focusPoint: () => new Vector3(7, 1.2, 0) });
  assert.equal(mesh.material.opacity, 1);
  assert.equal(mesh.userData.skipDepth, false);
  director.dispose();
  assert.equal(mesh.material, original);
  assert.equal(mesh.userData.skipDepth, undefined);
});

test('static scenery shares a single draw-call batch with distinct matrices', () => {
  const batch = new SceneryBatch(new PlaneGeometry(1, 1), new MeshBasicMaterial(), 2);
  batch.add([1, 0, 2], [2, 3, 1]);
  batch.add([-1, 0, 4], [1, 2, 1]);
  assert.equal(batch.mesh.count, 2);
  assert.equal(batch.count, 2);
  assert.notDeepEqual(Array.from(batch.mesh.instanceMatrix.array.slice(0, 16)), Array.from(batch.mesh.instanceMatrix.array.slice(16, 32)));
  assert.throws(() => batch.add([0, 0, 0], [1, 1, 1]), /capacity/);
});
