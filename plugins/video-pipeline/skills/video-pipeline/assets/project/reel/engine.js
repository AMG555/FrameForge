/**
 * reel/engine.js — FrameForge HTML Compositor Engine
 *
 * Renders video frames as a pure function of time t (seconds).
 * Every style must be computed solely from t — no CSS transitions,
 * no setTimeout, no state that depends on previous frames.
 * Playwright renders frames out of order for parallelism; this is only
 * safe if each frame is fully self-contained.
 *
 * Inspired by sunithvs/video-agent-skill (Apache 2.0).
 * This implementation is an independent port adapted for the FrameForge
 * script JSON schema and MCP pipeline.
 *
 * Public API:
 *   reel(config)          Configure compositor (width, height, fps, duration, title)
 *   layer(name)           Declare a DOM layer; returns { on(fn) } to register the style fn
 *   text(str, opts)       Animated text element
 *   chip(str, opts)       Pill-shaped label
 *   wallCard(lines, opts) Frosted-glass card
 *   imageCard(src, opts)  Image with optional caption
 *   stamp(str, opts)      Bold diagonal stamp (VERIFIED, SOURCE…)
 *   codeCard(code, opts)  Syntax-highlighted code block
 *   terminal(lines, opts) Animated terminal output
 *   at(t, element)        Place an element at time t
 *   stagger(t, dt, els)   Place elements with dt spacing
 *   captions(path)        Register Whisper-outline caption file
 *   cue(name, t, vol)     Trigger sound effect at time t
 *   faceAt(layout, t)     Position talking-head overlay
 *   spring(t, opts)       Spring-physics interpolation
 *   lerp(t, a, b, t0, t1) Linear interpolation between t0 and t1
 *   easeIn/Out/InOut(t)   Easing helpers (in, out, in-out)
 *   seek(t)               Render all layers at time t (called by renderer scripts)
 *   REEL                  Live compositor state object
 */

'use strict';

// ── Compositor state ─────────────────────────────────────────────────────────

export const REEL = {
  width:    1920,
  height:   1080,
  fps:      30,
  duration: 60,
  title:    '',
  captionY: null,   // override caption Y position (null = auto)
  layers:   [],
  elements: [],
  captions: [],
  cues:     [],
  _dom:     null,   // root #stage element
};

// ── Config ───────────────────────────────────────────────────────────────────

/** Configure the compositor. Call once at the top of edit.js. */
export function reel({ width = 1920, height = 1080, fps = 30, duration = 60, title = '', captionY = null } = {}) {
  REEL.width    = width;
  REEL.height   = height;
  REEL.fps      = fps;
  REEL.duration = duration;
  REEL.title    = title;
  if (captionY !== null) REEL.captionY = captionY;
}

// ── Layer system ─────────────────────────────────────────────────────────────

/**
 * Declare a named DOM layer.
 * Returns { on(fn) } where fn(t) must return a plain CSSProperties object.
 * If fn returns falsy for a given t, the layer element is hidden.
 *
 * IRON RULE: fn must be a pure function of t.
 * If a layer is only active until t=X, fn MUST explicitly set
 * opacity/display/visibility to 0/none/hidden after t=X — otherwise
 * Playwright's out-of-order rendering will freeze the last value on later frames.
 */
export function layer(name) {
  const entry = { name, fn: null, el: null };
  REEL.layers.push(entry);
  return {
    on(fn) {
      entry.fn = fn;
      return entry;
    },
  };
}

// ── Element builders ─────────────────────────────────────────────────────────

/**
 * Animated text element.
 * @param {string} str  Text content (may include newlines)
 * @param {{ font?, size?, weight?, color?, x?, y?, align?, opacity?, letterSpacing?, lineHeight? }} opts
 */
