import { ALGORITHMS, CMP, SWAP, SET, READ, makeInput, mulberry32 } from './algorithms.js';

// ---------------------------------------------------------------- config

const GRIDS = [
  { id: 's64', label: '64 strips', rows: 1, cols: 64 },
  { id: 's256', label: '256 strips', rows: 1, cols: 256 },
  { id: 't8', label: '8 × 8', rows: 8, cols: 8 },
  { id: 't16', label: '16 × 16', rows: 16, cols: 16 },
  { id: 't32', label: '32 × 32', rows: 32, cols: 32 },
  { id: 't64', label: '64 × 64', rows: 64, cols: 64 },
];
const SHUFFLES = [
  { id: 'random', label: 'Random' },
  { id: 'reversed', label: 'Reversed' },
  { id: 'nearly', label: 'Nearly' },
];
const DEFAULT_ROSTER = ['quick', 'merge', 'heap', 'shell', 'radix', 'bubble'];
const RENDER_W = 520;
const MAX_SPEED = 20000;
const MEME_CAP = 3_000_000; // ops a meme fighter gets in Finish mode before its DNF
const RECENT = 6; // how many recent ops get highlighted per fighter
const PLACES = ['🥇', '🥈', '🥉'];

const $ = (sel) => document.querySelector(sel);
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('en');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const el = {
  preview: $('#preview'),
  dropzone: $('#dropzone'),
  fileInput: $('#fileInput'),
  uploadBtn: $('#uploadBtn'),
  webcamBtn: $('#webcamBtn'),
  samples: $('#samples'),
  gridSeg: $('#gridSeg'),
  shuffleSeg: $('#shuffleSeg'),
  reshuffleBtn: $('#reshuffleBtn'),
  speed: $('#speed'),
  speedLabel: $('#speedLabel'),
  startBtn: $('#startBtn'),
  pauseBtn: $('#pauseBtn'),
  skipBtn: $('#skipBtn'),
  resetBtn: $('#resetBtn'),
  roster: $('#roster'),
  rosterCount: $('#rosterCount'),
  track: $('#track'),
  fighters: $('#fighters'),
  countdown: $('#countdown'),
  dropOverlay: $('#dropOverlay'),
  toast: $('#toast'),
  confetti: $('#confetti'),
  phaseChip: $('#phaseChip'),
  soundBtn: $('#soundBtn'),
  helpBtn: $('#helpBtn'),
  helpDlg: $('#helpDlg'),
  resultsDlg: $('#resultsDlg'),
  resultsTitle: $('#resultsTitle'),
  resultsSub: $('#resultsSub'),
  resultsBody: $('#resultsBody'),
  webcamDlg: $('#webcamDlg'),
  webcamVideo: $('#webcamVideo'),
  webcamError: $('#webcamError'),
  snapBtn: $('#snapBtn'),
};

// ---------------------------------------------------------------- state

const saved = loadPrefs();

const state = {
  source: null, // canvas holding the image at render size
  W: RENDER_W,
  H: 390,
  grid: GRIDS.find((g) => g.id === saved.grid) ?? GRIDS[3],
  shuffle: SHUFFLES.some((s) => s.id === saved.shuffle) ? saved.shuffle : 'random',
  seed: newSeed(),
  selected: new Set(Array.isArray(saved.roster) ? saved.roster : DEFAULT_ROSTER),
  sample: 'synthwave',
  rects: null,
  initial: [],
  fighters: [],
  phase: 'idle', // idle | countdown | racing | paused | done
  runId: 0,
  raf: 0,
  frame: 0,
  finishCount: 0,
  turbo: false,
  turboBudget: 20000,
  sound: saved.sound === true,
};

if (typeof saved.speed === 'number') el.speed.value = saved.speed;

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem('sort-arena') ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem('sort-arena', JSON.stringify({
      grid: state.grid.id,
      shuffle: state.shuffle,
      roster: [...state.selected],
      speed: Number(el.speed.value),
      sound: state.sound,
    }));
  } catch {
    // storage blocked: preferences just won't persist
  }
}

function newSeed() {
  return (Math.random() * 2 ** 32) >>> 0;
}

