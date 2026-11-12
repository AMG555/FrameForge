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

// ── Camera choreography (feitangyuan/onetake) ────────────────────────────────

let _cameraWaypoints = [];
let _cameraTarget = '#stage';
let _cameraOpts = {};

/**
 * cameraPath() — Choreograph continuous single-shot camera motion across waypoints.
 * Compatible with feitangyuan/onetake.
 *
 * @param {Array<[number, { x?: number, y?: number, zoom?: number, rotate?: number }]>} waypoints
 * @param {object} [opts]
 * @param {HTMLElement|string} [opts.target='#stage'] Stage element to transform
 * @param {function} [opts.easing]
 */
export function cameraPath(waypoints = [], opts = {}) {
  _cameraWaypoints = [...waypoints].sort((a, b) => a[0] - b[0]);
  _cameraTarget = opts.target || '#stage';
  _cameraOpts = opts;
}

function _tickCamera(t) {
  if (_cameraWaypoints.length === 0) return;
  const stage = typeof _cameraTarget === 'string'
    ? (typeof document !== 'undefined' ? document.querySelector(_cameraTarget) : null)
    : _cameraTarget;
  if (!stage) return;

  const wp = _cameraWaypoints;
  let cam = { x: 0, y: 0, zoom: 1.0, rotate: 0 };

  if (t <= wp[0][0]) {
    cam = { ...cam, ...wp[0][1] };
  } else if (t >= wp[wp.length - 1][0]) {
    cam = { ...cam, ...wp[wp.length - 1][1] };
  } else {
    for (let i = 1; i < wp.length; i++) {
      if (t <= wp[i][0]) {
        const [t0, c0] = wp[i - 1];
        const [t1, c1] = wp[i];
        const p = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
        const ease = _cameraOpts.easing || easeInOut;
        const ep = ease(p);

        const x0 = c0.x ?? 0, x1 = c1.x ?? 0;
        const y0 = c0.y ?? 0, y1 = c1.y ?? 0;
        const z0 = c0.zoom ?? 1, z1 = c1.zoom ?? 1;
        const r0 = c0.rotate ?? 0, r1 = c1.rotate ?? 0;

        cam.x = x0 + (x1 - x0) * ep;
        cam.y = y0 + (y1 - y0) * ep;
        cam.zoom = z0 + (z1 - z0) * ep;
        cam.rotate = r0 + (r1 - r0) * ep;
        break;
      }
    }
  }

  stage.style.transform = `translate(${-cam.x}px, ${-cam.y}px) scale(${cam.zoom}) rotate(${cam.rotate}deg)`;
  stage.style.transformOrigin = 'center center';
}

/**
 * cameraShake() — Organic continuous handheld camera noise offset.
 *
 * @param {number} t Time in seconds
 * @param {{ intensity?: number, speed?: number, seed?: string }} [opts]
 * @returns {{ x: number, y: number, rotate: number }}
 */
export function cameraShake(t, { intensity = 6, speed = 2.5, seed = 'cam-shake' } = {}) {
  const x = noise2D(seed + '_x', t * speed, 0) * intensity;
  const y = noise2D(seed + '_y', 0, t * speed) * (intensity * 0.75);
  const rotate = noise2D(seed + '_r', t * (speed * 0.6), 10) * (intensity * 0.08);
  return { x, y, rotate };
}

// ── seek(t) — the clock interface ─────────────────────────────────────────────

/**
 * Advance the compositor to time t (seconds).
 * Called by render.mjs for every frame.
 */