export function text(str, {
  font   = '"Archivo", "Segoe UI", system-ui, sans-serif',
  size   = 48,
  weight = 700,
  color  = '#ffffff',
  x      = 'center',
  y      = 300,
  align  = 'center',
  opacity = 1,
  letterSpacing = 0,
  lineHeight    = 1.3,
} = {}) {
  return { type: 'text', str, font, size, weight, color, x, y, align, opacity, letterSpacing, lineHeight };
}

/**
 * Pill-shaped label element.
 * @param {string} str
 * @param {{ x?, y?, size?, bg?, color?, radius?, padding? }} opts
 */
export function chip(str, {
  x       = 'center',
  y       = 200,
  size    = 28,
  bg      = 'rgba(59,130,246,0.85)',
  color   = '#ffffff',
  radius  = 999,
  padding = '8px 22px',
} = {}) {
  return { type: 'chip', str, x, y, size, bg, color, radius, padding };
}

/**
 * Frosted-glass wall card — multi-line text block with backdrop blur.
 * @param {{ text, size?, weight?, color? }[]} lines  Line descriptors
 * @param {{ x?, y?, width?, duration?, bg?, blur?, radius?, padding?, gap? }} opts
 */
export function wallCard(lines, {
  x        = 'center',
  y        = 800,
  width    = 1440,
  duration = null,
  bg       = 'rgba(13,17,23,0.72)',
  blur     = 18,
  radius   = 18,
  padding  = '32px 40px',
  gap      = 12,
} = {}) {
  return { type: 'wallCard', lines, x, y, width, duration, bg, blur, radius, padding, gap };
}

/**
 * Image card — displays an image with optional caption overlay.
 * @param {string} src  Image URL or relative path
 * @param {{ x?, y?, width?, height?, caption?, radius?, objectFit? }} opts
 */
export function imageCard(src, {
  x         = 'center',
  y         = 'center',
  width     = 960,
  height    = 540,
  caption   = '',
  radius    = 12,
  objectFit = 'cover',
} = {}) {
  return { type: 'imageCard', src, x, y, width, height, caption, radius, objectFit };
}

/**
 * Bold diagonal stamp — e.g. "VERIFIED", "SOURCE", "BREAKING".
 * @param {string} str
 * @param {{ x?, y?, size?, color?, bg?, angle?, opacity? }} opts
 */
export function stamp(str, {
  x       = 80,
  y       = 80,
  size    = 48,
  color   = '#22c55e',
  bg      = 'transparent',
  angle   = -12,
  opacity = 0.95,
} = {}) {
  return { type: 'stamp', str, x, y, size, color, bg, angle, opacity };
}

/**
 * Syntax-highlighted code block.
 * @param {string} code
 * @param {{ lang?, x?, y?, width?, size?, theme? }} opts
 */
export function codeCard(code, {
  lang  = '',
  x     = 'center',
  y     = 200,
  width = 1400,
  size  = 22,
  theme = 'dark',
} = {}) {
  return { type: 'codeCard', code, lang, x, y, width, size, theme };
}

/**
 * Animated terminal output — lines appear one at a time.
 * @param {string[]} lines
 * @param {{ x?, y?, width?, size?, startT?, lineDelay? }} opts
 */
export function terminal(lines, {
  x         = 'center',
  y         = 200,
  width     = 1400,
  size      = 22,
  startT    = 0,
  lineDelay = 0.18,
} = {}) {
  return { type: 'terminal', lines, x, y, width, size, startT, lineDelay };
}

// ── Placement helpers ─────────────────────────────────────────────────────────

/**
 * Place an element at time t.
 * The element is rendered from t onwards until the video ends (or until
 * another at() replaces it via a named layer slot).
 */
export function at(t, element) {
  REEL.elements.push({ t, element });
}

/**
 * Place multiple elements with dt-second spacing starting at t.
 */
export function stagger(t, dt, elements) {
  elements.forEach((el, i) => at(t + i * dt, el));
}

// ── Captions ─────────────────────────────────────────────────────────────────

/**
 * Register a Whisper-outline caption file.
 * Format (tab-separated): start_ms  end_ms  word
 *
 * The renderer loads the file from disk at render time, parses the outline,
 * and renders word-level captions at the bottom of each frame.
 */
