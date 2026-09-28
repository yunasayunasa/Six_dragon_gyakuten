import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3, Scene, Mesh, PlaneGeometry, MeshBasicMaterial, Texture, Color, Group } from 'three';
import { axialDistance, damp } from '../src/presentation/dof/math.js';
import { StageDirector } from '../src/presentation/stage/StageDirector.js';
import { StageProp } from '../src/presentation/stage/StageProp.js';
import { PaperBokehPass } from '../src/presentation/dof/PaperBokehPass.js';
import { DemoBenchmarkScenario } from '../src/demo/DemoBenchmarkScenario.js';
import { PerformanceMonitor } from '../src/performance/PerformanceMonitor.js';
test('Bokeh focus uses view depth, not radial distance', () => {
  const camera = new PerspectiveCamera(); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  assert.equal(axialDistance(camera, new Vector3(0, 0, 0)), 10);
  assert.equal(axialDistance(camera, new Vector3(8, 0, 0)), 10);
});
test('focus easing does not jump and is independent of update frequency', () => {
  const one = damp(10, 20, 3, 1 / 30); const two = damp(damp(10, 20, 3, 1 / 60), 20, 3, 1 / 60);
  assert.ok(one > 10 && one < 20); assert.ok(Math.abs(one - two) < 1e-10);
});
test('one director moves two props concurrently and reuses a thin cylinder wire', () => {
  const scene = new Scene(), director = new StageDirector();
  const make = () => { const paper = new Group(); paper.mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial()); paper.add(paper.mesh); const prop = new StageProp(paper); scene.add(prop); return prop; };
  const sign = make(), wire = make();
  const rise = director.play(sign, 'rise');
  const drop = director.play(wire, 'wire_drop', { duration: 1 });
  assert.equal(director.active.size, 2);
  const sameWire = wire.wire;
  director.update(0.5); assert.ok(sign.rotation.x > sign.foldAngle); assert.ok(wire.position.y > wire.landing.y);
  director.update(0.25); assert.notEqual(wire.position.x, wire.landing.x); assert.notEqual(wire.wire.quaternion.z, 0);
  director.update(0.55); assert.equal(drop.done, true); assert.equal(rise.done, true); assert.equal(director.busy, false);
  const fall = director.play(sign, 'fall', { duration: 0.2 });
  director.play(wire, 'wire_drop', { duration: 0.2 }); director.update(0.2);
  assert.equal(fall.done, true); assert.equal(sign.rotation.x, sign.foldAngle);
  assert.equal(wire.wire, sameWire); assert.equal(wire.position.y, wire.landing.y);
});
test('benchmark excludes ten-second warm-up from five-minute totals', () => {
  const renderer = { info: { render: { calls: 7, triangles: 12 }, memory: { geometries: 2, textures: 3 }, programs: [] } };
  const player = { position: new Vector3(), focusPoint: () => new Vector3() };
  const events = { locked: false, suspendAuto: false };
  const dof = { enabled: true, quality: 'LOW', pixelRatio: 0.85, setProfile() {}, focusTo() {} };
  const director = new StageDirector();
  const make = () => { const prop = new Group(); prop.landing = new Vector3(); prop.foldAngle = -Math.PI / 2; prop.prepare = () => {}; prop.updateWire = () => {}; return prop; };
  const b = new DemoBenchmarkScenario(new PerformanceMonitor(renderer), player, director, events, dof, { sign: make(), wire: make(), door: make() });
  assert.equal(b.start(), true); b.update(10); b.sample(10);
  assert.equal(b.phase, 'measuring'); assert.equal(b.recorder.frames, 0);
  for (let i = 0; i < 300; i++) { b.update(1); b.sample(1); }
  assert.equal(b.phase, 'done'); assert.equal(b.recorder.frames, 300); assert.equal(b.result.drawCalls, 7);
  assert.equal(b.result.averageFPS, 1); assert.equal(b.result.geometriesStart, 2); assert.equal(events.suspendAuto, false);
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
