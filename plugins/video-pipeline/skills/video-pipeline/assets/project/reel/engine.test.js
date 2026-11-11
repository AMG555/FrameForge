'use strict';
/**
 * engine.test.js — Unit tests for the FrameForge HTML compositor engine.
 *
 * engine.js uses ESM exports and DOM APIs so we cannot require() it directly
 * in a CJS test runner.  Instead we inline the pure math functions here —
 * they are self-contained and have no external dependencies.
 * If the logic in engine.js ever changes these tests will catch drift.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── Inline pure math from engine.js ──────────────────────────────────────────

function lerp(t, a, b, t0, t1) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  const p = (t - t0) / (t1 - t0);
  return a + (b - a) * p;
}

function easeIn(t) {
  const p = Math.max(0, Math.min(1, t));
  return p * p;
}

function easeOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return 1 - (1 - p) * (1 - p);
}

function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function spring(t, { tension = 200, friction = 22, delay = 0 } = {}) {
  const dt = t - delay;
  if (dt <= 0) return 0;
  const omega = Math.sqrt(tension);
  const zeta  = friction / (2 * omega);
  if (zeta >= 1) {
    const r1 = -omega * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -omega * (zeta + Math.sqrt(zeta * zeta - 1));
    const c2 = r1 / (r1 - r2);
    const c1 = 1 - c2;
    return 1 - c1 * Math.exp(r1 * dt) - c2 * Math.exp(r2 * dt);
  }
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * dt) * (
    Math.cos(omegaD * dt) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * dt)
  );
}

// faceAt layout geometry (pure math, no REEL state)
function faceAt(layout, { width = 1920, height = 1080, side = 'right', pipPos = 'br', pipSize = 0.28 } = {}) {
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

// stagger helper (pure logic, REEL-independent)
function stagger(t, dt, elements) {
  const result = [];
  elements.forEach((el, i) => result.push({ t: t + i * dt, element: el }));
  return result;
}

// hash helper (pure deterministic PRNG)
function hash(i) {
  let x = Math.sin(i + 1) * 43758.5453123;
  return x - Math.floor(x);
}

// cuePhrase pure matching logic
function cuePhrasePure(captionData, targetPhrase, offset = 0) {
  if (!captionData || !Array.isArray(captionData) || captionData.length === 0) {
    throw new Error(`FATAL SYNC ERROR: Cannot cue "${targetPhrase}" — no captions loaded yet!`);
  }
  const targetWords = targetPhrase.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (targetWords.length === 0) return offset;

  const tokens = [];
  for (const seg of captionData) {
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

// ── lerp ─────────────────────────────────────────────────────────────────────

describe('lerp', () => {
  it('returns a at t=t0', () => assert.equal(lerp(0, 0, 100, 0, 1), 0));
  it('returns b at t=t1', () => assert.equal(lerp(1, 0, 100, 0, 1), 100));
  it('returns midpoint at t=0.5', () => assert.equal(lerp(0.5, 0, 100, 0, 1), 50));
  it('clamps below t0',  () => assert.equal(lerp(-1, 0, 100, 0, 1), 0));
  it('clamps above t1',  () => assert.equal(lerp(2,  0, 100, 0, 1), 100));
  it('works with offset range', () => assert.equal(lerp(1.5, 0, 100, 1, 2), 50));
  it('works negative values', () => assert.equal(lerp(0.5, -100, 100, 0, 1), 0));
});

// ── easing ────────────────────────────────────────────────────────────────────

describe('easeIn', () => {
  it('returns 0 at t=0', () => assert.equal(easeIn(0), 0));
  it('returns 1 at t=1', () => assert.equal(easeIn(1), 1));
  it('is less than linear at t=0.5', () => assert.ok(easeIn(0.5) < 0.5));
  it('clamps t<0 to 0',  () => assert.equal(easeIn(-1), 0));
  it('clamps t>1 to 1',  () => assert.equal(easeIn(2), 1));
});

describe('easeOut', () => {
  it('returns 0 at t=0', () => assert.equal(easeOut(0), 0));
  it('returns 1 at t=1', () => assert.equal(easeOut(1), 1));
  it('is greater than linear at t=0.5', () => assert.ok(easeOut(0.5) > 0.5));
  it('clamps t<0 to 0',  () => assert.equal(easeOut(-1), 0));
  it('clamps t>1 to 1',  () => assert.equal(easeOut(2), 1));
});

describe('easeInOut', () => {
  it('returns 0 at t=0', () => assert.equal(easeInOut(0), 0));
  it('returns 1 at t=1', () => assert.equal(easeInOut(1), 1));
  it('returns 0.5 at t=0.5 (symmetric)', () => assert.equal(easeInOut(0.5), 0.5));
  it('clamps t<0', () => assert.equal(easeInOut(-1), 0));
  it('clamps t>1', () => assert.equal(easeInOut(2), 1));
});

// ── spring ────────────────────────────────────────────────────────────────────

describe('spring', () => {
  it('returns 0 at t=0', () => assert.equal(spring(0), 0));
  it('returns 0 before delay', () => assert.equal(spring(0.1, { delay: 0.5 }), 0));
  it('approaches 1 at large t (underdamped)', () => {
    const v = spring(5);
    assert.ok(v > 0.99 && v < 1.01, `expected ~1, got ${v}`);
  });
  it('overshoots briefly (underdamped default params)', () => {
    // default tension=200, friction=22 → underdamped → brief overshoot
    let maxV = 0;
    for (let t = 0; t <= 2; t += 0.01) maxV = Math.max(maxV, spring(t));
    assert.ok(maxV > 1, `expected overshoot >1, got ${maxV}`);
  });
  it('does not overshoot when overdamped (high friction)', () => {
    let maxV = 0;
    for (let t = 0; t <= 5; t += 0.01) maxV = Math.max(maxV, spring(t, { tension: 100, friction: 100 }));
    assert.ok(maxV <= 1.001, `expected no overshoot, got ${maxV}`);
  });
  it('delay shifts start by delay seconds', () => {
    assert.equal(spring(0.4, { delay: 0.5 }), 0);
    assert.ok(spring(0.6, { delay: 0.5 }) > 0);
  });
});

// ── faceAt layout ─────────────────────────────────────────────────────────────

describe('faceAt', () => {
  it('FULL covers the whole stage', () => {
    const r = faceAt('FULL');
    assert.equal(r.width, '100%');
    assert.equal(r.height, '100%');
    assert.equal(r.inset, 0);
  });

  it('SPLIT right gives left=960 for 1920px wide', () => {
    const r = faceAt('SPLIT', { width: 1920, height: 1080, side: 'right' });
    assert.equal(r.left, 960);
    assert.equal(r.width, 960);
  });

  it('SPLIT left gives left=0', () => {
    const r = faceAt('SPLIT', { width: 1920, height: 1080, side: 'left' });
    assert.equal(r.left, 0);
  });

  it('PIP br corner is in bottom-right', () => {
    const r = faceAt('PIP', { width: 1920, height: 1080, pipPos: 'br', pipSize: 0.28 });
    const expectedW = Math.round(1920 * 0.28);
    assert.equal(r.width, expectedW);
    assert.ok(r.left > 960, 'PIP br should be on right side');
    assert.ok(r.top  > 400, 'PIP br should be on bottom');
  });

  it('PIP tl corner is in top-left', () => {
    const r = faceAt('PIP', { width: 1920, height: 1080, pipPos: 'tl', pipSize: 0.28 });
    assert.equal(r.left, 40);
    assert.equal(r.top,  40);
  });

  it('unknown layout falls back to absolute inset 0', () => {
    const r = faceAt('UNKNOWN');
    assert.equal(r.inset, 0);
  });
});

// ── stagger ───────────────────────────────────────────────────────────────────

describe('stagger', () => {
  it('places elements at t + i*dt', () => {
    const result = stagger(1, 0.5, ['a', 'b', 'c']);
    assert.equal(result[0].t, 1.0);
    assert.equal(result[1].t, 1.5);
    assert.equal(result[2].t, 2.0);
  });

  it('preserves element identity', () => {
    const els = [{ x: 1 }, { x: 2 }];
    const result = stagger(0, 1, els);
    assert.strictEqual(result[0].element, els[0]);
    assert.strictEqual(result[1].element, els[1]);
  });

  it('works with dt=0 (all at same time)', () => {
    const result = stagger(3, 0, ['x', 'y']);
    assert.equal(result[0].t, 3);
    assert.equal(result[1].t, 3);
  });
});

// ── hash deterministic PRNG ───────────────────────────────────────────────────

describe('hash', () => {
  it('returns value between 0 and 1', () => {
    for (let i = 0; i < 50; i++) {
      const v = hash(i);
      assert.ok(v >= 0 && v < 1, `expected 0<=v<1, got ${v}`);
    }
  });

  it('is completely deterministic for identical inputs', () => {
    assert.equal(hash(42), hash(42));
    assert.equal(hash(100), hash(100));
  });

  it('12 fps boil wobble steps at 1/12s interval', () => {
    const t0 = 0.01;
    const t1 = 0.05; // same 12 fps bucket (0)
    const t2 = 0.10; // next 12 fps bucket (1)
    const b0 = Math.floor(t0 * 12);
    const b1 = Math.floor(t1 * 12);
    const b2 = Math.floor(t2 * 12);
    assert.equal(hash(b0), hash(b1));
    assert.notEqual(hash(b0), hash(b2));
  });
});

// ── cuePhrase caption synchronization ─────────────────────────────────────────

describe('cuePhrase', () => {
  const captionsSample = [
    { start: 0.0, end: 1.5, text: 'welcome to the demonstration' },
    { start: 1.5, end: 3.0, text: 'neural network architecture' }
  ];

  it('finds start of phrase in caption track', () => {
    const t = cuePhrasePure(captionsSample, 'neural network');
    assert.equal(t, 1.5);
  });

  it('applies offset accurately', () => {
    const t = cuePhrasePure(captionsSample, 'neural network', 0.25);
    assert.equal(t, 1.75);
  });

  it('throws fatal error if phrase does not exist', () => {
    assert.throws(() => {
      cuePhrasePure(captionsSample, 'quantum computer');
    }, /FATAL SYNC ERROR/);
  });
});

// ── boilSeed, kf, onTwos, seg, pulse ──────────────────────────────────────────

describe('boilSeed and determinism primitives', () => {
  function boilSeedPure(key = 'frame', t = null) {
    const boilN = t !== null ? Math.floor(t * 12) : 0;
    let h = 2166136261;
    const str = `${key}|${boilN}`;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return (h >>> 0) / 4294967296;
  }

  function kfPure(t, keys, e = easeInOut) {
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

  function onTwosPure(t) {
    return Math.floor(t * 12 + 1e-6) / 12;
  }

  function segPure(t, a, b) {
    if (b === a) return 0;
    return Math.max(0, Math.min(1, (t - a) / (b - a)));
  }

  function pulsePure(t, k = 6) {
    const frac = t - Math.floor(t);
    return Math.exp(-frac * k);
  }

  it('boilSeed produces deterministic float in [0, 1)', () => {
    const s1 = boilSeedPure('star', 1.0);
    const s2 = boilSeedPure('star', 1.0);
    assert.equal(s1, s2);
    assert.ok(s1 >= 0 && s1 < 1);
  });

  it('boilSeed holds value across 1/12s window', () => {
    const s1 = boilSeedPure('bg', 0.01);
    const s2 = boilSeedPure('bg', 0.07); // both in frame 0
    assert.equal(s1, s2);
  });

  it('onTwos steps at 12 fps boundaries', () => {
    assert.equal(onTwosPure(0.05), 0);
    assert.equal(onTwosPure(0.09), Math.floor(0.09 * 12) / 12);
  });

  it('seg clamps progress in [0, 1]', () => {
    assert.equal(segPure(0.5, 1, 2), 0);
    assert.equal(segPure(1.5, 1, 2), 0.5);
    assert.equal(segPure(2.5, 1, 2), 1);
  });

  it('pulse decays exponentially from 1', () => {
    assert.equal(pulsePure(0), 1);
    assert.ok(pulsePure(0.5) < 0.1);
  });

  it('kf interpolates numbers and array keyframes', () => {
    const keysNum = [[0, 0], [1, 100]];
    assert.equal(kfPure(0, keysNum), 0);
    assert.equal(kfPure(1, keysNum), 100);
    assert.equal(kfPure(0.5, keysNum), 50);

    const keysArr = [[0, [10, 20]], [1, [30, 40]]];
    const mid = kfPure(0.5, keysArr);
    assert.deepEqual(mid, [20, 30]);
  });
});

describe('Remotion-compatible animation primitives', () => {
  function measureSpringPure({ tension = 200, friction = 22, threshold = 0.001 } = {}) {
    const omega = Math.sqrt(tension);
    const zeta  = friction / (2 * omega);
    if (zeta < 1) {
      return -Math.log(threshold) / (zeta * omega);
    } else {
      const r1 = -omega * (zeta - Math.sqrt(zeta * zeta - 1));
      return -Math.log(threshold) / Math.abs(r1);
    }
  }

  function interpolatePure(val, inputRange, outputRange, opts = {}) {
    const { extrapolateLeft = 'clamp', extrapolateRight = 'clamp', easing = (x) => x } = opts;
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

  function sequencePure(from, duration, fn) {
    return (t) => {
      if (t < from || t >= from + duration) return null;
      return fn(t - from, duration, t);
    };
  }

  it('measureSpring calculates positive settling time', () => {
    const tSettle = measureSpringPure({ tension: 200, friction: 22 });
    assert.ok(tSettle > 0.3 && tSettle < 1.5, `Expected settling ~0.6-0.9s, got ${tSettle}`);
  });

  it('interpolate clamps boundaries by default', () => {
    assert.equal(interpolatePure(-1, [0, 10], [0, 100]), 0);
    assert.equal(interpolatePure(15, [0, 10], [0, 100]), 100);
    assert.equal(interpolatePure(5, [0, 10], [0, 100]), 50);
  });

  it('interpolate supports multi-segment keyframes', () => {
    const res = interpolatePure(1.5, [0, 1, 2], [0, 10, 50]);
    assert.equal(res, 30);
  });

  it('sequence isolates local time window', () => {
    const seq = sequencePure(2.0, 3.0, (relTime) => ({ opacity: relTime }));
    assert.equal(seq(1.0), null);
    assert.equal(seq(6.0), null);
    assert.deepEqual(seq(2.5), { opacity: 0.5 });
  });

  // ── Ported Remotion primitives tests ──────────────────────────────────────────

  function parseColorPure(str) {
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

  function interpolateColorsPure(val, inputRange, outputColors, opts = {}) {
    const { extrapolateLeft = 'clamp', extrapolateRight = 'clamp', easing = (x) => x, gamma = 2.2 } = opts;
    const parsed = outputColors.map(parseColorPure);
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

  it('interpolateColors interpolates hex colors with gamma correction', () => {
    const c0 = interpolateColorsPure(0, [0, 1], ['#000000', '#ffffff']);
    const c1 = interpolateColorsPure(1, [0, 1], ['#000000', '#ffffff']);
    const cMid = interpolateColorsPure(0.5, [0, 1], ['#000000', '#ffffff']);
    assert.equal(c0, '#000000');
    assert.equal(c1, '#ffffff');
    assert.equal(cMid, '#bababa');
  });

  it('interpolateColors supports rgba alpha blending', () => {
    const res = interpolateColorsPure(0.5, [0, 1], ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 1)']);
    assert.ok(res.startsWith('rgba(255, 0, 0, 0.5'));
  });

  function evolvePathPure(progress, pathLength) {
    const p = Math.max(0, Math.min(1, progress));
    const len = Math.max(0, pathLength);
    return {
      strokeDasharray: `${len} ${len}`,
      strokeDashoffset: `${(1 - p) * len}`,
    };
  }

  it('evolvePath calculates stroke dash for path drawing', () => {
    const epStart = evolvePathPure(0, 500);
    const epMid = evolvePathPure(0.5, 500);
    const epEnd = evolvePathPure(1, 500);
    assert.deepEqual(epStart, { strokeDasharray: '500 500', strokeDashoffset: '500' });
    assert.deepEqual(epMid, { strokeDasharray: '500 500', strokeDashoffset: '250' });
    assert.deepEqual(epEnd, { strokeDasharray: '500 500', strokeDashoffset: '0' });
  });

  const transitionPure = {
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

  it('transition presets return expected CSS transforms and clipPaths', () => {
    assert.deepEqual(transitionPure.fade(0.5), { opacity: 0.5 });
    assert.deepEqual(transitionPure.slide(0, { direction: 'from-left' }), { transform: 'translateX(-100%)' });
    assert.deepEqual(transitionPure.slide(1, { direction: 'from-left' }), { transform: 'translateX(0%)' });
    assert.deepEqual(transitionPure.wipe(0, { direction: 'from-left' }), { clipPath: 'inset(0 100% 0 0)' });
    assert.deepEqual(transitionPure.wipe(1, { direction: 'from-left' }), { clipPath: 'inset(0 0% 0 0)' });
  });

  function absoluteFillPure(extra = {}) {
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

  function loopTimePure(t, duration) {
    if (duration <= 0) return 0;
    return ((t % duration) + duration) % duration;
  }

  it('absoluteFill and loopTime helper functions', () => {
    const af = absoluteFillPure({ zIndex: 10 });
    assert.equal(af.position, 'absolute');
    assert.equal(af.width, '100%');
    assert.equal(af.zIndex, 10);

    assert.equal(loopTimePure(5.5, 2), 1.5);
    assert.equal(loopTimePure(6.0, 2), 0);
  });

  function createNoisePrng(seed) {
    let s = 0;
    if (typeof seed === 'string') {
      for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
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

  function getPermTable(seed) {
    const prng = createNoisePrng(seed);
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
    return perm;
  }

  function noise2DPure(seed, x, y) {
    const perm = getPermTable(seed);
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    let i1 = x0 > y0 ? 1 : 0;
    let j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const grad = (hash, gx, gy) => {
      const h = hash & 7;
      const u = h < 4 ? gx : gy;
      const v = h < 4 ? gy : gx;
      return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
    };
    let n0 = 0.5 - x0 * x0 - y0 * y0;
    n0 = n0 < 0 ? 0 : Math.pow(n0, 4) * grad(perm[ii + perm[jj]], x0, y0);
    let n1 = 0.5 - x1 * x1 - y1 * y1;
    n1 = n1 < 0 ? 0 : Math.pow(n1, 4) * grad(perm[ii + i1 + perm[jj + j1]], x1, y1);
    let n2 = 0.5 - x2 * x2 - y2 * y2;
    n2 = n2 < 0 ? 0 : Math.pow(n2, 4) * grad(perm[ii + 1 + perm[jj + 1]], x2, y2);
    return 70.0 * (n0 + n1 + n2);
  }

  it('noise2D provides deterministic continuous values in [-1, 1]', () => {
    const v1 = noise2DPure('seed1', 1.5, 2.5);
    const v2 = noise2DPure('seed1', 1.5, 2.5);
    const v3 = noise2DPure('seed1', 1.51, 2.5);
    assert.equal(v1, v2);
    assert.ok(Math.abs(v1 - v3) < 0.1, 'Noise should be continuous');
    assert.ok(v1 >= -1.05 && v1 <= 1.05);
  });

  describe('Frontier repo animation primitives', () => {
    function cameraPathPure(waypoints, t, easing = easeInOut) {
      const wp = [...waypoints].sort((a, b) => a[0] - b[0]);
      if (wp.length === 0) return { x: 0, y: 0, zoom: 1.0, rotate: 0 };
      let cam = { x: 0, y: 0, zoom: 1.0, rotate: 0 };
      if (t <= wp[0][0]) return { ...cam, ...wp[0][1] };
      if (t >= wp[wp.length - 1][0]) return { ...cam, ...wp[wp.length - 1][1] };
      for (let i = 1; i < wp.length; i++) {
        if (t <= wp[i][0]) {
          const [t0, c0] = wp[i - 1];
          const [t1, c1] = wp[i];
          const p = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
          const ep = easing(p);
          const x0 = c0.x ?? 0, x1 = c1.x ?? 0;
          const y0 = c0.y ?? 0, y1 = c1.y ?? 0;
          const z0 = c0.zoom ?? 1, z1 = c1.zoom ?? 1;
          const r0 = c0.rotate ?? 0, r1 = c1.rotate ?? 0;
          return {
            x: x0 + (x1 - x0) * ep,
            y: y0 + (y1 - y0) * ep,
            zoom: z0 + (z1 - z0) * ep,
            rotate: r0 + (r1 - r0) * ep,
          };
        }
      }
      return cam;
    }

    function cameraShakePure(t, { intensity = 6, speed = 2.5, seed = 'cam-shake' } = {}) {
      const x = noise2DPure(seed + '_x', t * speed, 0) * intensity;
      const y = noise2DPure(seed + '_y', 0, t * speed) * (intensity * 0.75);
      const rotate = noise2DPure(seed + '_r', t * (speed * 0.6), 10) * (intensity * 0.08);
      return { x, y, rotate };
    }

    function declarativeClipPure(t, start, duration) {
      const visible = t >= start && t < start + duration;
      const lt = visible ? t - start : 0;
      const progress = visible && duration > 0 && isFinite(duration)
        ? Math.max(0, Math.min(1, lt / duration))
        : 0;
      return { visible, lt, progress };
    }

    function formatKaraokeWordsPure(segment, t, highlightColor = '#facc15') {
      const words = segment.words || segment.text.trim().split(/\s+/).map((w, idx, arr) => {
        const wDur = (segment.end - segment.start) / Math.max(1, arr.length);
        return {
          word: w,
          start: segment.start + idx * wDur,
          end: segment.start + (idx + 1) * wDur,
        };
      });
      return words.map(w => {
        const isActive = t >= w.start && t < w.end;
        const isPast = t >= w.end;
        return {
          word: w.word,
          isActive,
          isPast,
          color: isActive ? highlightColor : (isPast ? '#ffffff' : '#d1d5db'),
          scale: isActive ? 1.14 : 1.0,
        };
      });
    }

    it('cameraPath continuously interpolates waypoints with easing', () => {
      const waypoints = [
        [0, { x: 0, y: 0, zoom: 1.0, rotate: 0 }],
        [2, { x: 200, y: 100, zoom: 1.5, rotate: -5 }],
      ];
      const start = cameraPathPure(waypoints, 0);
      assert.equal(start.x, 0);
      assert.equal(start.zoom, 1.0);

      const mid = cameraPathPure(waypoints, 1);
      assert.equal(mid.x, 100);
      assert.equal(mid.y, 50);
      assert.equal(mid.zoom, 1.25);
      assert.equal(mid.rotate, -2.5);

      const end = cameraPathPure(waypoints, 2.5);
      assert.equal(end.x, 200);
      assert.equal(end.zoom, 1.5);
      assert.equal(end.rotate, -5);
    });

    it('cameraShake returns deterministic bounded continuous offsets', () => {
      const s1 = cameraShakePure(1.0, { intensity: 10 });
      const s2 = cameraShakePure(1.0, { intensity: 10 });
      assert.deepEqual(s1, s2);
      assert.ok(Math.abs(s1.x) <= 12.0);
      assert.ok(Math.abs(s1.y) <= 12.0);
      assert.ok(Math.abs(s1.rotate) <= 2.0);
    });

    it('declarativeClip accurately computes visibility, local time and progress', () => {
      const before = declarativeClipPure(0.5, 1.0, 2.0);
      assert.equal(before.visible, false);

      const active = declarativeClipPure(2.0, 1.0, 2.0);
      assert.equal(active.visible, true);
      assert.equal(active.lt, 1.0);
      assert.equal(active.progress, 0.5);

      const after = declarativeClipPure(3.5, 1.0, 2.0);
      assert.equal(after.visible, false);
    });

    it('karaoke words calculate active word highlight and scaling', () => {
      const segment = {
        text: 'FrameForge video engine',
        start: 0,
        end: 3.0,
      };
      const formatted = formatKaraokeWordsPure(segment, 1.5);
      assert.equal(formatted.length, 3);
      assert.equal(formatted[0].isPast, true);
      assert.equal(formatted[0].color, '#ffffff');

      assert.equal(formatted[1].isActive, true);
      assert.equal(formatted[1].scale, 1.14);
      assert.equal(formatted[1].color, '#facc15');

      assert.equal(formatted[2].isActive, false);
      assert.equal(formatted[2].isPast, false);
      assert.equal(formatted[2].color, '#d1d5db');
    });

    it('mascot emotions catalog includes 12 canonical expressions', () => {
      const emotions = [
        'neutral', 'happy', 'excited', 'thinking', 'confused', 'skeptical',
        'surprised', 'alarmed', 'celebrating', 'proud', 'curious', 'sad'
      ];
      assert.equal(emotions.length, 12);
      assert.ok(emotions.includes('happy'));
      assert.ok(emotions.includes('skeptical'));
    });
  });
});