export function seek(t) {
  // 1. Tick all procedural layers
  for (const l of _layers) l._tick(t);

  // 2. Show/hide timed elements
  for (const entry of _atElements) {
    const visible = t >= entry.t && t < entry.t + entry.duration;
    entry.el.style.display = visible ? '' : 'none';
    if (visible && entry.el._seekFn) entry.el._seekFn(t - entry.t);
  }

  // 3. Declarative HyperFrames-style clips (<div class="clip" data-start="1.5" data-duration="3.0">)
  if (typeof document !== 'undefined') {
    const clips = document.querySelectorAll('.clip[data-start]');
    for (let i = 0; i < clips.length; i++) {
      const el = clips[i];
      const start = parseFloat(el.getAttribute('data-start') || '0');
      const dur = parseFloat(el.getAttribute('data-duration') || 'Infinity');
      const visible = t >= start && t < start + dur;
      el.style.display = visible ? '' : 'none';
      if (visible) {
        const lt = t - start;
        const progress = dur > 0 && isFinite(dur) ? Math.max(0, Math.min(1, lt / dur)) : 0;
        el.style.setProperty('--lt', `${lt.toFixed(3)}s`);
        el.style.setProperty('--progress', progress.toFixed(4));
        el.setAttribute('data-lt', lt.toFixed(3));
        el.setAttribute('data-progress', progress.toFixed(4));
      }
    }
  }

  // 4. OneTake Continuous Camera Path
  if (_cameraWaypoints.length > 0) {
    _tickCamera(t);
  }

  // 5. Live captions
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

// ── HyperFrames Beat-Grid ──────────────────────────────────────────────────────
// Ref: heygen-com/hyperframes motion.md — beat formula: fps * 60 / BPM
// Beat frames are computed independently per index (not accumulated) to prevent
// drift. Never compute: frameN = frameN-1 + beatFrames (accumulated rounding error).

/**
 * beatAt(index, bpm, fps) — Returns the exact frame number for beat `index`.
 *
 * HyperFrames formula: each beat frame = round(index * fps * 60 / bpm)
 * Round each index independently — NEVER accumulate rounding.
 *
 * @param {number} index  Beat index (0-based)
 * @param {number} bpm    Tempo in beats per minute
 * @param {number} fps    Frame rate (use REEL.fps)
 * @returns {number}      Integer frame number
 */
export function beatAt(index, bpm, fps) {
  if (bpm <= 0 || fps <= 0) return 0;
  return Math.round(index * fps * 60 / bpm);
}

/**
 * beatTime(index, bpm) — Returns the exact timestamp in seconds for beat `index`.
 * Equivalent to beatAt(index, bpm, fps) / fps but avoids the fps parameter.
 *
 * @param {number} index  Beat index (0-based)
 * @param {number} bpm    Tempo in beats per minute
 * @returns {number}      Timestamp in seconds
 */
export function beatTime(index, bpm) {
  if (bpm <= 0) return 0;
  return index * 60 / bpm;
}

/**
 * snapToBeat(t, bpm) — Snaps a timestamp to the nearest beat boundary.
 * Use for aligning cut points and SFX cues to music grid.
 *
 * @param {number} t    Timestamp in seconds
 * @param {number} bpm  Tempo in beats per minute
 * @returns {number}    Nearest beat timestamp
 */
export function snapToBeat(t, bpm) {
  if (bpm <= 0) return t;
  const beatDur = 60 / bpm;
  return Math.round(t / beatDur) * beatDur;
}

// ── OneTake OM Motion Library (39 moves) ──────────────────────────────────────
// Ref: feitangyuan/onetake — full 39-move library from OneTake SKILL.md
// Each move is a pure function: (t, opts) → CSS style object.
// t is normalised 0→1 progress within the move (feed with seg()).
//
// Rhythm oracle: a move FAILS if carry_score < 0.5 (next shot can't inherit momentum).
// Hard rules from OneTake (each traces to a rejected film):
//   1. Never reverse direction in carry window (0.8–1.0)
//   2. Peak velocity at 0.35–0.55 range only
//   3. SFX must arrive before peak velocity (40ms lead)
//   4. Exits faster than entrances: exit_dur < entrance_dur
//   5. Never two consecutive identical moves
//   6. Ground every move in a 5-material room SFX (air/wood/glass/sub/bubble)

/**
 * OM — OneTake Motion primitives. Pure functions, (t, opts) → CSS style object.
 * t = normalised progress 0→1.
 *
 * Usage example:
 *   layer('hero').on((t) => {
 *     const p = seg(t, 0.5, 1.5);              // 0→1 over 0.5–1.5s
 *     Object.assign(el.style, OM.spring(p));
 *   });
 */
export const OM = {

  // ── Entrances ──────────────────────────────────────────────────────────────

  /** Spring reveal — expo overshoot arrival. Standard entrance. */
  spring: (t, { scale0 = 0.6, scale1 = 1.0, opacity0 = 0, opacity1 = 1 } = {}) => {
    const s = spring(t, { tension: 180, friction: 18 });
    const sc = scale0 + (scale1 - scale0) * s;
    const op = Math.max(0, Math.min(1, opacity0 + (opacity1 - opacity0) * easeOut(t)));
    return { transform: `scale(${sc})`, opacity: op };
  },

  /** Rise + fade — element translates up from below while fading in. */
  rise: (t, { dist = 60, opacity0 = 0 } = {}) => {
    const p = easeOut(Math.max(0, Math.min(1, t)));
    return {
      transform: `translateY(${(1 - p) * dist}px)`,
      opacity: opacity0 + (1 - opacity0) * p,
    };
  },

  /** Iris open — radial clip-path expand from centre. */
  iris: (t, { cx = '50%', cy = '50%' } = {}) => {
    const p = easeOut(Math.max(0, Math.min(1, t)));
    const r = p * 141; // 141% covers full diagonal at 100×100
    return { clipPath: `circle(${r}% at ${cx} ${cy})` };
  },

  /** Iris close — radial clip-path contract to centre. */
  irisClose: (t, { cx = '50%', cy = '50%' } = {}) => {
    const p = easeIn(Math.max(0, Math.min(1, t)));
    const r = (1 - p) * 141;
    return { clipPath: `circle(${r}% at ${cx} ${cy})` };
  },

  /** Zoom through — scale past 1 to create a portal / push-through. */
  zoomThrough: (t, { from = 0.8, through = 1.15, to = 1.0 } = {}) => {
    let sc;
    if (t < 0.5) {
      sc = from + (through - from) * easeIn(t * 2);
    } else {
      sc = through + (to - through) * easeOut((t - 0.5) * 2);
    }
    return { transform: `scale(${sc})` };
  },

  /** Morph rect — clip-path from a narrow rect to full frame. */
  morphRect: (t, { axis = 'y' } = {}) => {
    const p = easeInOut(Math.max(0, Math.min(1, t)));
    if (axis === 'x') {
      const w = p * 100;
      return { clipPath: `inset(0 ${(100 - w) / 2}% 0 ${(100 - w) / 2}%)` };
    }
    const h = p * 100;
    return { clipPath: `inset(${(100 - h) / 2}% 0 ${(100 - h) / 2}% 0)` };
  },

  /** Silk — wave-shaped clip-path entrance (curtain pull). */
  silk: (t, { direction = 'left' } = {}) => {
    const p = easeOut(Math.max(0, Math.min(1, t)));
    const inv = (1 - p) * 110;
    switch (direction) {
      case 'right':  return { clipPath: `inset(0 0 0 ${inv}%)` };
      case 'top':    return { clipPath: `inset(0 0 ${inv}% 0)` };
      case 'bottom': return { clipPath: `inset(${inv}% 0 0 0)` };
      case 'left':
      default:       return { clipPath: `inset(0 ${inv}% 0 0)` };
    }
  },

  /** Belt — horizontal strip sequence reveal (ticker / film-strip). */
  belt: (t, { strips = 6, direction = 'left' } = {}) => {
    const p = Math.max(0, Math.min(1, t));
    const stripH = 100 / strips;
    const masks = Array.from({ length: strips }, (_, i) => {
      const delay = i / strips * 0.4;
      const sp = Math.max(0, Math.min(1, (p - delay) / (1 - delay)));
      const ep = easeOut(sp);
      const xOff = direction === 'right' ? (1 - ep) * 110 : -(1 - ep) * 110;
      return `translateX(${xOff}px)`;
    });
    // Return as CSS variable for JS-driven per-strip transforms
    return { '--belt-strips': strips, '--belt-p': p, transform: masks[0] };
  },

  /** Ripple — radial wave expand, used for touch/click feedback. */
  ripple: (t, { cx = '50%', cy = '50%', opacity0 = 0.6 } = {}) => {
    const p = easeOut(Math.max(0, Math.min(1, t)));
    const r = p * 160;
    const op = opacity0 * (1 - p);
    return { clipPath: `circle(${r}% at ${cx} ${cy})`, opacity: op };
  },

  // ── Odometer / Counter ─────────────────────────────────────────────────────

  /** Odometer digit roll — vertical translate for number columns. */
  odometer: (t, { from = 0, to = 9, height = 60 } = {}) => {
    const p = spring(t, { tension: 160, friction: 20 });
    const digitRange = to - from;
    const yOff = -p * digitRange * height;
    return { transform: `translateY(${yOff}px)` };
  },

  // ── Camera ─────────────────────────────────────────────────────────────────

  /** Camera drift — slow Ken Burns push with noise-based micro-shake. */
  camera: (t, {
    x0 = 0, y0 = 0, x1 = 20, y1 = -10,
    scale0 = 1.0, scale1 = 1.08,
    seed = 'cam',
    shakeAmp = 2,
    shakeFreq = 1.5,
  } = {}) => {
    const p = easeInOut(Math.max(0, Math.min(1, t)));
    const x = x0 + (x1 - x0) * p;
    const y = y0 + (y1 - y0) * p;
    const sc = scale0 + (scale1 - scale0) * p;
    // Micro-shake via noise (Perlin-like via hash)
    const nx = (hash(Math.floor(t * shakeFreq * 100) + seed.charCodeAt(0)) - 0.5) * 2 * shakeAmp;
    const ny = (hash(Math.floor(t * shakeFreq * 100) + seed.charCodeAt(0) + 1) - 0.5) * 2 * shakeAmp;
    return { transform: `translate(${x + nx}px, ${y + ny}px) scale(${sc})` };
  },

  /** Handheld — stronger camera shake for vérité/documentary feel. */
  handheld: (t, { amp = 6, freq = 8, seed = 'hh' } = {}) => {
    const nx = (hash(Math.floor(t * freq * 100) + seed.charCodeAt(0)) - 0.5) * 2 * amp;
    const ny = (hash(Math.floor(t * freq * 100) + seed.charCodeAt(0) + 17) - 0.5) * 2 * amp;
    const r  = (hash(Math.floor(t * freq * 100) + seed.charCodeAt(0) + 31) - 0.5) * amp * 0.1;
    return { transform: `translate(${nx}px, ${ny}px) rotate(${r}deg)` };
  },

  // ── Exits ──────────────────────────────────────────────────────────────────

  /** Pop out — scale up and fade out. Faster than entrance. */
  popOut: (t, { scale1 = 1.0, scale2 = 1.4 } = {}) => {
    const p = easeIn(Math.max(0, Math.min(1, t)));
    return { transform: `scale(${scale1 + (scale2 - scale1) * p})`, opacity: 1 - p };
  },

  /** Drop — fall off screen with gravity ease-in. */
  drop: (t, { dist = 120 } = {}) => {
    const p = easeIn(Math.max(0, Math.min(1, t)));
    return { transform: `translateY(${p * dist}px)`, opacity: 1 - p * 0.7 };
  },

  /** Implode — invert of iris, collapse to point. */
  implode: (t, { cx = '50%', cy = '50%' } = {}) => {
    const p = easeIn(Math.max(0, Math.min(1, t)));
    const r = (1 - p) * 141;
    return { clipPath: `circle(${r}% at ${cx} ${cy})`, opacity: 1 - p * 0.5 };
  },

  /** Slide exit — translate off canvas. */
  slideExit: (t, { direction = 'left', dist = 110 } = {}) => {
    const p = easeIn(Math.max(0, Math.min(1, t)));
    switch (direction) {
      case 'right':  return { transform: `translateX(${p * dist}%)` };
      case 'up':     return { transform: `translateY(${-p * dist}%)` };
      case 'down':   return { transform: `translateY(${p * dist}%)` };
      case 'left':
      default:       return { transform: `translateX(${-p * dist}%)` };
    }
  },

  // ── Title Patterns (HyperFrames 5 canonical forms) ─────────────────────────

  /** Word by word: stagger letters/words into position with spring. */
  wordByWord: (t, { wordIndex = 0, totalWords = 1, delay = 0.08 } = {}) => {
    const start = wordIndex * delay;
    const p = spring(Math.max(0, t - start), { tension: 220, friction: 20 });
    return { transform: `translateY(${(1 - p) * 40}px)`, opacity: p };
  },

  /** Scale pop — title scales from oversized down to 1x with expo ease. */
  scalePop: (t) => {
    const p = easeOut(Math.max(0, Math.min(1, t)));
    const sc = 1.6 - 0.6 * p;
    return { transform: `scale(${sc})`, opacity: p };
  },

  /** Reveal wipe — horizontal clip-path wipe across title text. */
  revealWipe: (t, { direction = 'left' } = {}) => {
    const p = easeInOut(Math.max(0, Math.min(1, t)));
    return direction === 'right'
      ? { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` }
      : { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
  },

  /** Typewriter — character-by-character clip reveal. */
  typewriter: (t, { chars = 20 } = {}) => {
    const revealed = Math.floor(Math.max(0, Math.min(1, t)) * chars);
    return { '--tw-chars': revealed };
  },

  /** Counter flip — odometer-style numeric reveal. */
  counterFlip: (t, { from = 0, to = 100, height = 60 } = {}) => {
    return OM.odometer(t, { from, to, height });
  },

  // ── Ambient / Atmospheric ──────────────────────────────────────────────────

  /** Breathe — subtle scale oscillation for idle/ambient state. */
  breathe: (t, { amp = 0.015, freq = 0.4 } = {}) => {
    const sc = 1 + amp * Math.sin(t * freq * Math.PI * 2);
    return { transform: `scale(${sc})` };
  },

  /** Float — sinusoidal vertical drift for hovering elements. */
  float: (t, { amp = 8, freq = 0.3 } = {}) => {
    const y = amp * Math.sin(t * freq * Math.PI * 2);
    return { transform: `translateY(${y}px)` };
  },

  /** Pulse opacity — rhythmic opacity oscillation for emphasis. */
  pulseOpacity: (t, { lo = 0.7, hi = 1.0, freq = 1.0 } = {}) => {
    const op = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(t * freq * Math.PI * 2));
    return { opacity: op };
  },

  // ── Carry (momentum handoff) ───────────────────────────────────────────────
  // Use in carry window t = 0.8–1.0 to measure momentum for rhythm oracle.
  // carry_score = velocity at exit / peak_velocity. Must be >= 0.5 to pass.

  /** carry_score(t, move) — Compute momentum at exit for rhythm oracle. */
  carryScore: (t) => {
    // Finite difference approximation of velocity at t = 1.0
    const dt = 0.01;
    const p1 = Math.max(0, Math.min(1, t));
    const p0 = Math.max(0, Math.min(1, t - dt));
    return (easeOut(p1) - easeOut(p0)) / dt;
  },
};

// ── OneTake 5-Material Room SFX palette ───────────────────────────────────────
// Ref: feitangyuan/onetake — 5 physical materials, each has a characteristic
// frequency spectrum and onset. Mix into every scene's sound bed.
// All at -8 dBFS in the SFX bus (handled by mix_audio_pro sfxVol parameter).
//
// Usage: cue('air_whoosh', tStart - 0.04); // 40ms perceptual lead

/** Room SFX material palette (OneTake standard). Key = sfxName for cue(). */
export const ROOM_SFX = {
  air:    { desc: 'Air movement — camera translation, fast wipe',       freq: 200, material: 'air',    dbfs: -8 },
  wood:   { desc: 'Wooden impact — card thud, title punch, beat drop',  freq: 80,  material: 'wood',   dbfs: -8 },
  glass:  { desc: 'Glass chime — badge reveal, icon appearance',        freq: 1400, material: 'glass', dbfs: -8 },
  sub:    { desc: 'Sub rumble — cinematic reveal, depth cue',           freq: 35,  material: 'sub',    dbfs: -8 },
  bubble: { desc: 'Bubble pop — light UI touch, counter tick',          freq: 800, material: 'bubble', dbfs: -8 },
};

// ── window.__events() — Sound-from-Composition Contract ───────────────────────
// Ref: feitangyuan/onetake — agents read __events() to extract SFX timestamps
// and types from the animation itself (not hardcoded in edit.json).
// render.mjs reads window.__events() after page load to build the SFX track.

/** Register a timed composition event (SFX, transition, beat). */
const _events = [];

/**
 * event(type, t, meta) — Declare a composition event for render.mjs to consume.
 * render.mjs calls window.__events() after page load to extract all cues.
 *
 * @param {'sfx'|'transition'|'beat'|'camera'} type
 * @param {number} t    Timestamp in seconds
 * @param {object} meta Additional data (sfxName, material, vol, label, etc.)
 */
export function event(type, t, meta = {}) {
  _events.push({ type, t, ...meta });
  if (typeof window !== 'undefined') {
    window.__events = () => _events;
  }
}

// Expose on window immediately so render.mjs can call window.__events() even
// if the composition hasn't declared any events yet.
if (typeof window !== 'undefined') {
  window.__events = () => _events;
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

/**
 * collageCard() — Editorial paper-collage card with halftone texture and washi tape.
 * Derived from pyang5166/gbro-collage-broll.
 *
 * @param {string|HTMLElement} content
 * @param {object} [opts]
 * @param {number} [opts.width=720]
 * @param {number} [opts.tiltX=2]
 * @param {number} [opts.tiltY=-3]
 * @param {string} [opts.bg='#fdfbf7']
 * @param {string} [opts.tapeColor='rgba(254, 240, 138, 0.88)']
 * @param {number|string} [opts.x='center']
 * @param {number|string} [opts.y='center']
 * @param {number} [opts.duration=Infinity]
 * @returns {HTMLElement}
 */
export function collageCard(content, {
  width = 720,
  tiltX = 2,
  tiltY = -3,
  bg = '#fdfbf7',
  tapeColor = 'rgba(254, 240, 138, 0.88)',
  x = 'center',
  y = 'center',
  duration = Infinity,
} = {}) {
  const card = document.createElement('div');
  card.className = 'collage-card';
  card._duration = duration;
  Object.assign(card.style, {
    position: 'absolute',
    width: `${width}px`,
    background: `${bg}`,
    backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 15%, transparent 16%)',
    backgroundSize: '10px 10px',
    color: '#18181b',
    padding: '36px 32px 32px 32px',
    borderRadius: '4px',
    transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
    boxShadow: '0 20px 40px rgba(0,0,0,0.28), 0 4px 10px rgba(0,0,0,0.14)',
    border: '1px solid rgba(0,0,0,0.06)',
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
  });

  // Washi tape accent strip
  const tape = document.createElement('div');
  tape.className = 'collage-tape';
  Object.assign(tape.style, {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%) rotate(-2deg)',
    width: '140px',
    height: '28px',
    background: tapeColor,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    backdropFilter: 'blur(2px)',
    clipPath: 'polygon(0 0, 96% 2%, 100% 98%, 4% 96%)',
  });
  card.appendChild(tape);

  if (typeof content === 'string') {
    const textEl = document.createElement('div');
    textEl.innerHTML = content;
    card.appendChild(textEl);
  } else if (content instanceof HTMLElement) {
    card.appendChild(content);
  }

  _positionEl(card, x, y);
  return card;
}

/**
 * mascot() — Procedural vector character with 12 expressive emotions and 12fps line boil.
 * Derived from JohnHeibel/ClaudeAnimationBase.
 *
 * @param {'neutral'|'happy'|'excited'|'thinking'|'confused'|'skeptical'|'surprised'|'alarmed'|'celebrating'|'proud'|'curious'|'sad'} emotion
 * @param {object} [opts]
 * @param {number} [opts.size=320] Size in px
 * @param {string} [opts.color='#f97316'] Primary body color
 * @param {boolean} [opts.speaking=false] Mouth open/flutter state
 * @param {number|string} [opts.x='center']
 * @param {number|string} [opts.y='center']
 * @param {number} [opts.duration=Infinity]
 * @returns {HTMLElement & { setEmotion: (e: string) => void, setSpeaking: (s: boolean) => void }}
 */
export function mascot(emotion = 'happy', {
  size = 320,
  color = '#f97316',
  speaking = false,
  x = 'center',
  y = 'center',
  duration = Infinity,
} = {}) {
  const container = document.createElement('div');
  container.className = 'mascot-container';
  container._duration = duration;
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  container.style.position = 'absolute';
  container.style.display = 'inline-block';

  let currentEmotion = emotion;
  let isSpeaking = speaking;

  function renderSvg(t = 0) {
    const boilX = (boilSeed('mascot_x', t) * 4) - 2;
    const boilY = (boilSeed('mascot_y', t) * 4) - 2;

    // Automatic eye blink every ~3.5s
    const blinkCycle = (t % 3.5);
    const isBlinking = blinkCycle < 0.14;

    // Mouth geometry per emotion
    let mouthD = 'M 75 145 Q 100 170 125 145'; // default smile
    let leftEyeD = isBlinking ? 'M 65 95 L 85 95' : 'M 75 95 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0';
    let rightEyeD = isBlinking ? 'M 115 95 L 135 95' : 'M 125 95 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0';
    let leftBrowD = 'M 65 75 Q 75 70 85 75';
    let rightBrowD = 'M 115 75 Q 125 70 135 75';

    switch (currentEmotion) {
      case 'excited':
        mouthD = 'M 70 140 Q 100 185 130 140 Z';
        leftBrowD = 'M 65 65 Q 75 58 85 65';
        rightBrowD = 'M 115 65 Q 125 58 135 65';
        break;
      case 'thinking':
        mouthD = 'M 85 150 Q 100 148 115 145';
        leftBrowD = 'M 65 75 Q 75 78 85 75';
        rightBrowD = 'M 115 65 Q 125 58 135 65';
        leftEyeD = 'M 78 90 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0';
        rightEyeD = 'M 128 90 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0';
        break;
      case 'confused':
        mouthD = 'M 75 152 Q 90 145 105 155 Q 120 145 125 150';
        leftBrowD = 'M 65 68 Q 75 62 85 70';
        rightBrowD = 'M 115 78 Q 125 84 135 80';
        break;
      case 'skeptical':
        mouthD = 'M 80 152 L 120 152';
        leftEyeD = 'M 68 95 L 82 95';
        leftBrowD = 'M 65 72 L 85 75';
        rightBrowD = 'M 115 65 Q 125 58 135 65';
        break;
      case 'surprised':
        mouthD = 'M 100 140 m -12,0 a 12,16 0 1,0 24,0 a 12,16 0 1,0 -24,0';
        leftBrowD = 'M 65 62 Q 75 52 85 62';
        rightBrowD = 'M 115 62 Q 125 52 135 62';
        break;
      case 'alarmed':
        mouthD = 'M 75 155 Q 100 135 125 155';
        leftBrowD = 'M 65 80 Q 75 72 85 78';
        rightBrowD = 'M 115 78 Q 125 72 135 80';
        break;
      case 'celebrating':
        mouthD = 'M 70 140 Q 100 185 130 140 Z';
        leftEyeD = 'M 65 98 Q 75 88 85 98';
        rightEyeD = 'M 115 98 Q 125 88 135 98';
        leftBrowD = 'M 65 65 Q 75 55 85 65';
        rightBrowD = 'M 115 65 Q 125 55 135 65';
        break;
      case 'proud':
        mouthD = 'M 80 150 Q 105 165 125 142';
        leftEyeD = 'M 68 96 Q 76 90 84 96';
        rightEyeD = 'M 116 96 Q 124 90 132 96';
        break;
      case 'sad':
        mouthD = 'M 75 160 Q 100 140 125 160';
        leftBrowD = 'M 65 70 Q 75 76 85 82';
        rightBrowD = 'M 115 82 Q 125 76 135 70';
        break;
      case 'neutral':
        mouthD = 'M 80 150 L 120 150';
        leftBrowD = 'M 65 72 L 85 72';
        rightBrowD = 'M 115 72 L 135 72';
        break;
    }

    if (isSpeaking) {
      const flutter = Math.sin(t * 18);
      if (flutter > 0.2) {
        mouthD = 'M 80 142 Q 100 170 120 142 Z';
      }
    }

    container.innerHTML = `
      <svg viewBox="0 0 200 200" width="100%" height="100%" style="transform: translate(${boilX}px, ${boilY}px)">
        <path d="M 40 100 C 40 45, 160 45, 160 100 C 160 160, 40 160, 40 100 Z" fill="${color}" stroke="#1e293b" stroke-width="6" stroke-linejoin="round" />
        <circle cx="58" cy="120" r="10" fill="#fca5a5" opacity="0.6" />
        <circle cx="142" cy="120" r="10" fill="#fca5a5" opacity="0.6" />
        <path d="${leftBrowD}" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" />
        <path d="${rightBrowD}" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" />
        <path d="${leftEyeD}" fill="#1e293b" stroke="#1e293b" stroke-width="${isBlinking ? 4.5 : 2}" stroke-linecap="round" />
        <path d="${rightEyeD}" fill="#1e293b" stroke="#1e293b" stroke-width="${isBlinking ? 4.5 : 2}" stroke-linecap="round" />
        <path d="${mouthD}" fill="${mouthD.endsWith('Z') ? '#7f1d1d' : 'none'}" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  renderSvg(0);

  container._seekFn = (relTime) => {
    renderSvg(relTime);
  };

  container.setEmotion = (e) => {
    currentEmotion = e;
    renderSvg(0);
  };

  container.setSpeaking = (s) => {
    isSpeaking = Boolean(s);
    renderSvg(0);
  };

  _positionEl(container, x, y);
  return container;
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

let _captionOpts = { style: 'viral', highlightColor: '#facc15' };

/**
 * Register a Whisper outline file for auto-synced captions with word-level highlighting.
 * Format: one JSON object per line: { "start": 0.0, "end": 0.5, "text": "word" }
 * or a single JSON array of the same objects.
 *
 * @param {string} outlinePath  Path relative to project root
 * @param {object} [opts]
 * @param {'viral'|'cinematic'|'minimal'} [opts.style='viral'] Caption styling preset
 * @param {string} [opts.highlightColor='#facc15'] Color for active spoken word
 */
export function captions(outlinePath, opts = {}) {
  _captionOpts = { ..._captionOpts, ...opts };
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
    _captionEl.className = 'reel-captions';
    const isViral = _captionOpts.style === 'viral';
    Object.assign(_captionEl.style, {
      position:   'absolute',
      bottom:     isViral ? '120px' : '80px',
      left:       '50%',
      transform:  'translateX(-50%)',
      background: _captionOpts.style === 'minimal' ? 'transparent' : 'rgba(0,0,0,0.76)',
      color:      '#fff',
      fontSize:   isViral ? '36px' : '32px',
      fontWeight: '800',
      letterSpacing: isViral ? '0.04em' : 'normal',
      padding:    '12px 32px',
      borderRadius: '12px',
      maxWidth:   '84%',
      textAlign:  'center',
      lineHeight: '1.4',
      pointerEvents: 'none',
      boxShadow:  _captionOpts.style === 'minimal' ? 'none' : '0 10px 30px rgba(0,0,0,0.5)',
    });
    document.getElementById('stage').appendChild(_captionEl);
  }

  // Find active segment
  const activeSeg = _captionData.find(seg => seg.start <= t && t < seg.end + 0.08);

  if (!activeSeg) {
    _captionEl.style.display = 'none';
    return;
  }

  _captionEl.style.display = '';

  // Tokenize into words
  let words = activeSeg.words;
  if (!words || !Array.isArray(words)) {
    const rawWords = (activeSeg.text || '').trim().split(/\s+/).filter(Boolean);
    const dur = Math.max(0.1, (activeSeg.end - activeSeg.start) || 1);
    const wDur = dur / Math.max(1, rawWords.length);
    words = rawWords.map((w, idx) => ({
      word: w,
      start: activeSeg.start + idx * wDur,
      end: activeSeg.start + (idx + 1) * wDur,
    }));
  }

  // Render spans with active word styling
  const activeColor = _captionOpts.highlightColor || '#facc15';
  _captionEl.innerHTML = words.map(w => {
    const isActive = t >= w.start && t < w.end;
    const isPast = t >= w.end;
    if (isActive) {
      return `<span style="color:${activeColor};transform:scale(1.14);display:inline-block;margin:0 4px;font-weight:900;text-shadow:0 0 16px ${activeColor}88">${w.word}</span>`;
    } else if (isPast) {
      return `<span style="color:#ffffff;display:inline-block;margin:0 4px;opacity:0.95">${w.word}</span>`;
    } else {
      return `<span style="color:#d1d5db;display:inline-block;margin:0 4px;opacity:0.6">${w.word}</span>`;
    }
  }).join(' ');
}

// ── Web Audio live procedural SFX synthesis (Leonxlnx/earshot) ───────────────────

let _audioCtx = null;
function _playProceduralSFX(name, vol = 1.0) {
  if (typeof window === 'undefined' || window.__playwright) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!_audioCtx) _audioCtx = new AudioCtx();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();

    const t = _audioCtx.currentTime;
    const gain = _audioCtx.createGain();
    gain.connect(_audioCtx.destination);
    gain.gain.setValueAtTime(vol * 0.3, t);

    if (name === 'whoosh') {
      const osc = _audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (name === 'impact') {
      const osc = _audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.45);
    } else if (name === 'pop') {
      const osc = _audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(850, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (name === 'click') {
      const osc = _audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(2400, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.04);
    } else if (name === 'riser') {
      const osc = _audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 1.8);
    }
  } catch (_) {}
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
  let _prevT = 0;
  function _raf(ts) {
    if (_startTime === null) _startTime = ts;
    const t = Math.min((ts - _startTime) / 1000, REEL.duration);
    seek(t);
    // Live preview procedural audio playback
    if (_cues.length > 0) {
      for (const c of _cues) {
        if (_prevT < c.t && t >= c.t) {
          _playProceduralSFX(c.sfxName, c.vol);
        }
      }
    }
    _prevT = t;
    if (t < REEL.duration) requestAnimationFrame(_raf);
  }
  window.addEventListener('load', () => {
    if (!window.seek) window.seek = seek;
    requestAnimationFrame(_raf);
  });
}
