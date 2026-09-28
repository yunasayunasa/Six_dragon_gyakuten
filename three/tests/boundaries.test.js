import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BenchmarkRecorder } from '../src/performance/BenchmarkRecorder.js';

const source = fileURLToPath(new URL('../src/', import.meta.url));
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(path.join(directory, entry.name))
    : entry.name.endsWith('.js') ? [path.join(directory, entry.name)] : []))).flat();
}
test('engine modules never import demo or UI modules', async () => {
  for (const layer of ['core', 'presentation', 'runtime', 'performance']) {
    for (const file of await files(path.join(source, layer))) {
      const code = await readFile(file, 'utf8');
      // Static imports/re-exports, side-effect imports and literal dynamic imports.
      const imports = code.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g);
      for (const [, specifier] of imports) {
        if (!specifier.startsWith('.')) continue;
        const target = path.relative(source, path.resolve(path.dirname(file), specifier));
        assert.ok(!/^(demo|ui)([/\\]|$)/.test(target), `${file} -> ${specifier}`);
      }
    }
  }
});

test('recorder works without a scene and labels mixed configurations', () => {
  const recorder = new BenchmarkRecorder();
  const metrics = { drawCalls: 4, triangles: 20, geometries: 2, textures: 3, programs: 1 };
  const config = { dof: true, dofQuality: 'LOW', pixelRatio: 0.85 };
  recorder.start(config);
  recorder.advance(10); recorder.sample(10, metrics, config);
  assert.equal(recorder.frames, 0);
  for (let i = 0; i < 300; i++) {
    recorder.advance(1);
    recorder.sample(1, metrics, { ...config, pixelRatio: 1 });
  }
  assert.equal(recorder.result.averageFPS, 1);
  assert.equal(recorder.result.pixelRatio, 'MIXED');
  assert.equal(recorder.result.geometriesStart, 2);
});