function opsPerFrame() {
  const t = Number(el.speed.value) / 100;
  return Math.max(1, Math.round(MAX_SPEED ** t));
}

// ---------------------------------------------------------------- sample images

const SAMPLES = [
  { id: 'synthwave', name: 'Synthwave', draw: drawSynthwave },
  { id: 'lock', name: 'Locked in', draw: drawLock },
  { id: 'swirl', name: 'Swirl', draw: drawSwirl },
  { id: 'blocks', name: 'Blocks', draw: drawBlocks },
];

function makeSample(sample, w = 800, h = 600) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  sample.draw(c.getContext('2d'), w, h);
  return c;
}

function drawSynthwave(ctx, w, h) {
  const rng = mulberry32(9);
  const horizon = h * 0.62;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#0b0221');
  sky.addColorStop(0.55, '#3a0b5e');
  sky.addColorStop(1, '#ff2e88');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rng() * 0.8})`;
    const s = rng() < 0.9 ? 1.5 : 3;
    ctx.fillRect(rng() * w, rng() * horizon * 0.65, s, s);
  }

  const r = h * 0.26;
  const cx = w / 2;
  const cy = horizon - r * 0.3;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, '#fff27a');
  sun.addColorStop(0.5, '#ffa03d');
  sun.addColorStop(1, '#ff2e88');
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  ctx.fillStyle = sky;
  for (let i = 0; i < 8; i++) ctx.fillRect(cx - r, cy + i * r * 0.12, 2 * r, 2 + i * 1.8);
  ctx.restore();

  ctx.fillStyle = '#1a0433';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  let x = 0;
  while (x < w) {
    x += 30 + rng() * 60;
    const peak = horizon - 20 - rng() * (Math.abs(x - cx) > r * 1.2 ? 110 : 30);
    ctx.lineTo(x, peak);
  }
  ctx.lineTo(w, horizon);
  ctx.fill();

  const floor = ctx.createLinearGradient(0, horizon, 0, h);
  floor.addColorStop(0, '#2a0850');
  floor.addColorStop(1, '#05010d');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, w, h - horizon);

  ctx.strokeStyle = '#ff3df2';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff3df2';
  ctx.shadowBlur = 10;
  for (let i = 1; i <= 12; i++) {
    const y = horizon + (h - horizon) * (i / 12) ** 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let k = -14; k <= 14; k++) {
    ctx.beginPath();
    ctx.moveTo(cx + k * 12, horizon);
    ctx.lineTo(cx + k * w * 0.14, h);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawLock(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#c6ff3d');
  bg.addColorStop(1, '#3df2ff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  for (let i = -h; i < w; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(h * 0.42)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText('🔒', w / 2, h * 0.4);
  ctx.fillStyle = '#07080d';
  ctx.font = `800 ${Math.round(h * 0.15)}px "JetBrains Mono", Consolas, monospace`;
  ctx.fillText('LOCKED IN', w / 2, h * 0.8);
}

function drawSwirl(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const stops = ['#ff3d8b', '#ffd23d', '#c6ff3d', '#3df2ff', '#8a5cff', '#ff3d8b'];
  let g;
  if (ctx.createConicGradient) {
    g = ctx.createConicGradient(0, cx, cy);
  } else {
    g = ctx.createLinearGradient(0, 0, w, 0);
  }
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const R = Math.hypot(cx, cy);
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (R * (i + 1)) / 18, i * 0.35, i * 0.35 + Math.PI);
    ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = R / 36;
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.3);
  glow.addColorStop(0, 'rgba(255,255,255,0.95)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawBlocks(ctx, w, h) {
  const rng = mulberry32(21);
  const colors = ['#f4f1e8', '#f4f1e8', '#f4f1e8', '#e8312e', '#1d4fd8', '#ffd23d', '#111'];
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  const line = Math.max(3, Math.round(w / 80));
  const minSize = Math.min(w, h) * 0.2;
  const split = (x, y, bw, bh, depth) => {
    const canSplit = depth < 5 && (bw > minSize || bh > minSize);
    if (canSplit && (depth < 2 || rng() < 0.75)) {
      if (bw > bh) {
        const cut = Math.round(bw * (0.3 + rng() * 0.4));
        split(x, y, cut, bh, depth + 1);
        split(x + cut, y, bw - cut, bh, depth + 1);
      } else {
        const cut = Math.round(bh * (0.3 + rng() * 0.4));
        split(x, y, bw, cut, depth + 1);
        split(x, y + cut, bw, bh - cut, depth + 1);
      }
      return;
    }
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.fillRect(x + line / 2, y + line / 2, bw - line, bh - line);
  };
  split(0, 0, w, h, 0);
}

// ---------------------------------------------------------------- image input

function useImage(img, w, h) {
  w = w || 800;
  h = h || 600;
  const aspect = Math.min(1.8, Math.max(0.6, w / h));
  const W = RENDER_W;
  const H = Math.round(W / aspect);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.max(W / w, H / h);
  ctx.drawImage(img, (W - w * scale) / 2, (H - h * scale) / 2, w * scale, h * scale);
  state.source = c;
  state.W = W;
  state.H = H;

  el.preview.width = W;
  el.preview.height = H;
  el.preview.getContext('2d').drawImage(c, 0, 0);
  rebuild();
}

function useSample(id) {
  const sample = SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
  state.sample = sample.id;
  markSample();
  useImage(makeSample(sample), 800, 600);
}

function markSample() {
  for (const b of el.samples.children) b.setAttribute('aria-pressed', String(b.dataset.id === state.sample));
}

function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    toast('That’s not an image 🤨');
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.sample = null;
    markSample();
    useImage(img, img.naturalWidth, img.naturalHeight);
    URL.revokeObjectURL(url);
    toast(`Loaded ${file.name || 'image'} ✅`);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    toast('Couldn’t read that image 😵');
  };
  img.src = url;
}

let webcamStream = null;

async function openWebcam() {
  el.webcamError.hidden = true;
  el.snapBtn.disabled = true;
  el.webcamDlg.showModal();
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    el.webcamVideo.srcObject = webcamStream;
    el.snapBtn.disabled = false;
  } catch (err) {
    el.webcamError.textContent = `Couldn’t open the webcam (${err.name || 'error'}). Check your browser’s camera permission.`;
    el.webcamError.hidden = false;
  }
}

function closeWebcam(snap) {
  const v = el.webcamVideo;
  if (snap && v.videoWidth) {
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1); // match the mirrored preview
    ctx.drawImage(v, 0, 0);
    state.sample = null;
    markSample();
    useImage(c, c.width, c.height);
    toast('Say cheese… now get sorted 📸');
  }
  webcamStream?.getTracks().forEach((t) => t.stop());
  webcamStream = null;
  v.srcObject = null;
}

// ---------------------------------------------------------------- arena setup

function computeRects() {
  const { rows, cols } = state.grid;
  const { W, H } = state;
  const n = rows * cols;
  const R = { x: new Int16Array(n), y: new Int16Array(n), w: new Int16Array(n), h: new Int16Array(n) };
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor((r * H) / rows);
    const y1 = Math.floor(((r + 1) * H) / rows);
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      const x0 = Math.floor((c * W) / cols);
      const x1 = Math.floor(((c + 1) * W) / cols);
      R.x[k] = x0;
      R.y[k] = y0;
      R.w[k] = x1 - x0;
      R.h[k] = y1 - y0;
    }
  }
  return R;
}

// Rebuild everything: pieces, scramble and fighter cards.
function rebuild() {
  if (!state.source) return;
  stopRace();
  state.rects = computeRects();
  state.initial = makeInput(state.grid.rows * state.grid.cols, state.shuffle, state.seed);

  el.fighters.textContent = '';
  el.track.textContent = '';
  state.fighters = ALGORITHMS.filter((a) => state.selected.has(a.id)).map(createFighter);
  if (!state.fighters.length) {
    el.fighters.innerHTML = '<div class="empty">No fighters selected. Pick at least one above 👆</div>';
  }
  state.fighters.forEach(resetFighter);
  updateControls();
}

function createFighter(algo) {
  const card = document.createElement('article');
  card.className = 'fighter';
  card.style.setProperty('--accent', algo.color);
  card.innerHTML = `
    <header>
      <span class="emoji">${algo.emoji}</span>
      <div>
        <h3>${algo.name}</h3>
        <p class="meta">avg O(${algo.avg}) · worst O(${algo.worst}) · ${algo.stable ? 'stable' : 'unstable'}</p>
      </div>
      <span class="place">—</span>
    </header>
    <div class="stage">
      <canvas class="img"></canvas>
      <canvas class="fx"></canvas>
      <div class="stamp"></div>
    </div>
    <div class="bar"><i></i></div>
    <dl class="stats">
      <div><dt>Compares</dt><dd data-k="cmp">0</dd></div>
      <div><dt>Writes</dt><dd data-k="writes">0</dd></div>
      <div><dt>Ops</dt><dd data-k="ops">0</dd></div>
      <div><dt>Home</dt><dd data-k="pct">0%</dd></div>
    </dl>
    <p class="blurb">${algo.blurb}</p>`;
  el.fighters.append(card);

  const lane = document.createElement('div');
  lane.className = 'lane';
  lane.style.setProperty('--accent', algo.color);
  lane.innerHTML = `
    <span class="lane-name">${algo.emoji} ${algo.name}</span>
    <div class="lane-rail"><div class="lane-fill"></div><span class="lane-runner">${algo.emoji}</span></div>
    <span class="lane-pct">0%</span>`;
  el.track.append(lane);

  const img = card.querySelector('canvas.img');
  const fx = card.querySelector('canvas.fx');
  img.width = fx.width = state.W;
  img.height = fx.height = state.H;

  const stat = (k) => card.querySelector(`[data-k="${k}"]`);
  return {
    algo,
    card,
    lane,
    ctx: img.getContext('2d'),
    fx: fx.getContext('2d'),
    ui: {
      cmp: stat('cmp'),
      writes: stat('writes'),
      ops: stat('ops'),
      pct: stat('pct'),
      bar: card.querySelector('.bar i'),
      place: card.querySelector('.place'),
      stamp: card.querySelector('.stamp'),
      laneFill: lane.querySelector('.lane-fill'),
      laneRunner: lane.querySelector('.lane-runner'),
      lanePct: lane.querySelector('.lane-pct'),
    },
  };
}

function resetFighter(f) {
  const n = state.initial.length;
  f.a = state.initial.slice();
  f.gen = f.algo.run(f.a);
  f.stats = { cmp: 0, writes: 0, ops: 0 };
  f.dirty = new Uint8Array(n);
  f.dirtyList = [];
  f.recent = [];
  f.done = false;
  f.dnf = false;
  f.place = 0;
  f.card.className = 'fighter';
  f.lane.className = 'lane';
  f.ui.place.textContent = '—';
  f.ui.stamp.textContent = '';
  f.fx.clearRect(0, 0, state.W, state.H);
  for (let i = 0; i < n; i++) drawTile(f, i);
  renderStats(f);
}

// ---------------------------------------------------------------- rendering

function drawTile(f, i) {
  const R = state.rects;
  const v = f.a[i];
  f.ctx.drawImage(state.source, R.x[v], R.y[v], R.w[v], R.h[v], R.x[i], R.y[i], R.w[i], R.h[i]);
}

function markDirty(f, i) {
  if (!f.dirty[i]) {
    f.dirty[i] = 1;
    f.dirtyList.push(i);
  }
}

function render(f) {
  for (const i of f.dirtyList) {
    drawTile(f, i);
    f.dirty[i] = 0;
  }
  f.dirtyList.length = 0;

  const { fx } = f;
  fx.clearRect(0, 0, state.W, state.H);
  if (!f.done) {
    const R = state.rects;
    const box = (i) => [R.x[i] - 1, R.y[i] - 1, R.w[i] + 2, R.h[i] + 2];
    for (const op of f.recent) {
      if (op[0] === CMP) {
        fx.strokeStyle = '#ffffff';
        fx.lineWidth = 2;
        fx.strokeRect(...box(op[1]));
        fx.strokeRect(...box(op[2]));
      } else if (op[0] === READ) {
        fx.fillStyle = 'rgba(61, 242, 255, 0.55)';
        fx.fillRect(...box(op[1]));
      } else {
        fx.fillStyle = f.algo.color + 'aa';
        fx.fillRect(...box(op[1]));
        if (op[0] === SWAP) fx.fillRect(...box(op[2]));
      }
    }
  }
  renderStats(f);
}

function renderStats(f) {
  const { a, stats, ui } = f;
  let home = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === i) home++;
  const pct = a.length ? (home / a.length) * 100 : 100;
  ui.cmp.textContent = compact.format(stats.cmp);
  ui.writes.textContent = compact.format(stats.writes);
  ui.ops.textContent = compact.format(stats.ops);
  ui.pct.textContent = `${Math.floor(pct)}%`;
  ui.bar.style.width = `${pct}%`;
  ui.laneFill.style.width = `${pct}%`;
  ui.laneRunner.style.left = `${pct}%`;
  ui.laneRunner.style.transform = `translate(-${pct}%, -50%)`;
  ui.lanePct.textContent = f.dnf ? 'DNF' : `${Math.floor(pct)}%`;
}

// ---------------------------------------------------------------- race loop

// Advance a fighter by up to `budget` ops. Returns true if it finished.
function step(f, budget) {
  const { gen, stats } = f;
  for (let k = 0; k < budget; k++) {
    const r = gen.next();
    if (r.done) {
      f.done = true;
      return true;
    }
    const op = r.value;
    stats.ops++;
    switch (op[0]) {
      case CMP:
        stats.cmp++;
        break;
      case SWAP:
        stats.writes += 2;
        markDirty(f, op[1]);
        markDirty(f, op[2]);
        break;
      case SET:
        stats.writes++;
        markDirty(f, op[1]);
        break;
      case READ:
        break;
    }
    if (f.recent.length >= RECENT) f.recent.shift();
    f.recent.push(op);
  }
  return false;
}

function contendersDone() {
  const serious = state.fighters.filter((f) => !f.algo.meme);
  return (serious.length ? serious : state.fighters).every((f) => f.done);
}

function tick() {
  if (state.phase !== 'racing') return;
  state.frame++;

  // Every running fighter gets the same budget per frame, so finishing in
  // fewer frames always means finishing in fewer ops. That keeps it fair.
  const t0 = performance.now();
  const budget = state.turbo ? state.turboBudget : opsPerFrame();
  const finished = [];
  for (const f of state.fighters) {
    if (f.done) continue;
    if (state.turbo && f.algo.meme && f.stats.ops >= MEME_CAP) continue;
    if (step(f, budget)) finished.push(f);
  }
  if (state.turbo) {
    const took = performance.now() - t0;
    if (took < 14) state.turboBudget = Math.min(8_000_000, state.turboBudget * 2);
    else if (took > 40) state.turboBudget = Math.max(2000, Math.floor(state.turboBudget / 2));
  }

  finished.sort((x, y) => x.stats.ops - y.stats.ops).forEach(crown);
  for (const f of state.fighters) render(f);
  if (state.frame % 3 === 0) blip();

  const memesStuck = state.turbo && state.fighters.every((f) => f.done || (f.algo.meme && f.stats.ops >= MEME_CAP));
  if (contendersDone() || memesStuck) {
    endRace();
    return;
  }
  state.raf = requestAnimationFrame(tick);
}

function crown(f) {
  f.place = ++state.finishCount;
  f.recent = [];
  f.card.classList.remove('running');
  f.card.classList.add('finished');
  if (f.place <= 3) f.card.classList.add(`place-${f.place}`);
  f.lane.classList.add('finished');
  f.ui.place.textContent = PLACES[f.place - 1] ?? `#${f.place}`;
  f.ui.stamp.textContent = f.place === 1 ? 'WINNER' : 'SORTED';
  if (f.place === 1) {
    toast(`${f.algo.emoji} ${f.algo.name} takes it!`);
    fanfare();
  } else {
    tone(880 - f.place * 60, 0.08, 0.05, 'triangle');
  }
}