export function captions(outlinePath) {
  REEL.captions.push(outlinePath);
}

// ── Sound effects ─────────────────────────────────────────────────────────────

/** Trigger a sound effect at time t with given volume (0-1). */
export function cue(sfxName, t, vol = 1.0) {
  REEL.cues.push({ sfxName, t, vol });
}

// ── Talking-head overlay ──────────────────────────────────────────────────────

/**
 * Position a talking-head face overlay.
 * Layouts: 'FULL' (full screen), 'SPLIT' (left or right half), 'PIP' (corner PIP)
 * Returns a CSS position descriptor suitable for a layer().on() function.
 */
export function faceAt(layout = 'FULL', t = 0, {
  side    = 'right',   // for SPLIT: which side the face occupies
  pipPos  = 'br',      // for PIP: corner (tl, tr, bl, br)
  pipSize = 0.28,      // for PIP: fraction of width
} = {}) {
  const w = REEL.width;
  const h = REEL.height;

  switch (layout.toUpperCase()) {
    case 'FULL':
      return { position: 'absolute', inset: 0, width: '100%', height: '100%' };

    case 'SPLIT': {
      const half = Math.round(w / 2);
      const left = side === 'left' ? 0 : half;
      return { position: 'absolute', top: 0, left, width: half, height: h };
    }

    case 'PIP': {
      const pw   = Math.round(w * pipSize);
      const ph   = Math.round(pw * (h / w));
      const pad  = 40;
      const top  = pipPos.startsWith('t') ? pad : h - ph - pad;
      const left = pipPos.endsWith('l')  ? pad : w - pw - pad;
      return { position: 'absolute', top, left, width: pw, height: ph, borderRadius: 16 };
    }

    default:
      return { position: 'absolute', inset: 0 };
  }
}

// ── Physics and math helpers ──────────────────────────────────────────────────

/**
 * Linear interpolation from value a (at t0) to value b (at t1).
 * Clamped outside [t0, t1].
 */
export function lerp(t, a, b, t0, t1) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  const p = (t - t0) / (t1 - t0);
  return a + (b - a) * p;
}

/**
 * Ease-in (quadratic).
 */
export function easeIn(t) {
  const p = Math.max(0, Math.min(1, t));
  return p * p;
}

/**
 * Ease-out (quadratic).
 */
export function easeOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return 1 - (1 - p) * (1 - p);
}

/**
 * Ease-in-out (cubic).
 */
export function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

/**
 * Spring physics — returns a 0→1 value that overshoots and settles.
 * @param {number} t      Current time in seconds
 * @param {{ tension?, friction?, delay? }} opts
 *   tension  — higher = faster/stiffer (default 200)
 *   friction — higher = less overshoot (default 22)
 *   delay    — seconds before spring starts (default 0)
 * @returns {number}  Spring value (may briefly exceed 1 for overshoot)
 */
export function spring(t, { tension = 200, friction = 22, delay = 0 } = {}) {
  const dt = t - delay;
  if (dt <= 0) return 0;

  // Analytic underdamped spring: x(t) = 1 - e^(-ζωt)(cos(ωdt) + ζ/ωd·sin(ωdt))
  const omega     = Math.sqrt(tension);
  const zeta      = friction / (2 * omega);   // damping ratio

  if (zeta >= 1) {
    // Overdamped — no overshoot, fast exponential decay
    const r1 = -omega * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -omega * (zeta + Math.sqrt(zeta * zeta - 1));
    const c2 = r1 / (r1 - r2);
    const c1 = 1 - c2;
    return 1 - c1 * Math.exp(r1 * dt) - c2 * Math.exp(r2 * dt);
  }

  // Underdamped — natural overshoot
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * dt) * (
    Math.cos(omegaD * dt) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * dt)
  );
}

// ── Seek (core renderer function) ─────────────────────────────────────────────

