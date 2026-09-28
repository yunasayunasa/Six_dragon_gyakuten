import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3, Scene, Mesh, PlaneGeometry, MeshBasicMaterial, Texture, Color } from 'three';
import { axialDistance, damp } from '../src/presentation/dof/math.js';
import { stageFrame } from '../src/presentation/stage/StageDirector.js';
import { STAGE_PROFILE as P } from '../src/demo/profiles.js';
import { PaperBokehPass } from '../src/presentation/dof/PaperBokehPass.js';
test('Bokeh focus uses view depth, not radial distance', () => {
  const camera = new PerspectiveCamera(); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  assert.equal(axialDistance(camera, new Vector3(0, 0, 0)), 10);
  assert.equal(axialDistance(camera, new Vector3(8, 0, 0)), 10);
});
test('focus easing does not jump and is independent of update frequency', () => {
  const one = damp(10, 20, 3, 1 / 30); const two = damp(damp(10, 20, 3, 1 / 60), 20, 3, 1 / 60);
  assert.ok(one > 10 && one < 20); assert.ok(Math.abs(one - two) < 1e-10);
});
test('stage focuses before rise and returns focus after holding', () => {
  assert.equal(stageFrame(0).rise, 0); assert.equal(stageFrame(P.focus).blend, 1);
  assert.equal(stageFrame(P.focus).rise, 0);
  assert.equal(stageFrame(P.focus + P.rise).rise, 1);
  const end = stageFrame(0).end; assert.equal(stageFrame(end).blend, 0); assert.equal(stageFrame(end).active, false);
});
test('alpha-aware depth retains map and restores materials on render failure', () => {
  const scene = new Scene(), camera = new PerspectiveCamera();
  const texture = new Texture(), material = new MeshBasicMaterial({ map: texture, alphaTest: 0.45 });
  const mesh = new Mesh(new PlaneGeometry(), material); scene.add(mesh);
  const shadow = mesh.clone(); shadow.userData.skipDepth = true; scene.add(shadow);
  const pass = new PaperBokehPass(scene, camera, {});
  const renderer = { autoClear: true, getClearColor: (c) => c.copy(new Color()), getClearAlpha: () => 1, setClearColor() {}, setRenderTarget() {}, clear() {}, render() { assert.equal(mesh.material.map, texture); assert.equal(mesh.material.alphaTest, 0.45); assert.equal(shadow.visible, false); throw Error('simulated context failure'); } };
  assert.throws(() => pass.render(renderer, {}, {}), /simulated/);
  assert.equal(mesh.material, material); assert.equal(shadow.visible, true); assert.equal(renderer.autoClear, true); assert.equal(scene.overrideMaterial, null);
  pass.dispose();
});