async function startRace() {
  if (!state.fighters.length) {
    toast('Pick at least one fighter first 👆');
    return;
  }
  if (state.phase === 'paused') {
    setPhase('racing');
    tick();
    return;
  }
  if (state.phase === 'done') resetRace();
  if (state.phase !== 'idle') return;

  setPhase('countdown');
  const id = state.runId;
  el.countdown.hidden = false;
  const span = el.countdown.querySelector('span');
  for (const word of ['3', '2', '1', 'LOCK IN']) {
    if (id !== state.runId) return;
    span.textContent = word;
    span.className = word.length > 1 ? 'final' : '';
    span.style.animation = 'none';
    void span.offsetWidth; // restart the pop animation
    span.style.animation = '';
    tone(word.length > 1 ? 880 : 440, 0.12, 0.06, 'square');
    await sleep(word.length > 1 ? 520 : 620);
  }
  el.countdown.hidden = true;
  if (id !== state.runId) return;
  for (const f of state.fighters) f.card.classList.add('running');
  setPhase('racing');
  tick();
}

function pauseRace() {
  if (state.phase === 'racing') {
    cancelAnimationFrame(state.raf);
    setPhase('paused');
  } else if (state.phase === 'paused') {
    startRace();
  }
}

// Turbo to the finish line (still fair: equal budgets per frame).
function finishRace() {
  if (!state.fighters.length || state.phase === 'done' || state.phase === 'countdown') return;
  state.turbo = true;
  state.turboBudget = 20000;
  toast('⏭ Turbo mode: skipping to the finish');
  if (state.phase !== 'racing') {
    for (const f of state.fighters) if (!f.done) f.card.classList.add('running');
    setPhase('racing');
    tick();
  } else {
    updateControls();
  }
}

