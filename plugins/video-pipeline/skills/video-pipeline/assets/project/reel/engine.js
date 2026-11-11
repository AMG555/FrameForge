/**
 * engine.js — FrameForge HTML Compositor Runtime
 *
 * Every visual style is a pure function of t (seconds).
 * No CSS transitions, no setTimeout, no mutable frame state.
 *
 * IRON RULE — the determinism contract:
 *   ✅ Use hash(i) for anything that must be reproducible across frames.
 *   ✅ Read time from t / lt / dur — never from performance.now() or Date.now().
 *   ❌ NEVER call Math.random() — breaks parallel frame workers.
 *   ❌ NEVER use setTimeout / setInterval — Playwright virtualises the clock.
 *   ❌ NEVER integrate physics per-tick — precompute or use closed-form math.
 *   ❌ NEVER store frame state in module-level mutable counters inside a layer fn.
 *
 * Usage in edit.js:
 *   import { reel, layer, text, wallCard, at, stagger, captions, faceAt, hash } from './reel/engine.js';
 *   reel({ width: 1920, height: 1080, fps: 30, duration: 65 });
 *   // fn(t, lt, dur): t = video time, lt = time inside this shot, dur = shot length
 *   layer('title', { start: 0, end: 5 }).on((t, lt, dur) => ({
 *     opacity: lt < 0.4 ? lt / 0.4 : lt > dur - 0.4 ? (dur - lt) / 0.4 : 1,
 *   }));
 */

// ── Global reel state ─────────────────────────────────────────────────────────

export const REEL = {
  width:    1920,
  height:   1080,
  fps:      30,
  duration: 60,
  title:    '',
  captionY: null,   // override caption baseline (px from top)
};

/** Configure the compositor. Call once at the top of edit.js. */
export function reel({ width = 1920, height = 1080, fps = 30, duration = 60, title = '' } = {}) {
  REEL.width    = width;
  REEL.height   = height;
  REEL.fps      = fps;
  REEL.duration = duration;
  REEL.title    = title;
  // Expose for render.mjs virtual-clock handshake
  window.DURATION = duration;
  window.FPS      = fps;
}

// ── Layer registry ────────────────────────────────────────────────────────────

const _layers      = [];   // { name, el, compute }
const _atElements  = [];   // { t, el, duration }
const _captionPath = null; // set by captions()
let   _captionData = null; // loaded JSON

class Layer {
  /**
   * @param {string} name
   * @param {{ start?: number, end?: number }} opts
   *   start  time (s) when this shot begins (default 0 = whole film)
   *   end    time (s) when this shot ends   (default REEL.duration)
   */
  constructor(name, opts = {}) {
    this.name  = name;
    this.start = opts.start ?? 0;
    this.end   = opts.end   ?? null;   // null = REEL.duration (resolved at tick time)
    this.el    = document.createElement('div');
    this.el.dataset.layer = name;
    document.getElementById('stage').appendChild(this.el);
    _layers.push(this);
  }

  /**
   * Register per-frame compute function.
   * fn(t, lt, dur) → style object
   *   t   = absolute video time (seconds)
   *   lt  = local time inside this shot  (t - start)
   *   dur = shot duration                (end - start)
   */
  on(fn) {
    this._compute = fn;
    return this;
  }

  _tick(t) {
    if (!this._compute) return;
    const end  = this.end ?? REEL.duration;
    const dur  = end - this.start;
    const lt   = t - this.start;
    const styles = this._compute(t, lt, dur);
    if (!styles) return;
    Object.assign(this.el.style, _stylesToCSS(styles));
  }
}

/**
 * Declare a named layer.
 * @param {string} name
 * @param {{ start?: number, end?: number }} opts  Shot window (optional)
 * @returns {Layer}
 */
export function layer(name, opts = {}) {
  const existing = _layers.find(l => l.name === name);
  if (existing) return existing;
  return new Layer(name, opts);
}

// ── at() / stagger() — timed element placement ───────────────────────────────

/**
 * Place an element at time t. The element is removed after `duration` seconds.
 * @param {number} t         Start time in seconds
 * @param {HTMLElement} el   Element to mount
 */
export function at(t, el) {
  if (!el || !(el instanceof HTMLElement)) return;
  document.getElementById('stage').appendChild(el);
  el.style.display = 'none';
  _atElements.push({ t, el, duration: el._duration ?? Infinity });
}

/**
 * Place elements with a stagger offset.
 * @param {number} t          Start time for first element
 * @param {number} dt         Delay between each element (seconds)
 * @param {HTMLElement[]} els Elements to mount
 * @returns {{ t: number, element: HTMLElement }[]} timing entries (useful in tests)
 */
export function stagger(t, dt, els) {
  const result = [];
  els.forEach((el, i) => {
    const ti = t + i * dt;
    result.push({ t: ti, element: el });
    if (el instanceof HTMLElement) at(ti, el);
  });
  return result;
}

// ── seek(t) — the clock interface ─────────────────────────────────────────────

/**
 * Advance the compositor to time t (seconds).
 * Called by render.mjs for every frame.
 */
