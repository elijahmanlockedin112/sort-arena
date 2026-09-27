import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, makeInput, CMP, SWAP, SET, READ } from '../public/algorithms.js';

const MODES = ['random', 'reversed', 'nearly', 'sorted'];
const SIZES = [0, 1, 2, 3, 10, 64, 257, 1024];
const identity = (n) => Array.from({ length: n }, (_, i) => i);

for (const algo of ALGORITHMS) {
  test(`${algo.name} restores every scramble`, () => {
    for (const n of algo.meme ? [0, 1, 2, 5] : SIZES) {
      for (const mode of MODES) {
        const a = makeInput(n, mode, 1337 + n);
        for (const op of algo.run(a)) {
          assert.ok([CMP, SWAP, SET, READ].includes(op[0]), `unknown op ${op[0]}`);
          for (const idx of op.slice(1)) assert.ok(idx >= 0 && idx < n, `index ${idx} out of range`);
        }
        assert.deepEqual(a, identity(n), `${algo.id} failed on n=${n}, ${mode}`);
      }
    }
  });
}

test('makeInput is a deterministic permutation', () => {
  for (const mode of MODES) {
    const a = makeInput(500, mode, 7);
    assert.deepEqual(makeInput(500, mode, 7), a);
    assert.deepEqual([...a].sort((x, y) => x - y), identity(500));
  }
  assert.notDeepEqual(makeInput(500, 'random', 1), makeInput(500, 'random', 2));
});

test('radix sort never compares', () => {
  const a = makeInput(300, 'random', 3);
  for (const op of ALGORITHMS.find((x) => x.id === 'radix').run(a)) assert.notEqual(op[0], CMP);
});