function stopRace() {
  state.runId++;
  cancelAnimationFrame(state.raf);
  el.countdown.hidden = true;
  state.turbo = false;
  state.finishCount = 0;
  state.frame = 0;
  setPhase('idle');
}

function resetRace() {
  stopRace();
  state.fighters.forEach(resetFighter);
}

function endRace() {
  cancelAnimationFrame(state.raf);
  state.turbo = false;
  for (const f of state.fighters) {
    if (!f.done) {
      f.dnf = true;
      f.recent = [];
      f.card.classList.remove('running');
      f.card.classList.add('dnf');
      f.lane.classList.add('dnf');
      f.ui.place.textContent = 'DNF';
      f.ui.stamp.textContent = 'DNF';
      render(f);
    }
  }
  setPhase('done');
  confetti();
  const id = state.runId;
  setTimeout(() => {
    if (id === state.runId && state.phase === 'done') showResults();
  }, 1100);
}

function setPhase(phase) {
  state.phase = phase;
  updateControls();
}

function updateControls() {
  const p = state.phase;
  el.phaseChip.dataset.phase = p;
  el.phaseChip.textContent = {
    idle: 'READY',
    countdown: 'GET READY',
    racing: state.turbo ? 'TURBO' : 'RACING',
    paused: 'PAUSED',
    done: 'FINISHED',
  }[p];
  el.startBtn.disabled = p === 'countdown' || p === 'racing';
  el.startBtn.textContent =
    p === 'paused' ? 'RESUME ▶' :
    p === 'done' ? 'REMATCH 🔒' :
    p === 'racing' ? 'SORTING…' :
    'LOCK IN 🔒';
  el.pauseBtn.disabled = !(p === 'racing' || p === 'paused') || state.turbo;
  el.pauseBtn.textContent = p === 'paused' ? '▶ Resume' : '⏸ Pause';
  el.skipBtn.disabled = p === 'done' || p === 'countdown' || state.turbo || !state.fighters.length;
  el.rosterCount.textContent = `${state.selected.size} / ${ALGORITHMS.length} selected`;
}

