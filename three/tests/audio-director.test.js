import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioDirector } from '../src/presentation/audio/AudioDirector.js';

test('audio creates context lazily, routes buses, and reuses decoded buffers', async () => {
  let created = 0, fetched = 0, decoded = 0, starts = 0;
  const gain = () => ({ gain: { value: 1 }, connect() {} });
  const contextFactory = () => {
    created++;
    return { destination: {}, createGain: gain, resume: async () => {}, suspend: async () => {}, close: async () => {},
      decodeAudioData: async () => { decoded++; return {}; },
      createBufferSource: () => ({ connect() {}, start() { starts++; }, stop() {}, set loop(v) { this._loop = v; } }),
    };
  };
  const director = new AudioDirector({ contextFactory, fetcher: async () => { fetched++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) }; } });
  director.register('StageRise', { url: '/rise.ogg', bus: 'se' });
  assert.equal(created, 0);
  await director.play('StageRise'); await director.play('StageRise');
  assert.equal(created, 1); assert.equal(fetched, 1); assert.equal(decoded, 1); assert.equal(starts, 2);
  director.setVolume('se', 0.4); assert.equal(director.buses.get('se').gain.value, 0.4);
  director.setMuted(true); assert.equal(director.master.gain.value, 0);
  await director.dispose();
});
