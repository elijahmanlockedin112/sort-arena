# 🔒 SORT//ARENA

**Lock in. Pick your fighters. Unscramble the image.**

Sort Arena cuts any image into pieces, scrambles them, and makes sorting algorithms race side by side to put it back together. Quick Sort vs Merge Sort vs Heap Sort vs poor old Bubble Sort, live, on *your* picture.

![Sort Arena](https://img.shields.io/badge/dependencies-zero-c6ff3d?style=flat-square) ![Node](https://img.shields.io/badge/node-%3E%3D18-3df2ff?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-ff3d8b?style=flat-square)

## Quick start

```bash
git clone https://github.com/elijahmanlockedin112/sort-arena.git
cd sort-arena
npm start
```

That's it: no `npm install` needed. It opens **http://localhost:5173** in your browser. (Port busy? It automatically tries the next one. Or set `PORT=3000`.)

## Features

- 🖼️ **Bring your own image**: upload, drag & drop, paste from your clipboard (Ctrl+V), or snap one with your **webcam**
- 🥊 **11 fighters**: Quick, Merge, Heap, Shell, Radix, Insertion, Selection, Bubble, Cocktail Shaker, Comb, and Bogo (a meme fighter that gets a DNF)
- 🧩 **6 arena sizes**: 64 or 256 vertical strips, or tile grids from 8×8 up to 64×64 (4,096 pieces)
- 🎲 **3 scrambles**: random, reversed, or nearly sorted (watch Insertion Sort go from zero to hero)
- 📊 **Live stats**: compares, writes, total ops, and % of pieces home, plus a live standings track
- ⏭️ **Turbo finish** to skip to the end, and a **results screen** with real headless CPU timings
- 🔊 Optional retro sound effects, confetti, and keyboard shortcuts

## How the race stays fair

1. Every piece remembers its home position, and sorting the pieces by home position rebuilds the image.
2. All fighters get the **exact same scramble** (seeded RNG).
3. Each animation frame, every fighter gets the **same budget of operations**. One compare, one read, one swap, or one write each costs one op.
4. The fighter that finishes in the fewest ops wins. The results screen also times each algorithm with the visuals off, so you can compare that to real CPU time.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Start / pause / resume |
| `F` | Turbo finish |
| `R` | Reset race |
| `N` | New scramble |
| `M` | Toggle sound |
| `?` | How it works |

## Project layout

```
sort-arena/
├── server.js              # zero-dependency static server (node server.js)
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js             # arena: rendering, race loop, UI
│   └── algorithms.js      # sorting algorithms as generators (shared with tests)
└── test/
    └── algorithms.test.js # node --test
```

Every algorithm is a JavaScript **generator** that yields each compare, read, swap or write. The arena steps the generators frame by frame and redraws only the tiles that changed.

## Add your own fighter

Write a generator in `public/algorithms.js` and add it to `ALGORITHMS`:

```js
function* mySort(a) {
  // yield [CMP, i, j] after comparing, [SWAP, i, j] after swapping, [SET, i] after writing
}
```

Then run `npm test` to make sure it actually sorts.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the server and open your browser |
| `npm run dev` | Start the server without opening a browser |
| `npm test` | Check that every algorithm sorts correctly |

## License

MIT