// ---------------------------------------------------------------- results

function showResults() {
  const n = state.initial.length;
  const ranked = [...state.fighters].sort((a, b) => {
    if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
    return a.dnf ? b.stats.ops - a.stats.ops : a.place - b.place;
  });
  const winner = ranked.find((f) => !f.dnf);
  const finishers = ranked.filter((f) => !f.dnf);
  const last = finishers[finishers.length - 1];
  const shuffleLabel = SHUFFLES.find((s) => s.id === state.shuffle).label.toLowerCase();

  el.resultsTitle.textContent = winner ? `${winner.algo.emoji} ${winner.algo.name} wins` : 'Nobody finished 💀';
  el.resultsSub.textContent = winner && last && last !== winner && winner.stats.ops > 0
    ? `${full.format(n)} pieces · ${shuffleLabel} scramble · ${(last.stats.ops / winner.stats.ops).toFixed(1)}× fewer ops than ${last.algo.name}`
    : `${full.format(n)} pieces · ${shuffleLabel} scramble`;

  el.resultsBody.textContent = '';
  const timeCells = [];
  for (const f of ranked) {
    const tr = document.createElement('tr');
    if (f.place === 1) tr.className = 'winner';
    if (f.dnf) tr.className = 'dnf';
    const place = f.dnf ? 'DNF' : PLACES[f.place - 1] ?? f.place;
    tr.innerHTML = `
      <td>${place}</td>
      <td>${f.algo.emoji} ${f.algo.name}</td>
      <td>${full.format(f.stats.cmp)}</td>
      <td>${full.format(f.stats.writes)}</td>
      <td>${full.format(f.stats.ops)}</td>
      <td>${f.dnf ? '—' : '…'}</td>`;
    el.resultsBody.append(tr);
    if (!f.dnf) timeCells.push([f, tr.lastElementChild]);
  }
  el.resultsDlg.showModal();
  benchmarkAll(timeCells, state.runId);
}

