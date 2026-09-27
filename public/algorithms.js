// Sorting algorithms as generators.
//
// Every algorithm mutates the array in place and yields one "op" per unit of
// work so the arena can replay it step by step:
//   [CMP, i, j]  compared a[i] with a[j]
//   [READ, i]    looked at a[i] without comparing (radix sort)
//   [SWAP, i, j] swapped a[i] and a[j] (already applied when yielded)
//   [SET, i]     overwrote a[i] (already applied when yielded)
//
// This file has no DOM dependencies so the tests can import it in Node.

export const CMP = 0;
export const SWAP = 1;
export const SET = 2;
export const READ = 3;

function swap(a, i, j) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
}

function* quick(a) {
  yield* quickRange(a, 0, a.length - 1);
}

// Lomuto partition with a middle pivot; recurse into the smaller side first.
function* quickRange(a, lo, hi) {
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (mid !== hi) {
      swap(a, mid, hi);
      yield [SWAP, mid, hi];
    }
    let p = lo;
    for (let i = lo; i < hi; i++) {
      yield [CMP, i, hi];
      if (a[i] < a[hi]) {
        if (i !== p) {
          swap(a, i, p);
          yield [SWAP, i, p];
        }
        p++;
      }
    }
    if (p !== hi) {
      swap(a, p, hi);
      yield [SWAP, p, hi];
    }
    if (p - lo < hi - p) {
      yield* quickRange(a, lo, p - 1);
      lo = p + 1;
    } else {
      yield* quickRange(a, p + 1, hi);
      hi = p - 1;
    }
  }
}

function* merge(a) {
  yield* mergeRange(a, new Array(a.length), 0, a.length - 1);
}

function* mergeRange(a, aux, lo, hi) {
  if (lo >= hi) return;
  const mid = (lo + hi) >> 1;
  yield* mergeRange(a, aux, lo, mid);
  yield* mergeRange(a, aux, mid + 1, hi);
  for (let k = lo; k <= hi; k++) aux[k] = a[k];
  let i = lo;
  let j = mid + 1;
  for (let k = lo; k <= hi; k++) {
    if (i > mid) a[k] = aux[j++];
    else if (j > hi) a[k] = aux[i++];
    else {
      yield [CMP, i, j];
      a[k] = aux[j] < aux[i] ? aux[j++] : aux[i++];
    }
    yield [SET, k];
  }
}

function* heap(a) {
  const n = a.length;
  for (let i = (n >> 1) - 1; i >= 0; i--) yield* siftDown(a, i, n);
  for (let end = n - 1; end > 0; end--) {
    swap(a, 0, end);
    yield [SWAP, 0, end];
    yield* siftDown(a, 0, end);
  }
}

function* siftDown(a, i, n) {
  for (;;) {
    const l = 2 * i + 1;
    const r = l + 1;
    let m = i;
    if (l < n) {
      yield [CMP, l, m];
      if (a[l] > a[m]) m = l;
    }
    if (r < n) {
      yield [CMP, r, m];
      if (a[r] > a[m]) m = r;
    }
    if (m === i) return;
    swap(a, i, m);
    yield [SWAP, i, m];
    i = m;
  }
}

// Ciura's gap sequence, extended by ×2.25 for big inputs.
function* shell(a) {
  const n = a.length;
  const gaps = [1, 4, 10, 23, 57, 132, 301, 701];
  while (gaps[gaps.length - 1] * 2.25 < n) gaps.push(Math.floor(gaps[gaps.length - 1] * 2.25));
  for (let g = gaps.length - 1; g >= 0; g--) {
    const gap = gaps[g];
    if (gap >= n) continue;
    for (let i = gap; i < n; i++) {
      for (let j = i; j >= gap; j -= gap) {
        yield [CMP, j - gap, j];
        if (a[j - gap] <= a[j]) break;
        swap(a, j - gap, j);
        yield [SWAP, j - gap, j];
      }
    }
  }
}

// LSD radix sort, base 10. Zero comparisons.
function* radix(a) {
  const n = a.length;
  let max = 0;
  for (let i = 0; i < n; i++) {
    yield [READ, i];
    if (a[i] > max) max = a[i];
  }
  const aux = new Array(n);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const count = new Array(10).fill(0);
    for (let i = 0; i < n; i++) {
      yield [READ, i];
      count[Math.floor(a[i] / exp) % 10]++;
    }
    for (let d = 1; d < 10; d++) count[d] += count[d - 1];
    for (let i = n - 1; i >= 0; i--) {
      yield [READ, i];
      aux[--count[Math.floor(a[i] / exp) % 10]] = a[i];
    }
    for (let i = 0; i < n; i++) {
      a[i] = aux[i];
      yield [SET, i];
    }
  }
}

function* insertion(a) {
  for (let i = 1; i < a.length; i++) {
    for (let j = i; j > 0; j--) {
      yield [CMP, j - 1, j];
      if (a[j - 1] <= a[j]) break;
      swap(a, j - 1, j);
      yield [SWAP, j - 1, j];
    }
  }
}

function* selection(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let m = i;
    for (let j = i + 1; j < n; j++) {
      yield [CMP, j, m];
      if (a[j] < a[m]) m = j;
    }
    if (m !== i) {
      swap(a, i, m);
      yield [SWAP, i, m];
    }
  }
}

function* bubble(a) {
  for (let end = a.length - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      yield [CMP, i, i + 1];
      if (a[i] > a[i + 1]) {
        swap(a, i, i + 1);
        swapped = true;
        yield [SWAP, i, i + 1];
      }
    }
    if (!swapped) return;
  }
}

