import test from 'node:test';
import assert from 'node:assert/strict';
import { QualityManager } from '../src/runtime/quality/QualityManager.js';

test('adaptation is opt-in, changes DPR only, and pauses for benchmark', () => {
  let resized = 0;
  const dof = { pixelRatioCap: null, quality: 'MEDIUM', mobile: true,
    qualityProfiles: { MEDIUM: { mobile: 1 }, LOW: { mobile: 0.85 } },
    setPixelRatioCap(value) { this.pixelRatioCap = value; },
  };
  const manager = new QualityManager(dof, { onChange: () => resized++ });
  for (let i = 0; i < 120; i++) manager.update(0.03);
  assert.equal(dof.pixelRatioCap, null);
  manager.setEnabled(true);
  for (let i = 0; i < 120; i++) manager.update(0.03, { benchmark: true });
  assert.equal(dof.pixelRatioCap, null);
  for (let i = 0; i < 101; i++) manager.update(0.03);
  assert.equal(dof.pixelRatioCap, 0.85);
  assert.equal(dof.quality, 'MEDIUM');
  manager.setManualCap(1);
  assert.equal(dof.pixelRatioCap, 1);
  assert.ok(resized >= 2);
});
