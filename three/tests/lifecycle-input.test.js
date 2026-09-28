import test from 'node:test';
import assert from 'node:assert/strict';
import { ApplicationLifecycle } from '../src/runtime/lifecycle/ApplicationLifecycle.js';
import { createInput } from '../src/ui/mobileControls/input.js';

class Target {
  constructor() { this.handlers = new Map(); this.dataset = {}; this.captures = new Set(); }
  addEventListener(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, new Set()); this.handlers.get(type).add(fn); }
  removeEventListener(type, fn) { this.handlers.get(type)?.delete(fn); }
  emit(type, event = {}) { for (const fn of this.handlers.get(type) ?? []) fn(event); }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); this.emit('lostpointercapture', { pointerId: id }); }
}

test('blur, visibility, page restore and manual pause suspend time without a catch-up frame', () => {
  const win = new Target(), doc = new Target(); doc.hidden = false;
  let suspends = 0, resumes = 0;
  const lifecycle = new ApplicationLifecycle({ windowTarget: win, documentTarget: doc, onSuspend: () => suspends++, onResume: () => resumes++ });
  assert.equal(lifecycle.tick(1000), 0);
  assert.equal(lifecycle.tick(1016), 0.016);
  win.emit('blur'); assert.equal(lifecycle.active, false);
  assert.equal(lifecycle.tick(5000), 0);
  win.emit('focus'); assert.equal(lifecycle.tick(9000), 0);
  assert.equal(lifecycle.tick(9016), 0.016);
  doc.hidden = true; doc.emit('visibilitychange');
  assert.equal(lifecycle.tick(12000), 0);
  doc.hidden = false; doc.emit('visibilitychange');
  assert.equal(lifecycle.tick(15000), 0);
  lifecycle.setPaused(true); assert.equal(lifecycle.tick(16000), 0);
  lifecycle.setPaused(false); assert.equal(lifecycle.tick(17000), 0);
  win.emit('pagehide'); assert.equal(lifecycle.active, false);
  win.emit('pageshow'); assert.equal(lifecycle.tick(20000), 0);
  assert.equal(suspends, 4);
  assert.equal(resumes, 4);
  lifecycle.dispose(); win.emit('blur'); assert.equal(suspends, 4);
});

test('mobile controls keep simultaneous holds, clear on cancel/pause, and leave editing keys alone', () => {
  const win = new Target(), doc = new Target(); doc.hidden = false;
  const buttons = ['up', 'left', 'down', 'right'].map((direction) => {
    const button = new Target(); button.dataset.move = direction; return button;
  });
  const actions = Object.fromEntries(['#dof', '#quality', '#stats-toggle', '#stage'].map((id) => [id, new Target()]));
  doc.querySelectorAll = () => buttons;
  doc.querySelector = (id) => actions[id];
  let active = true, dof = 0, stage = 0;
  const input = createInput({ toggleDOF: () => dof++, quality() {}, stats() {}, stage: () => stage++, benchmark() {}, canInput: () => active }, { windowTarget: win, documentTarget: doc });
  const pointer = (id) => ({ pointerId: id, preventDefault() {} });
  buttons[0].emit('pointerdown', pointer(1)); buttons[3].emit('pointerdown', pointer(2));
  assert.equal(input.has('up'), true); assert.equal(input.has('right'), true);
  buttons[0].emit('pointercancel', pointer(1));
  assert.equal(input.has('up'), false); assert.equal(input.has('right'), true);
  const editable = { closest: () => ({}) };
  win.emit('keydown', { code: 'KeyD', target: editable, preventDefault() {} });
  assert.equal(dof, 0);
  win.emit('keydown', { code: 'KeyD', target: null, repeat: false, preventDefault() {} });
  assert.equal(dof, 1);
  active = false; input.reset();
  assert.equal(input.has('right'), false);
  assert.equal(buttons[3].captures.size, 0);
  actions['#stage'].emit('click'); assert.equal(stage, 0);
  active = true; win.emit('blur');
  assert.equal(input.has('right'), false);
  input.dispose(); actions['#stage'].emit('click'); assert.equal(stage, 0);
});