// Real CPU time with no rendering, one fighter at a time so the UI stays responsive.
async function benchmarkAll(cells, id) {
  const times = [];
  for (const [f, td] of cells) {
    await sleep(30);
    if (id !== state.runId || !el.resultsDlg.open) return;
    let total = 0;
    let reps = 0;
    while (reps < 7 && total < 200) {
      const a = state.initial.slice();
      const t0 = performance.now();
      for (const _ of f.algo.run(a));
      total += performance.now() - t0;
      reps++;
    }
    const ms = total / reps;
    times.push([ms, td]);
    td.textContent = ms < 10 ? ms.toFixed(2) : ms.toFixed(1);
  }
  if (times.length > 1) {
    const [, best] = times.reduce((a, b) => (b[0] < a[0] ? b : a));
    best.innerHTML = `<span class="best">${best.textContent} ⚡</span>`;
  }
}

// ---------------------------------------------------------------- sound

let audio = null;

function tone(freq, dur = 0.05, vol = 0.03, type = 'square', delay = 0) {
  if (!state.sound) return;
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    // audio unavailable
  }
}

let blipCursor = 0;
function blip() {
  if (!state.sound) return;
  const running = state.fighters.filter((f) => !f.done && f.recent.length);
  if (!running.length) return;
  const f = running[blipCursor++ % running.length];
  const op = f.recent[f.recent.length - 1];
  const v = f.a[op[1]] / Math.max(1, f.a.length - 1);
  tone(180 + v * 900, 0.04, 0.02, 'square');
}