export function seek(t) {
  // Tick all layers
  for (const l of _layers) l._tick(t);

  // Show/hide timed elements
  for (const entry of _atElements) {
    const visible = t >= entry.t && t < entry.t + entry.duration;
    entry.el.style.display = visible ? '' : 'none';
    if (visible && entry.el._seekFn) entry.el._seekFn(t - entry.t);
  }

  // Live captions
  if (_captionData) _tickCaptions(t);
}

// Expose globally for the virtual-clock renderer.
// Also set window.__seek and window.renderFrame so that the virtual-clock
// shim (injected as an initScript before the module loads) delegates to the
// engine's seek() regardless of which alias the render script calls.
window.seek       = seek;
window.__seek     = (t) => seek(t);   // render.mjs calls __seek(t)
window.renderFrame = (t) => seek(t);  // virtual-clock.js's seek() calls renderFrame

// ── Math utilities ────────────────────────────────────────────────────────────

/**
 * hash(i) — Deterministic pseudo-random number in [0, 1) for index i.
 *
 * Use this INSTEAD OF Math.random() for anything that must stay reproducible
 * across parallel frame workers (star positions, brush seeds, particle jitter).
 *
 * For "boil" wobble (hand-drawn animation feel), reseed 12 times per second:
 *   const wobble = hash(i + Math.floor(t * 12));
 *
 * Determinism law: seed all stochastic operations.
 *
 * @param {number} i   Integer seed (particle index, frame seed, etc.)
 * @returns {number}   Deterministic float in [0, 1)
 */
export function hash(i) {
  let x = Math.sin(i + 1) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * hash2(i, j) — Two-dimensional hash for (col, row) grid seeds, etc.
 * @returns {number} Deterministic float in [0, 1)
 */
export function hash2(i, j) {
  return hash(i * 1000 + j);
}

/** Linear interpolation from a to b over [t0, t1], clamped at boundaries. */
export function lerp(t, a, b, t0 = 0, t1 = 1) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  const p = (t - t0) / (t1 - t0);
  return a + (b - a) * p;
}

/** Ease-in (quadratic). Input 0–1, output 0–1. */
export function easeIn(t) {
  const p = Math.max(0, Math.min(1, t));
  return p * p;
}

/** Ease-out (quadratic). Input 0–1, output 0–1. */
export function easeOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return 1 - (1 - p) * (1 - p);
}

/** Ease-in-out (quadratic). Input 0–1, output 0–1. */
export function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

/**
 * Spring physics. Returns value 0→1 (may briefly exceed 1 when underdamped).
 * @param {number} t                    Current time in seconds
 * @param {{ tension, friction, delay }} opts
 */
export function spring(t, { tension = 200, friction = 22, delay = 0 } = {}) {
  const dt = t - delay;
  if (dt <= 0) return 0;
  const omega = Math.sqrt(tension);
  const zeta  = friction / (2 * omega);

  if (zeta >= 1) {
    // Overdamped or critically damped — no overshoot
    const r1 = -omega * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -omega * (zeta + Math.sqrt(zeta * zeta - 1));
    const c2 = r1 / (r1 - r2);
    const c1 = 1 - c2;
    return 1 - c1 * Math.exp(r1 * dt) - c2 * Math.exp(r2 * dt);
  }

  // Underdamped — oscillates toward 1
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * dt) * (
    Math.cos(omegaD * dt) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * dt)
  );
}

/**
 * measureSpring() — Calculates analytical settling time for a spring configuration.
 * Derived from Remotion's measureSpring.
 *
 * @param {{ tension?: number, friction?: number, threshold?: number }} [opts]
 * @returns {number} Settling duration in seconds
 */
export function measureSpring({ tension = 200, friction = 22, threshold = 0.001 } = {}) {
  const omega = Math.sqrt(tension);
  const zeta  = friction / (2 * omega);
  if (zeta < 1) {
    return -Math.log(threshold) / (zeta * omega);
  } else {
    const r1 = -omega * (zeta - Math.sqrt(zeta * zeta - 1));
    return -Math.log(threshold) / Math.abs(r1);
  }
}

/**
 * interpolate() — Multi-range value mapping with clamp and easing options.
 * Drop-in Remotion-compatible interpolation interface.
 *
 * @param {number} val
 * @param {number[]} inputRange
 * @param {number[]} outputRange
 * @param {object} [opts]
 * @param {'clamp'|'identity'|'extend'} [opts.extrapolateLeft='clamp']
 * @param {'clamp'|'identity'|'extend'} [opts.extrapolateRight='clamp']
 * @param {function} [opts.easing]
 * @returns {number}
 */
export function interpolate(val, inputRange, outputRange, opts = {}) {
  const {
    extrapolateLeft = 'clamp',
    extrapolateRight = 'clamp',
    easing = (x) => x,
  } = opts;

  if (!inputRange || !outputRange || inputRange.length < 2 || inputRange.length !== outputRange.length) {
    throw new Error('interpolate: inputRange and outputRange must have the same length >= 2');
  }

  if (val <= inputRange[0]) {
    if (extrapolateLeft === 'clamp') return outputRange[0];
    if (extrapolateLeft === 'identity') return val;
  }

  if (val >= inputRange[inputRange.length - 1]) {
    if (extrapolateRight === 'clamp') return outputRange[outputRange.length - 1];
    if (extrapolateRight === 'identity') return val;
  }

  for (let i = 1; i < inputRange.length; i++) {
    if (val <= inputRange[i]) {
      const t0 = inputRange[i - 1];
      const t1 = inputRange[i];
      const v0 = outputRange[i - 1];
      const v1 = outputRange[i];
      const p = (val - t0) / (t1 - t0);
      return v0 + (v1 - v0) * easing(p);
    }
  }

  return outputRange[outputRange.length - 1];
}