/**
 * Render all layers at time t.
 *
 * Called once per frame by the Playwright renderer scripts.
 * Also called on every animation frame in browser preview mode.
 *
 * @param {number} t  Current time in seconds
 */
export function seek(t) {
  _ensureStage();

  // 1. Render named layers
  for (const entry of REEL.layers) {
    if (!entry.fn) continue;
    const styles = entry.fn(t);
    const el     = _getOrCreateLayer(entry);

    if (!styles || styles.display === 'none' || styles.opacity === 0 || styles.visibility === 'hidden') {
      if (!styles) {
        el.style.display = 'none';
        continue;
      }
    }

    el.style.display = '';
    _applyStyles(el, styles);
  }

  // 2. Render at() elements active at time t
  _renderElements(t);

  // 3. Render captions
  _renderCaptions(t);
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function _ensureStage() {
  if (REEL._dom) return;
  if (typeof document === 'undefined') return;
  REEL._dom = document.getElementById('stage');
  if (!REEL._dom) {
    REEL._dom = document.createElement('div');
    REEL._dom.id = 'stage';
    Object.assign(REEL._dom.style, {
      width:    REEL.width  + 'px',
      height:   REEL.height + 'px',
      position: 'relative',
      overflow: 'hidden',
    });
    document.body.appendChild(REEL._dom);
  }
}

function _getOrCreateLayer(entry) {
  if (entry.el) return entry.el;
  const el   = document.createElement('div');
  el.id      = 'layer-' + entry.name;
  el.dataset.layer = entry.name;
  Object.assign(el.style, { position: 'absolute', inset: '0' });
  REEL._dom.appendChild(el);
  entry.el = el;
  return el;
}

function _applyStyles(el, styles) {
  for (const [prop, val] of Object.entries(styles)) {
    if (prop === 'content') {
      el.innerHTML = val;
    } else {
      el.style[prop] = typeof val === 'number' && !_unitlessCssProp(prop) ? val + 'px' : val;
    }
  }
}

const _UNITLESS = new Set(['opacity','zIndex','order','flex','flexGrow','flexShrink','fontWeight','lineHeight']);
function _unitlessCssProp(prop) {
  return _UNITLESS.has(prop) || prop.startsWith('animation') || prop.startsWith('transition');
}

// ── Element rendering ─────────────────────────────────────────────────────────

/** Cache of rendered element DOM nodes, keyed by index in REEL.elements. */
const _elemCache = new Map();

function _renderElements(t) {
  if (!REEL._dom) return;

  REEL.elements.forEach((entry, idx) => {
    if (!entry.element) return;

    // Elements are shown from their start time until the video ends,
    // unless the element declares a duration.
    const duration = entry.element.duration ?? (REEL.duration - entry.t);
    const visible  = t >= entry.t && t < (entry.t + duration);

    let container = _elemCache.get(idx);
    if (!container) {
      container = document.createElement('div');
      container.dataset.elemIdx = idx;
      REEL._dom.appendChild(container);
      _elemCache.set(idx, container);
    }

    if (!visible) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    const localT = t - entry.t;
    _renderElement(container, entry.element, localT);
  });
}

function _renderElement(container, el, localT) {
  switch (el.type) {
    case 'text':      return _renderText(container, el, localT);
    case 'chip':      return _renderChip(container, el, localT);
    case 'wallCard':  return _renderWallCard(container, el, localT);
    case 'imageCard': return _renderImageCard(container, el, localT);
    case 'stamp':     return _renderStamp(container, el, localT);
    case 'codeCard':  return _renderCodeCard(container, el, localT);
    case 'terminal':  return _renderTerminal(container, el, localT);
    default: break;
  }
}

function _posToStyle(x, y, width, height, stageW, stageH) {
  const styles = { position: 'absolute' };
  if (x === 'center') {
    styles.left      = Math.round((stageW - width) / 2) + 'px';
  } else {
    styles.left      = x + 'px';
  }
  if (y === 'center') {
    styles.top       = Math.round((stageH - height) / 2) + 'px';
  } else {
    styles.top       = y + 'px';
  }
  if (width  !== null) styles.width  = width  + 'px';
  if (height !== null) styles.height = height + 'px';
  return styles;
}

function _renderText(el, spec, localT) {
  const fadeOpacity = Math.min(1, localT / 0.15) * spec.opacity;
  el.innerHTML = '';
  Object.assign(el.style, {
    position:      'absolute',
    fontFamily:    spec.font,
    fontSize:      spec.size + 'px',
    fontWeight:    spec.weight,
    color:         spec.color,
    textAlign:     spec.align,
    letterSpacing: spec.letterSpacing + 'px',
    lineHeight:    spec.lineHeight,
    opacity:       fadeOpacity,
    whiteSpace:    'pre-wrap',
    pointerEvents: 'none',
  });
  el.textContent = spec.str;
  // Position
  const measuredW = REEL.width * 0.8;
  const x = spec.x === 'center' ? Math.round((REEL.width - measuredW) / 2) : spec.x;
  el.style.left   = x + 'px';
  el.style.top    = spec.y + 'px';
  el.style.width  = measuredW + 'px';
}

function _renderChip(el, spec, localT) {
  const fadeOpacity = Math.min(1, localT / 0.12);
  el.innerHTML = '';
  el.textContent = spec.str;
  Object.assign(el.style, {
    position:      'absolute',
    display:       'inline-block',
    fontSize:      spec.size + 'px',
    fontWeight:    700,
    color:         spec.color,
    background:    spec.bg,
    borderRadius:  spec.radius + 'px',
    padding:       spec.padding,
    opacity:       fadeOpacity,
    pointerEvents: 'none',
    whiteSpace:    'nowrap',
  });
  // Center horizontally if needed
  if (spec.x === 'center') {
    el.style.left      = '50%';
    el.style.transform = 'translateX(-50%)';
  } else {
    el.style.left      = spec.x + 'px';
    el.style.transform = '';
  }
  el.style.top = spec.y + 'px';
}

function _renderWallCard(el, spec, localT) {
  const fadeOpacity = Math.min(1, localT / 0.25);
  el.innerHTML = '';
  Object.assign(el.style, {
    position:       'absolute',
    width:          spec.width + 'px',
    background:     spec.bg,
    backdropFilter: `blur(${spec.blur}px)`,
    borderRadius:   spec.radius + 'px',
    padding:        spec.padding,
    display:        'flex',
    flexDirection:  'column',
    gap:            spec.gap + 'px',
    opacity:        fadeOpacity,
    pointerEvents:  'none',
    boxSizing:      'border-box',
  });
  if (spec.x === 'center') {
    el.style.left      = '50%';
    el.style.transform = 'translateX(-50%)';
  } else {
    el.style.left      = spec.x + 'px';
    el.style.transform = '';
  }
  el.style.top = spec.y + 'px';

  for (const line of spec.lines) {
    const p       = document.createElement('p');
    p.textContent = line.text || '';
    Object.assign(p.style, {
      margin:     0,
      fontSize:   (line.size  || 24) + 'px',
      fontWeight: (line.weight || 400),
      color:      line.color  || '#ffffff',
      lineHeight: '1.4',
    });
    el.appendChild(p);
  }
}

function _renderImageCard(el, spec, localT) {
  const fadeOpacity = Math.min(1, localT / 0.2);
  el.innerHTML = '';
  Object.assign(el.style, {
    position:     'absolute',
    width:        spec.width  + 'px',
    height:       spec.height + 'px',
    borderRadius: spec.radius + 'px',
    overflow:     'hidden',
    opacity:      fadeOpacity,
    pointerEvents:'none',
  });
  if (spec.x === 'center') {
    el.style.left      = '50%';
    el.style.transform = 'translateX(-50%)';
  } else {
    el.style.left      = spec.x + 'px';
    el.style.transform = '';
  }
  if (spec.y === 'center') {
    el.style.top  = '50%';
    el.style.marginTop = Math.round(-spec.height / 2) + 'px';
  } else {
    el.style.top  = spec.y + 'px';
  }

  const img = document.createElement('img');
  img.src    = spec.src;
  Object.assign(img.style, { width: '100%', height: '100%', objectFit: spec.objectFit });
  el.appendChild(img);

  if (spec.caption) {
    const cap = document.createElement('div');
    cap.textContent = spec.caption;
    Object.assign(cap.style, {
      position:   'absolute', bottom: '12px', left: '50%',
      transform:  'translateX(-50%)', fontSize: '20px',
      background: 'rgba(0,0,0,0.6)', color: '#fff',
      padding:    '4px 14px', borderRadius: '6px', whiteSpace: 'nowrap',
    });
    el.appendChild(cap);
  }
}

function _renderStamp(el, spec, localT) {
  const pop = spring(localT, { tension: 300, friction: 20 });
  el.textContent = spec.str;
  Object.assign(el.style, {
    position:      'absolute',
    left:          spec.x + 'px',
    top:           spec.y + 'px',
    fontSize:      spec.size + 'px',
    fontWeight:    900,
    color:         spec.color,
    background:    spec.bg,
    opacity:       Math.min(spec.opacity, pop),
    transform:     `rotate(${spec.angle}deg) scale(${Math.max(0.01, pop)})`,
    transformOrigin: 'left top',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    pointerEvents: 'none',
    border:        `4px solid ${spec.color}`,
    padding:       '6px 16px',
    borderRadius:  '6px',
  });
}

function _renderCodeCard(el, spec, localT) {
  const fadeOpacity = Math.min(1, localT / 0.18);
  el.innerHTML = '';
  Object.assign(el.style, {
    position:     'absolute',
    width:        spec.width + 'px',
    background:   spec.theme === 'dark' ? '#161b22' : '#f6f8fa',
    borderRadius: '10px',
    padding:      '24px',
    opacity:      fadeOpacity,
    pointerEvents:'none',
    overflow:     'hidden',
    boxSizing:    'border-box',
  });
  if (spec.x === 'center') {
    el.style.left      = '50%';
    el.style.transform = 'translateX(-50%)';
  } else {
    el.style.left      = spec.x + 'px';
    el.style.transform = '';
  }
  el.style.top = spec.y + 'px';

  const pre  = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = spec.code;
  Object.assign(code.style, {
    fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
    fontSize:   spec.size + 'px',
    color:      spec.theme === 'dark' ? '#e6edf3' : '#24292f',
    whiteSpace: 'pre',
    display:    'block',
  });
  pre.appendChild(code);
  Object.assign(pre.style, { margin: 0, overflow: 'hidden' });
  el.appendChild(pre);
}

function _renderTerminal(el, spec, localT) {
  const elapsed  = localT - spec.startT;
  if (elapsed <= 0) { el.innerHTML = ''; return; }

  const visibleCount = Math.max(0, Math.floor(elapsed / spec.lineDelay));
  const fadeOpacity  = Math.min(1, elapsed / 0.1);

  el.innerHTML = '';
  Object.assign(el.style, {
    position:     'absolute',
    width:        spec.width + 'px',
    background:   '#0d1117',
    borderRadius: '10px',
    padding:      '20px 24px',
    fontFamily:   '"Fira Code", Consolas, monospace',
    fontSize:     spec.size + 'px',
    color:        '#39d353',
    opacity:      fadeOpacity,
    pointerEvents:'none',
    boxSizing:    'border-box',
  });
  if (spec.x === 'center') {
    el.style.left      = '50%';
    el.style.transform = 'translateX(-50%)';
  } else {
    el.style.left      = spec.x + 'px';
    el.style.transform = '';
  }
  el.style.top = spec.y + 'px';

  const shown = spec.lines.slice(0, visibleCount);
  for (const line of shown) {
    const div       = document.createElement('div');
    div.textContent = line;
    div.style.lineHeight = '1.6';
    el.appendChild(div);
  }

  // Blinking cursor on the last visible line
  if (visibleCount < spec.lines.length) {
    const cursor = document.createElement('span');
    cursor.textContent = '▊';
    cursor.style.opacity = Math.round(localT * 2) % 2 === 0 ? '1' : '0';
    el.appendChild(cursor);
  }
}

// ── Caption rendering ─────────────────────────────────────────────────────────

/** Parsed caption entries loaded from outline files. */
const _captionData = new Map(); // outlinePath → [{startMs, endMs, word}]

function _renderCaptions(t) {
  if (!REEL.captions.length || !REEL._dom) return;
  const tMs = t * 1000;

  // Gather all active words across all caption files
  const words = [];
  for (const outlinePath of REEL.captions) {
    const entries = _captionData.get(outlinePath);
    if (!entries) continue;
    for (const entry of entries) {
      if (tMs >= entry.startMs && tMs < entry.endMs) {
        words.push(entry.word);
      }
    }
  }

  const captionText = words.join(' ');
  let capEl = REEL._dom.querySelector('#reel-captions');
  if (!capEl) {
    capEl    = document.createElement('div');
    capEl.id = 'reel-captions';
    REEL._dom.appendChild(capEl);
  }

  const captionY = REEL.captionY ?? (REEL.height - 140);
  Object.assign(capEl.style, {
    position:   'absolute',
    left:       '50%',
    top:        captionY + 'px',
    transform:  'translateX(-50%)',
    maxWidth:   Math.round(REEL.width * 0.85) + 'px',
    textAlign:  'center',
    fontFamily: '"Archivo", "Segoe UI", system-ui, sans-serif',
    fontSize:   '42px',
    fontWeight: 700,
    color:      '#ffffff',
    textShadow: '0 2px 8px rgba(0,0,0,0.9)',
    background: captionText ? 'rgba(0,0,0,0.55)' : 'transparent',
    padding:    captionText ? '8px 20px' : '0',
    borderRadius: '8px',
    pointerEvents: 'none',
    transition: 'none',
  });
  capEl.textContent = captionText;
}

/**
 * Load a Whisper-outline caption file (used by renderer scripts at build time).
 * Format: start_ms TAB end_ms TAB word (one per line)
 *
 * @param {string} outlinePath
 * @param {string} content     File content (caller reads from disk)
 */
export function loadCaptionData(outlinePath, content) {
  const entries = [];
  for (const line of content.split('\n')) {
    const parts = line.trim().split(/\t/);
    if (parts.length >= 3) {
      entries.push({ startMs: parseInt(parts[0], 10), endMs: parseInt(parts[1], 10), word: parts[2] });
    }
  }
  _captionData.set(outlinePath, entries);
}

// ── Browser preview loop ──────────────────────────────────────────────────────
// Only runs in a browser context (not in Playwright renderer scripts, which
// call seek(t) directly for each frame).

if (typeof window !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
  let _previewT = 0;
  let _lastRAF  = null;
  let _lastTimestamp = null;

  function _previewStep(timestamp) {
    if (_lastTimestamp !== null) {
      _previewT += (timestamp - _lastTimestamp) / 1000;
    }
    _lastTimestamp = timestamp;
    if (_previewT > REEL.duration) {
      _previewT = 0;
      _lastTimestamp = null;
    }
    seek(_previewT);
    _lastRAF = requestAnimationFrame(_previewStep);
  }

  // Auto-start after the module (and edit.js) have fully loaded
  window.addEventListener('load', () => {
    _lastRAF = requestAnimationFrame(_previewStep);
  }, { once: true });

  // Expose controls for manual inspection
  window.REEL_PREVIEW = {
    seek(t) { _previewT = t; seek(t); },
    pause()  { if (_lastRAF) cancelAnimationFrame(_lastRAF); },
    resume() { _lastRAF = requestAnimationFrame(_previewStep); },
  };
}