function fanfare() {
  [523, 659, 784, 1047].forEach((fq, i) => tone(fq, 0.18, 0.05, 'triangle', i * 0.09));
}

// ---------------------------------------------------------------- confetti

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = el.confetti;
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ['#c6ff3d', '#3df2ff', '#ff3d8b', '#ffd23d', '#b18cff'];
  const bits = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 14 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    s: 5 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const frame = (now) => {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = Math.max(0, 1 - t / 2600);
    for (const b of bits) {
      b.vy += 0.35;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      ctx.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- toast

let toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
}

// ---------------------------------------------------------------- UI wiring

function buildSeg(container, items, current, onPick) {
  container.textContent = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    b.dataset.id = item.id;
    b.setAttribute('aria-pressed', String(item.id === current));
    b.addEventListener('click', () => {
      for (const other of container.children) other.setAttribute('aria-pressed', String(other === b));
      onPick(item.id);
    });
    container.append(b);
  }
}

function buildRoster() {
  el.roster.textContent = '';
  for (const algo of ALGORITHMS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--accent', algo.color);
    b.title = algo.blurb;
    b.setAttribute('aria-pressed', String(state.selected.has(algo.id)));
    b.innerHTML = `<span>${algo.emoji}</span>${algo.name}${algo.meme ? '<span class="meme-tag">MEME</span>' : ''}`;
    b.addEventListener('click', () => {
      if (state.selected.has(algo.id)) state.selected.delete(algo.id);
      else state.selected.add(algo.id);
      b.setAttribute('aria-pressed', String(state.selected.has(algo.id)));
      savePrefs();
      rebuild();
    });
    el.roster.append(b);
  }
}