function* cocktail(a) {
  let lo = 0;
  let hi = a.length - 1;
  while (lo < hi) {
    let last = lo;
    for (let i = lo; i < hi; i++) {
      yield [CMP, i, i + 1];
      if (a[i] > a[i + 1]) {
        swap(a, i, i + 1);
        yield [SWAP, i, i + 1];
        last = i;
      }
    }
    hi = last;
    last = hi;
    for (let i = hi; i > lo; i--) {
      yield [CMP, i - 1, i];
      if (a[i - 1] > a[i]) {
        swap(a, i - 1, i);
        yield [SWAP, i - 1, i];
        last = i;
      }
    }
    lo = last;
  }
}

function* comb(a) {
  const n = a.length;
  let gap = n;
  let sorted = false;
  while (!sorted) {
    gap = Math.floor(gap / 1.3);
    if (gap <= 1) {
      gap = 1;
      sorted = true;
    }
    for (let i = 0; i + gap < n; i++) {
      yield [CMP, i, i + gap];
      if (a[i] > a[i + gap]) {
        swap(a, i, i + gap);
        yield [SWAP, i, i + gap];
        sorted = false;
      }
    }
  }
}

function* bogo(a) {
  for (;;) {
    let sorted = true;
    for (let i = 0; i < a.length - 1; i++) {
      yield [CMP, i, i + 1];
      if (a[i] > a[i + 1]) {
        sorted = false;
        break;
      }
    }
    if (sorted) return;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      swap(a, i, j);
      yield [SWAP, i, j];
    }
  }
}

export const ALGORITHMS = [
  {
    id: 'quick', name: 'Quick Sort', emoji: '⚡', color: '#ffd23d', run: quick,
    avg: 'n log n', worst: 'n²', memory: 'log n', stable: false,
    blurb: 'Picks a pivot and splits the world in two. Blazing on average, moody on bad days.',
  },
  {
    id: 'merge', name: 'Merge Sort', emoji: '🧬', color: '#3df2ff', run: merge,
    avg: 'n log n', worst: 'n log n', memory: 'n', stable: true,
    blurb: 'Divide, conquer, zip it back together. Never has an off day.',
  },
  {
    id: 'heap', name: 'Heap Sort', emoji: '⛰️', color: '#ff8a3d', run: heap,
    avg: 'n log n', worst: 'n log n', memory: '1', stable: false,
    blurb: 'Builds a mountain, peels off the peak. Looks chaotic until the very end.',
  },
  {
    id: 'shell', name: 'Shell Sort', emoji: '🐚', color: '#b18cff', run: shell,
    avg: '~n^1.3', worst: 'n²', memory: '1', stable: false,
    blurb: 'Insertion sort with long-distance jumps. Criminally underrated.',
  },
  {
    id: 'radix', name: 'Radix Sort', emoji: '📬', color: '#c6ff3d', run: radix,
    avg: 'n·k', worst: 'n·k', memory: 'n', stable: true,
    blurb: 'Never compares anything. Just buckets digits like a mail room.',
  },
  {
    id: 'insertion', name: 'Insertion Sort', emoji: '🃏', color: '#ff5fa2', run: insertion,
    avg: 'n²', worst: 'n²', memory: '1', stable: true,
    blurb: 'Sorts like a hand of cards. Elite on nearly-sorted, cooked on chaos.',
  },
  {
    id: 'selection', name: 'Selection Sort', emoji: '🎯', color: '#5fa8ff', run: selection,
    avg: 'n²', worst: 'n²', memory: '1', stable: false,
    blurb: 'Finds the smallest, puts it in place. Every. Single. Time.',
  },
  {
    id: 'bubble', name: 'Bubble Sort', emoji: '🫧', color: '#7dffcf', run: bubble,
    avg: 'n²', worst: 'n²', memory: '1', stable: true,
    blurb: 'Swaps neighbours until nothing moves. The people’s champion of slow.',
  },
  {
    id: 'cocktail', name: 'Cocktail Shaker', emoji: '🍸', color: '#ff7070', run: cocktail,
    avg: 'n²', worst: 'n²', memory: '1', stable: true,
    blurb: 'Bubble sort that shakes both ways. Slightly less tragic.',
  },
  {
    id: 'comb', name: 'Comb Sort', emoji: '💈', color: '#ffb3f0', run: comb,
    avg: 'n log n*', worst: 'n²', memory: '1', stable: false,
    blurb: 'Bubble sort that learned to skip ahead. Shrinks its gap by 1.3 each pass.',
  },
  {
    id: 'bogo', name: 'Bogo Sort', emoji: '🤡', color: '#9aa0b8', run: bogo, meme: true,
    avg: 'n·n!', worst: '∞', memory: '1', stable: false,
    blurb: 'Shuffles until sorted. Meme fighter: gets a DNF when everyone else finishes.',
  },
];

// Small seeded PRNG so every fighter gets the exact same scramble.
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A permutation of 0..n-1. The value at each slot is the tile's home position.
export function makeInput(n, mode, seed) {
  const rng = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  if (mode === 'reversed') {
    a.reverse();
  } else if (mode === 'nearly') {
    const reach = Math.max(2, Math.round(n / 40));
    const swaps = Math.max(1, Math.round(n * 0.06));
    for (let k = 0; k < swaps && n > 1; k++) {
      const i = Math.floor(rng() * n);
      const j = Math.min(n - 1, Math.max(0, i + Math.round((rng() * 2 - 1) * reach)));
      swap(a, i, j);
    }
  } else if (mode === 'random') {
    for (let i = n - 1; i > 0; i--) swap(a, i, Math.floor(rng() * (i + 1)));
  }
  return a;
}