/**
 * sequence() — Temporal windowing wrapper for isolated layer computations.
 * Maps local relative time `tRel = t - from` to children styles.
 *
 * @param {number} from - Start time in seconds
 * @param {number} duration - Window duration in seconds
 * @param {function} fn - (relTime, duration, absTime) => styleObject
 */
export function sequence(from, duration, fn) {
  return (t) => {
    if (t < from || t >= from + duration) return null;
    return fn(t - from, duration, t);
  };
}

/**
 * Easing dictionary matching standard Remotion & CSS curves.
 */
export const Easing = {
  linear: (t) => t,
  in: easeIn,
  out: easeOut,
  inOut: easeInOut,
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  bezier: (mX1, mY1, mX2, mY2) => {
    return (t) => {
      const u = 1 - t;
      return 3 * u * u * t * mY1 + 3 * u * t * t * mY2 + t * t * t;
    };
  },
};

// ── Remotion-compatible Color Interpolation ───────────────────────────────────

function _parseColor(str) {
  if (typeof str !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  str = str.trim().toLowerCase();
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * interpolateColors() — Perceptually uniform gamma-corrected color interpolation.
 * Drop-in Remotion-compatible interpolateColors.
 *
 * @param {number} val
 * @param {number[]} inputRange
 * @param {string[]} outputColors
 * @param {object} [opts]
 * @param {'clamp'|'identity'} [opts.extrapolateLeft='clamp']
 * @param {'clamp'|'identity'} [opts.extrapolateRight='clamp']
 * @param {function} [opts.easing]
 * @param {number} [opts.gamma=2.2]
 * @returns {string} Hex color (#rrggbb) or rgba(...)
 */
export function interpolateColors(val, inputRange, outputColors, opts = {}) {
  const { extrapolateLeft = 'clamp', extrapolateRight = 'clamp', easing = (x) => x, gamma = 2.2 } = opts;
  if (!inputRange || !outputColors || inputRange.length < 2 || inputRange.length !== outputColors.length) {
    throw new Error('interpolateColors: inputRange and outputColors must have same length >= 2');
  }

  const parsed = outputColors.map(_parseColor);

  let p = 0;
  let c0 = parsed[0];
  let c1 = parsed[1];

  if (val <= inputRange[0]) {
    if (extrapolateLeft === 'clamp') return outputColors[0];
    p = 0;
    c0 = parsed[0];
    c1 = parsed[1];
  } else if (val >= inputRange[inputRange.length - 1]) {
    if (extrapolateRight === 'clamp') return outputColors[outputColors.length - 1];
    p = 1;
    c0 = parsed[parsed.length - 2];
    c1 = parsed[parsed.length - 1];
  } else {
    for (let i = 1; i < inputRange.length; i++) {
      if (val <= inputRange[i]) {
        const t0 = inputRange[i - 1];
        const t1 = inputRange[i];
        c0 = parsed[i - 1];
        c1 = parsed[i];
        p = (val - t0) / (t1 - t0);
        break;
      }
    }
  }

  const ep = Math.max(0, Math.min(1, easing(p)));
  const r0 = Math.pow(c0.r / 255, gamma);
  const g0 = Math.pow(c0.g / 255, gamma);
  const b0 = Math.pow(c0.b / 255, gamma);
  const r1 = Math.pow(c1.r / 255, gamma);
  const g1 = Math.pow(c1.g / 255, gamma);
  const b1 = Math.pow(c1.b / 255, gamma);

  const r = Math.round(Math.pow(r0 + (r1 - r0) * ep, 1 / gamma) * 255);
  const g = Math.round(Math.pow(g0 + (g1 - g0) * ep, 1 / gamma) * 255);
  const b = Math.round(Math.pow(b0 + (b1 - b0) * ep, 1 / gamma) * 255);
  const a = Math.round((c0.a + (c1.a - c0.a) * ep) * 1000) / 1000;

  if (a >= 0.999) {
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ── Remotion-compatible Deterministic Noise (@remotion/noise) ───────────────────

function _createNoisePrng(seed) {
  let s = 0;
  if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      s = (s * 31 + seed.charCodeAt(i)) | 0;
    }
  } else {
    s = (seed || 0) | 0;
  }
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _noisePermCache = new Map();
function _getPermutationTable(seed) {
  const seedKey = String(seed);
  if (_noisePermCache.has(seedKey)) return _noisePermCache.get(seedKey);
  const prng = _createNoisePrng(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  _noisePermCache.set(seedKey, perm);
  return perm;
}

const _F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const _G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

/**
 * noise2D() — Deterministic 2D Simplex noise in range [-1, 1].
 * Compatible with @remotion/noise.
 *
 * @param {string|number} seed
 * @param {number} x
 * @param {number} y
 * @returns {number} Float in range [-1, 1]
 */
export function noise2D(seed, x, y) {
  const perm = _getPermutationTable(seed);
  let n0, n1, n2;
  const s = (x + y) * _F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * _G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;

  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; }
  else { i1 = 0; j1 = 1; }

  const x1 = x0 - i1 + _G2;
  const y1 = y0 - j1 + _G2;
  const x2 = x0 - 1.0 + 2.0 * _G2;
  const y2 = y0 - 1.0 + 2.0 * _G2;

  const ii = i & 255;
  const jj = j & 255;

  const grad = (hash, gx, gy) => {
    const h = hash & 7;
    const u = h < 4 ? gx : gy;
    const v = h < 4 ? gy : gx;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  };

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 < 0) n0 = 0.0;
  else {
    t0 *= t0;
    n0 = t0 * t0 * grad(perm[ii + perm[jj]], x0, y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 < 0) n1 = 0.0;
  else {
    t1 *= t1;
    n1 = t1 * t1 * grad(perm[ii + i1 + perm[jj + j1]], x1, y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 < 0) n2 = 0.0;
  else {
    t2 *= t2;
    n2 = t2 * t2 * grad(perm[ii + 1 + perm[jj + 1]], x2, y2);
  }

  return 70.0 * (n0 + n1 + n2);
}

function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _grad3(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

/**
 * noise3D() — Deterministic 3D Perlin noise in range [-1, 1].
 * Compatible with @remotion/noise.
 *
 * @param {string|number} seed
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number} Float in range [-1, 1]
 */
export function noise3D(seed, x, y, z) {
  const perm = _getPermutationTable(seed);
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = _fade(x);
  const v = _fade(y);
  const w = _fade(z);

  const A = perm[X] + Y;
  const AA = perm[A] + Z;
  const AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y;
  const BA = perm[B] + Z;
  const BB = perm[B + 1] + Z;

  const lerp = (t, a, b) => a + t * (b - a);

  return lerp(w,
    lerp(v,
      lerp(u, _grad3(perm[AA], x, y, z), _grad3(perm[BA], x - 1, y, z)),
      lerp(u, _grad3(perm[AB], x, y - 1, z), _grad3(perm[BB], x - 1, y - 1, z))
    ),
    lerp(v,
      lerp(u, _grad3(perm[AA + 1], x, y, z - 1), _grad3(perm[BA + 1], x - 1, y, z - 1)),
      lerp(u, _grad3(perm[AB + 1], x, y - 1, z - 1), _grad3(perm[BB + 1], x - 1, y - 1, z - 1))
    )
  );
}

// ── Remotion-compatible SVG Path Animation (@remotion/paths) ───────────────────

/**
 * evolvePath() — Generates SVG stroke-dasharray and stroke-dashoffset for path reveal.
 * Compatible with @remotion/paths evolvePath.
 *
 * @param {number} progress Float 0..1
 * @param {number} pathLength Total length of SVG path
 * @returns {{ strokeDasharray: string, strokeDashoffset: string }}
 */
export function evolvePath(progress, pathLength) {
  const p = Math.max(0, Math.min(1, progress));
  const len = Math.max(0, pathLength);
  return {
    strokeDasharray: `${len} ${len}`,
    strokeDashoffset: `${(1 - p) * len}`,
  };
}

// ── Remotion-compatible Transition Presets (@remotion/transitions) ─────────────

/**
 * transition — Pure functional CSS style generators for scene/shot transitions.
 * Equivalent to @remotion/transitions presentations.
 */
export const transition = {
  fade: (p) => ({ opacity: Math.max(0, Math.min(1, p)) }),
  slide: (p, { direction = 'from-left' } = {}) => {
    const cp = Math.max(0, Math.min(1, p));
    const inv = (1 - cp) * 100;
    switch (direction) {
      case 'from-right':  return { transform: `translateX(${inv}%)` };
      case 'from-top':    return { transform: `translateY(${-inv}%)` };
      case 'from-bottom': return { transform: `translateY(${inv}%)` };
      case 'from-left':
      default:            return { transform: `translateX(${-inv}%)` };
    }
  },
  wipe: (p, { direction = 'from-left' } = {}) => {
    const cp = Math.max(0, Math.min(1, p));
    const inv = (1 - cp) * 100;
    switch (direction) {
      case 'from-right':  return { clipPath: `inset(0 0 0 ${inv}%)` };
      case 'from-top':    return { clipPath: `inset(0 0 ${inv}% 0)` };
      case 'from-bottom': return { clipPath: `inset(${inv}% 0 0 0)` };
      case 'from-left':
      default:            return { clipPath: `inset(0 ${inv}% 0 0)` };
    }
  },
  flip: (p, { axis = 'y' } = {}) => {
    const cp = Math.max(0, Math.min(1, p));
    const deg = (1 - cp) * 90;
    const t = axis === 'x' ? `perspective(1200px) rotateX(${deg}deg)` : `perspective(1200px) rotateY(${deg}deg)`;
    return { transform: t, opacity: cp > 0.05 ? 1 : 0 };
  },
  zoom: (p, { from = 0.8, to = 1.0 } = {}) => {
    const cp = Math.max(0, Math.min(1, p));
    const s = from + (to - from) * cp;
    return { transform: `scale(${s})`, opacity: cp };
  }
};

/**
 * absoluteFill() — Layout helper matching Remotion's <AbsoluteFill>.
 *
 * @param {object} [extra] Additional CSS styles
 * @returns {object} Style object for absolute full-screen canvas positioning
 */
export function absoluteFill(extra = {}) {
  return {
    position: 'absolute',
    top: '0px',
    left: '0px',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    ...extra,
  };
}

/**
 * loopTime() — Loops local time within [0, duration) for repeating motions.
 * Equivalent to Remotion's <Loop>.
 *
 * @param {number} t
 * @param {number} duration
 * @returns {number} Local loop time
 */
export function loopTime(t, duration) {
  if (duration <= 0) return 0;
  return ((t % duration) + duration) % duration;
}

/**
 * loadGoogleFont() — Deterministic Google Fonts loader using delayRender barrier.
 * Equivalent to @remotion/google-fonts.
 *
 * @param {string} fontFamily
 * @param {{ weights?: number[], display?: string }} [opts]
 * @returns {Promise<void>}
 */
export async function loadGoogleFont(fontFamily, { weights = [400, 700], display = 'swap' } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const id = typeof window.delayRender === 'function' ? window.delayRender(`font-${fontFamily}`) : null;
  try {
    const formattedFamily = fontFamily.replace(/\s+/g, '+');
    const weightsStr = weights.join(';');
    const href = `https://fonts.googleapis.com/css2?family=${formattedFamily}:wght@${weightsStr}&display=${display}`;

    if (!document.querySelector(`link[href*="${formattedFamily}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    if (document.fonts && typeof document.fonts.load === 'function') {
      const promises = weights.map(w => document.fonts.load(`${w} 16px "${fontFamily}"`));
      await Promise.all(promises);
      await document.fonts.ready;
    }
  } catch (err) {
    console.warn(`[loadGoogleFont] Failed loading font ${fontFamily}:`, err);
  } finally {
    if (id !== null && typeof window.continueRender === 'function') {
      window.continueRender(id);
    }
  }
}

let _BOILN = 0;

/**
 * boilSeed(key, [t]) — Deterministic pseudo-random seed generator for linework boil.
 *
 * Boil holds drawing for 2 frames (12 fps), but moving elements consume randomness,
 * shifting random streams for later elements. boilSeed restarts stream from BOILN + key
 * so still elements never jitter.
 *
 * @param {string} key  Unique stable name of element (e.g. 'bg', 'character', 'prop')
 * @param {number} [t]  Current time (optional, updates internal BOILN = floor(t * 12))
 * @returns {number} Deterministic float in [0, 1)
 */
export function boilSeed(key = 'frame', t = null) {
  if (t !== null && typeof t === 'number') {
    _BOILN = Math.floor(t * 12);
  }
  let h = 2166136261;
  const str = `${key}|${_BOILN}`;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Step time on twos (12 fps hold step) */
export function onTwos(t) {
  return Math.floor(t * 12 + 1e-6) / 12;
}

/** Segment normalization: clamps (t - a) / (b - a) in [0, 1] */
export function seg(t, a, b) {
  if (b === a) return 0;
  return Math.max(0, Math.min(1, (t - a) / (b - a)));
}

/** Exponential beat pulse */
export function pulse(t, k = 6) {
  const frac = t - Math.floor(t);
  return Math.exp(-frac * k);
}

/**
 * Keyframes with closed-form interpolation (scalar numbers or arrays).
 * @param {number} t
 * @param {Array<[number, number|number[]]>} keys  e.g. [[0, 0], [1, 100], [2, 50]]
 * @param {function} [e=easeInOut] Easing function
 */
export function kf(t, keys, e = easeInOut) {
  if (!keys || keys.length === 0) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1];
      const [b, vb] = keys[i];
      const prog = (t - a) / (b - a);
      const k = e(Math.max(0, Math.min(1, prog)));
      if (Array.isArray(va) && Array.isArray(vb)) {
        return va.map((v, idx) => v + ((vb[idx] ?? v) - v) * k);
      }
      return va + (vb - va) * k;
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * Register sequential timeline shots: [[t0, fn0], [t1, fn1], ...]
 * Each fn(t, lt, dur) paints the frame when t is in its window.
 */
export function shots(shotList = []) {
  for (let i = 0; i < shotList.length; i++) {
    const [start, fn] = shotList[i];
    const end = i + 1 < shotList.length ? shotList[i + 1][0] : REEL.duration;
    layer(`shot_${i}`, { start, end }).on(fn);
  }
}

// ── Component builders ────────────────────────────────────────────────────────

/**
 * Plain animated text element.
 * @param {string} str
 * @param {{ font, color, x, y, size, weight, align, opacity, duration }} opts
 */
export function text(str, {
  font     = '48px/1.3 "Nirmala UI", "Noto Sans Malayalam", "Malayalam Sangam MN", "Kartika", system-ui, sans-serif',
  color    = '#ffffff',
  x        = 'center',
  y        = 100,
  size     = null,
  weight   = null,
  align    = 'center',
  opacity  = 1,
  duration = Infinity,
} = {}) {
  const el = document.createElement('div');
  el._duration = duration;
  el.textContent = str;

  const fontSize = size ? `${size}px` : font.split('/')[0].trim();
  const fontFam  = font.includes(' ') ? font : `${fontSize} system-ui`;

  Object.assign(el.style, {
    position:   'absolute',
    font:       fontFam,
    fontSize:   size ? `${size}px` : undefined,
    fontWeight: weight ? String(weight) : undefined,
    color,
    textAlign:  align,
    opacity:    String(opacity),
    whiteSpace: 'pre-line',
    maxWidth:   '90%',
    lineHeight: '1.3',
  });

  _positionEl(el, x, y);
  return el;
}

/**
 * Pill-shaped chip / label.
 * @param {string} str
 * @param {{ color, bg, x, y, size, duration }} opts
 */
export function chip(str, {
  color    = '#ffffff',
  bg       = 'rgba(59,130,246,0.85)',
  x        = 'center',
  y        = 80,
  size     = 20,
  duration = Infinity,
} = {}) {
  const el = document.createElement('div');
  el._duration = duration;
  el.textContent = str;
  Object.assign(el.style, {
    position:     'absolute',
    display:      'inline-block',
    padding:      '6px 18px',
    borderRadius: '9999px',
    background:   bg,
    color,
    fontSize:     `${size}px`,
    fontWeight:   '600',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  });
  _positionEl(el, x, y);
  return el;
}

/**
 * Frosted-glass card with stacked text lines.
 * @param {{ text, size, weight, color }[]} lines
 * @param {{ x, y, width, duration, bg, blur, radius, padding }} opts
 */
export function wallCard(lines = [], {
  x        = 'center',
  y        = REEL.height * 0.72,
  width    = Math.round(REEL.width * 0.84),
  duration = Infinity,
  bg       = 'rgba(0,0,0,0.62)',
  blur     = 12,
  radius   = 16,
  padding  = 28,
} = {}) {
  const el = document.createElement('div');
  el._duration = duration;
  Object.assign(el.style, {
    position:       'absolute',
    width:          `${width}px`,
    backdropFilter: `blur(${blur}px)`,
    background:     bg,
    borderRadius:   `${radius}px`,
    padding:        `${padding}px ${padding + 8}px`,
    boxSizing:      'border-box',
    display:        'flex',
    flexDirection:  'column',
    gap:            '8px',
  });

  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line.text || '';
    Object.assign(p.style, {
      margin:     0,
      fontSize:   `${line.size || 24}px`,
      fontWeight: String(line.weight || 400),
      color:      line.color || '#ffffff',
      lineHeight: '1.4',
    });
    el.appendChild(p);
  }

  _positionEl(el, x, y);
  return el;
}

/**
 * Image with optional caption overlay.
 * @param {string} src   URL or relative path
 * @param {{ x, y, width, height, caption, radius, duration }} opts
 */
export function imageCard(src, {
  x        = 'center',
  y        = 'center',
  width    = 640,
  height   = 360,
  caption  = '',
  radius   = 12,
  duration = Infinity,
} = {}) {
  const el = document.createElement('div');
  el._duration = duration;
  Object.assign(el.style, {
    position:     'absolute',
    width:        `${width}px`,
    height:       `${height}px`,
    borderRadius: `${radius}px`,
    overflow:     'hidden',
    display:      'flex',
    flexDirection:'column',
  });

  const img = document.createElement('img');
  img.src = src;
  Object.assign(img.style, { width: '100%', height: caption ? 'calc(100% - 40px)' : '100%', objectFit: 'cover', display: 'block' });
  el.appendChild(img);

  if (caption) {
    const cap = document.createElement('div');
    cap.textContent = caption;
    Object.assign(cap.style, {
      background: 'rgba(0,0,0,0.7)', color: '#fff',
      fontSize: '18px', padding: '8px 12px', textAlign: 'center',
    });
    el.appendChild(cap);
  }

  _positionEl(el, x, y);
  return el;
}

/**
 * Animated terminal block.
 * @param {string[]} lines
 * @param {{ x, y, width, duration, bg, color }} opts
 */
export function terminal(lines = [], {
  x        = 100,
  y        = 'center',
  width    = 720,
  duration = Infinity,
  bg       = 'rgba(0,0,0,0.88)',
  color    = '#22c55e',
} = {}) {
  const el = document.createElement('div');
  el._duration = duration;
  Object.assign(el.style, {
    position:     'absolute',
    width:        `${width}px`,
    background:   bg,
    borderRadius: '10px',
    padding:      '20px 24px',
    fontFamily:   '"Fira Code", "Cascadia Code", monospace',
    fontSize:     '18px',
    lineHeight:   '1.7',
    color,
    boxSizing:    'border-box',
  });

  // Bar
  const bar = document.createElement('div');
  Object.assign(bar.style, { display: 'flex', gap: '8px', marginBottom: '14px' });
  for (const c of ['#ef4444', '#f59e0b', '#22c55e']) {
    const dot = document.createElement('div');
    Object.assign(dot.style, { width: '12px', height: '12px', borderRadius: '50%', background: c });
    bar.appendChild(dot);
  }
  el.appendChild(bar);

  for (const ln of lines) {
    const p = document.createElement('p');
    p.textContent = ln;
    Object.assign(p.style, { margin: '0', wordBreak: 'break-all' });
    el.appendChild(p);
  }

  _positionEl(el, x, y);
  return el;
}

/**
 * Diagonal stamp (VERIFIED, SOURCE, DRAFT, etc.)
 * @param {string} str
 * @param {{ color, size, x, y, duration }} opts
 */
export function stamp(str, {
  color    = 'rgba(220,38,38,0.8)',
  size     = 80,
  x        = 'center',
  y        = 'center',
  duration = Infinity,
} = {}) {
  const el = document.createElement('div');
  el._duration = duration;
  el.textContent = str.toUpperCase();
  Object.assign(el.style, {
    position:      'absolute',
    fontSize:      `${size}px`,
    fontWeight:    '900',
    letterSpacing: '0.1em',
    color,
    border:        `4px solid ${color}`,
    padding:       '6px 20px',
    transform:     'rotate(-15deg)',
    borderRadius:  '4px',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    userSelect:    'none',
  });
  _positionEl(el, x, y);
  return el;
}

/**
 * Syntax-highlighted code block.
 * @param {string} code
 * @param {string} lang  (informational only — no runtime highlight library required)
 * @param {{ x, y, width, fontSize, duration }} opts
 */
export function codeCard(code, lang = 'js', {
  x        = 'center',
  y        = 'center',
  width    = 820,
  fontSize = 20,
  duration = Infinity,
} = {}) {
  const el = document.createElement('div');
  el._duration = duration;
  Object.assign(el.style, {
    position:     'absolute',
    width:        `${width}px`,
    background:   '#0d1117',
    borderRadius: '12px',
    overflow:     'hidden',
    border:       '1px solid rgba(255,255,255,0.1)',
  });

  // Header bar
  const bar = document.createElement('div');
  bar.textContent = lang;
  Object.assign(bar.style, {
    background: '#161b22', color: '#8b949e', fontSize: '14px',
    padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
  });
  el.appendChild(bar);

  const pre = document.createElement('pre');
  Object.assign(pre.style, {
    margin: 0, padding: '20px 22px', overflowX: 'auto',
    fontFamily: '"Fira Code","Cascadia Code",monospace',
    fontSize: `${fontSize}px`, lineHeight: '1.65',
    color: '#e6edf3',
  });
  pre.textContent = code;
  el.appendChild(pre);

  _positionEl(el, x, y);
  return el;
}

/**
 * Browser screenshot card. Requires the URL to be a local data: URI or
 * pre-captured image path (capture.mjs generates these).
 */
export function browserCard(src, {
  x        = 'center',
  y        = 'center',
  width    = 860,
  duration = Infinity,
} = {}) {
  return imageCard(src, { x, y, width, height: Math.round(width * (600 / 1024)), duration });
}

// ── faceAt — talking-head layout helper ──────────────────────────────────────

/**
 * Return CSS position styles for a talking-head layout.
 * Pure function — no DOM side effects.
 *
 * @param {'FULL'|'SPLIT'|'PIP'} layout
 * @param {{ width, height, side, pipPos, pipSize }} opts
 */
export function faceAt(layout, {
  width   = REEL.width,
  height  = REEL.height,
  side    = 'right',
  pipPos  = 'br',
  pipSize = 0.28,
} = {}) {
  switch (layout.toUpperCase()) {
    case 'FULL':
      return { position: 'absolute', inset: 0, width: '100%', height: '100%' };
    case 'SPLIT': {
      const half = Math.round(width / 2);
      const left = side === 'left' ? 0 : half;
      return { position: 'absolute', top: 0, left, width: half, height };
    }
    case 'PIP': {
      const pw  = Math.round(width * pipSize);
      const ph  = Math.round(pw * (height / width));
      const pad = 40;
      const top  = pipPos.startsWith('t') ? pad : height - ph - pad;
      const left = pipPos.endsWith('l')   ? pad : width  - pw - pad;
      return { position: 'absolute', top, left, width: pw, height: ph, borderRadius: 16 };
    }
    default:
      return { position: 'absolute', inset: 0 };
  }
}

// ── captions — word-level caption sync ───────────────────────────────────────

/**
 * Register a Whisper outline file for auto-synced captions.
 * The outline file is produced by scripts/transcribe.py
 * Format: one JSON object per line: { "start": 0.0, "end": 0.5, "text": "word" }
 * or a single JSON array of the same objects.
 *
 * @param {string} outlinePath  Path relative to project root
 */
export function captions(outlinePath) {
  fetch(outlinePath)
    .then(r => r.text())
    .then(raw => {
      try {
        _captionData = JSON.parse(raw);
      } catch {
        // NDJSON — one segment per line
        _captionData = raw.trim().split('\n')
          .filter(Boolean)
          .map(l => JSON.parse(l));
      }
    })
    .catch(e => console.warn('[engine] captions(): could not load', outlinePath, e));
}

let _captionEl = null;

function _tickCaptions(t) {
  if (!_captionEl) {
    _captionEl = document.createElement('div');
    Object.assign(_captionEl.style, {
      position:   'absolute',
      bottom:     '80px',
      left:       '50%',
      transform:  'translateX(-50%)',
      background: 'rgba(0,0,0,0.72)',
      color:      '#fff',
      fontSize:   '32px',
      fontWeight: '600',
      padding:    '10px 28px',
      borderRadius: '8px',
      maxWidth:   '80%',
      textAlign:  'center',
      lineHeight: '1.4',
      pointerEvents: 'none',
    });
    document.getElementById('stage').appendChild(_captionEl);
  }

  // Collect segments whose window overlaps t
  const active = _captionData
    .filter(seg => seg.start <= t && t < seg.end + 0.05)
    .map(seg => seg.text)
    .join(' ');

  _captionEl.textContent = active;
  _captionEl.style.display = active ? '' : 'none';
}

// ── cue — sound effect placement & caption synchronization ───────────────────────

const _cues = [];

/**
 * Register a sound-effect cue. The audio is triggered by render.mjs when
 * encoding audio tracks (not in headless Playwright frames).
 *
 * @param {string} sfxName  Base name (no extension) inside assets/sfx/
 * @param {number} t        Time to trigger (seconds)
 * @param {number} vol      Volume 0–1 (default 1)
 */
export function cue(sfxName, t, vol = 1) {
  _cues.push({ sfxName, t, vol });
  // Expose on window for render.mjs to read after page load
  window.__cues = _cues;
}

/**
 * Match a target word or phrase in loaded captions, returning its start timestamp.
 * Throws a fatal build error if the phrase cannot be found.
 *
 * @param {string} targetPhrase  Exact word or sequence of words spoken in the voiceover
 * @param {number} [offset=0]   Offset in seconds to shift the trigger relative to the phrase start
 * @returns {number}             Timestamp in seconds
 */
export function cuePhrase(targetPhrase, offset = 0) {
  if (!_captionData || !Array.isArray(_captionData) || _captionData.length === 0) {
    throw new Error(`FATAL SYNC ERROR: Cannot cue "${targetPhrase}" — no captions loaded yet! Call captions() first.`);
  }

  const targetWords = targetPhrase.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (targetWords.length === 0) return offset;

  // Flatten caption segments into word tokens
  const tokens = [];
  for (const seg of _captionData) {
    if (Array.isArray(seg.words)) {
      for (const w of seg.words) {
        tokens.push({
          word: (w.word || w.text || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
          start: w.start !== undefined ? w.start : seg.start,
          end: w.end !== undefined ? w.end : seg.end
        });
      }
    } else {
      const segWords = (seg.text || '').trim().split(/\s+/).filter(Boolean);
      const segDur = Math.max(0.1, (seg.end - seg.start) || 1);
      const wordDur = segDur / Math.max(1, segWords.length);
      for (let i = 0; i < segWords.length; i++) {
        tokens.push({
          word: segWords[i].toLowerCase().replace(/[^a-z0-9]/g, ''),
          start: seg.start + i * wordDur,
          end: seg.start + (i + 1) * wordDur
        });
      }
    }
  }

  for (let i = 0; i <= tokens.length - targetWords.length; i++) {
    let match = true;
    for (let j = 0; j < targetWords.length; j++) {
      if (tokens[i + j].word !== targetWords[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return tokens[i].start + offset;
    }
  }

  throw new Error(`FATAL SYNC ERROR: Phrase "${targetPhrase}" not found in captions track!`);
}

// ── on() — raw per-frame hook ─────────────────────────────────────────────────

/**
 * Register a raw per-frame callback (no associated DOM element).
 * @param {(t: number) => void} fn
 */
export function on(fn) {
  _layers.push({ _tick: fn, name: '_raw_' + _layers.length });
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _positionEl(el, x, y) {
  if (x === 'center') {
    el.style.left      = '50%';
    el.style.transform = (el.style.transform || '') + ' translateX(-50%)';
  } else {
    el.style.left = `${x}px`;
  }
  if (y === 'center') {
    el.style.top       = '50%';
    el.style.transform = (el.style.transform || '') + ' translateY(-50%)';
  } else {
    el.style.top = `${y}px`;
  }
}

function _stylesToCSS(styles) {
  const mapped = {};
  for (const [k, v] of Object.entries(styles)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'number') {
      // Numeric pixel values for known layout props
      const pixelProps = new Set([
        'top','left','right','bottom','width','height',
        'marginTop','marginBottom','marginLeft','marginRight',
        'paddingTop','paddingBottom','paddingLeft','paddingRight',
        'borderRadius','fontSize','gap',
      ]);
      mapped[k] = pixelProps.has(k) ? `${v}px` : String(v);
    } else {
      mapped[k] = String(v);
    }
  }
  return mapped;
}

// ── Browser live-preview loop (development only) ──────────────────────────────
// When loaded in a normal browser (not Playwright headless), drive the
// compositor from requestAnimationFrame using the real clock.

if (typeof window !== 'undefined' && !window.__playwright) {
  let _startTime = null;
  function _raf(ts) {
    if (_startTime === null) _startTime = ts;
    const t = Math.min((ts - _startTime) / 1000, REEL.duration);
    seek(t);
    if (t < REEL.duration) requestAnimationFrame(_raf);
  }
  window.addEventListener('load', () => {
    if (!window.seek) window.seek = seek;
    requestAnimationFrame(_raf);
  });
}