function buildSamples() {
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = s.id;
    b.title = s.name;
    b.setAttribute('aria-label', `Sample image: ${s.name}`);
    b.append(makeSample(s, 160, 120));
    b.addEventListener('click', () => useSample(s.id));
    el.samples.append(b);
  }
}

function newScramble() {
  state.seed = newSeed();
  rebuild();
  toast('🎲 Fresh scramble');
}

function updateSpeedLabel() {
  el.speedLabel.textContent = full.format(opsPerFrame());
}

function updateSoundBtn() {
  el.soundBtn.textContent = state.sound ? '🔊' : '🔇';
  el.soundBtn.setAttribute('aria-pressed', String(state.sound));
}

function wire() {
  el.dropzone.addEventListener('click', () => el.fileInput.click());
  el.uploadBtn.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', () => {
    loadFile(el.fileInput.files[0]);
    el.fileInput.value = '';
  });
  el.webcamBtn.addEventListener('click', openWebcam);
  el.webcamDlg.addEventListener('close', () => closeWebcam(el.webcamDlg.returnValue === 'snap'));

  buildSeg(el.gridSeg, GRIDS, state.grid.id, (id) => {
    state.grid = GRIDS.find((g) => g.id === id);
    savePrefs();
    rebuild();
  });
  buildSeg(el.shuffleSeg, SHUFFLES, state.shuffle, (id) => {
    state.shuffle = id;
    savePrefs();
    rebuild();
  });
  el.reshuffleBtn.addEventListener('click', newScramble);

  el.speed.addEventListener('input', () => {
    updateSpeedLabel();
    savePrefs();
  });

  el.startBtn.addEventListener('click', startRace);
  el.pauseBtn.addEventListener('click', pauseRace);
  el.skipBtn.addEventListener('click', finishRace);
  el.resetBtn.addEventListener('click', resetRace);

  el.soundBtn.addEventListener('click', () => {
    state.sound = !state.sound;
    updateSoundBtn();
    savePrefs();
    if (state.sound) tone(660, 0.08, 0.05, 'triangle');
  });
  el.helpBtn.addEventListener('click', () => el.helpDlg.showModal());

  el.resultsDlg.addEventListener('close', () => {
    const v = el.resultsDlg.returnValue;
    el.resultsDlg.returnValue = '';
    if (v === 'rematch') {
      resetRace();
      startRace();
    } else if (v === 'scramble') {
      newScramble();
    }
  });

  // drag & drop anywhere
  let dragDepth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    dragDepth++;
    el.dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) el.dropOverlay.hidden = true;
  });
  window.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    el.dropOverlay.hidden = true;
    loadFile(e.dataTransfer.files[0]);
  });

  window.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile());
  });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    const key = e.key.toLowerCase();
    if (key === ' ') {
      e.preventDefault();
      document.activeElement?.blur?.(); // stop the focused button from also clicking
      if (state.phase === 'racing' || state.phase === 'paused') pauseRace();
      else startRace();
    } else if (key === 'f') finishRace();
    else if (key === 'r') resetRace();
    else if (key === 'n') newScramble();
    else if (key === 'm') el.soundBtn.click();
    else if (key === '?') el.helpDlg.showModal();
  });
}

// ---------------------------------------------------------------- boot

async function boot() {
  wire();
  buildRoster();
  updateSpeedLabel();
  updateSoundBtn();
  // wait (briefly) for web fonts so the "Locked in" sample renders in the right font
  await Promise.race([document.fonts?.ready, sleep(1200)]);
  buildSamples();
  useSample('synthwave');
}

boot();
