/**
 * capture.mjs — Virtual Clock Injection & Deterministic Frame Stepper
 *
 * Replaces Date.now, performance.now, requestAnimationFrame, setTimeout/setInterval,
 * and CSS animations with a virtual clock. Supports both canvas/WebGL renderAt(t)
 * and DOM/canvas seek(t).
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export const VIRTUAL_CLOCK_INJECTION = `
(function () {
  let _now = 0;
  let _rafQueue = new Map();
  let _rafId = 0;
  let _timerQueue = [];
  let _timerId = 0;
  const _realDateNow = Date.now;
  const _realSetTimeout = window.setTimeout;
  const _startDate = _realDateNow();
  const _delayHandles = new Set();
  let _delayId = 0;

  window.delayRender = (label = 'asset') => {
    const id = ++_delayId;
    _delayHandles.add(id);
    return id;
  };
  window.continueRender = (id) => {
    _delayHandles.delete(id);
  };
  window.cancelRender = (err) => {
    console.error("Render cancelled:", err);
  };

  window.__playwright = true;

  // 1. Deterministic clocks
  performance.now = () => _now;
  const OriginalDate = window.Date;
  class VirtualDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(_startDate + _now);
      } else {
        super(...args);
      }
    }
    static now() {
      return Math.floor(_startDate + _now);
    }
  }
  window.Date = VirtualDate;
  Date.now = () => _startDate + _now;

  // 2. Deterministic requestAnimationFrame
  window.requestAnimationFrame = (cb) => {
    const id = ++_rafId;
    _rafQueue.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    _rafQueue.delete(id);
  };

  // 3. Virtual timer queue
  window.setTimeout = (fn, delay = 0, ...args) => {
    const id = ++_timerId;
    _timerQueue.push({ id, runAt: _now + Math.max(0, delay), fn, args, repeat: 0 });
    _timerQueue.sort((a, b) => a.runAt - b.runAt);
    return id;
  };
  window.clearTimeout = (id) => {
    const idx = _timerQueue.findIndex(t => t.id === id);
    if (idx !== -1) _timerQueue.splice(idx, 1);
  };
  window.setInterval = (fn, interval = 0, ...args) => {
    const id = ++_timerId;
    const step = Math.max(16, interval);
    _timerQueue.push({ id, runAt: _now + step, fn, args, repeat: step });
    _timerQueue.sort((a, b) => a.runAt - b.runAt);
    return id;
  };
  window.clearInterval = (id) => {
    const idx = _timerQueue.findIndex(t => t.id === id);
    if (idx !== -1) _timerQueue.splice(idx, 1);
  };

  // 4. Deterministic Seeded PRNG fallback for unseeded Math.random()
  let _seed = 0x2F6E2B1;
  const resetSeed = (tSec) => {
    _seed = (0x2F6E2B1 ^ Math.imul(Math.floor(tSec * 1000), 0x9E3779B9)) | 0;
  };
  window.Math.random = () => {
    _seed = (_seed + 0x6D2B79F5) | 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // 5. Virtual time advance
  window.__advance = (ms) => {
    _now += ms;
    while (_timerQueue.length > 0 && _timerQueue[0].runAt <= _now) {
      const item = _timerQueue.shift();
      try { item.fn(...item.args); } catch (_) {}
      if (item.repeat > 0) {
        item.runAt = _now + item.repeat;
        _timerQueue.push(item);
        _timerQueue.sort((a, b) => a.runAt - b.runAt);
      }
    }
    const currentRafs = Array.from(_rafQueue.values());
    _rafQueue.clear();
    currentRafs.forEach(cb => { try { cb(_now); } catch (_) {} });

    try {
      if (document.getAnimations) {
        document.getAnimations().forEach(a => {
          if (a.playState !== 'paused') a.pause();
          a.currentTime = _now;
        });
      }
    } catch (_) {}
  };

  // 6. Absolute virtual seek
  window.__seek = async (t) => {
    _now = t * 1000;
    resetSeed(t);

    // Pause & seek CSS animations
    try {
      if (document.getAnimations) {
        document.getAnimations().forEach(a => {
          if (a.playState !== 'paused') a.pause();
          a.currentTime = _now;
        });
      }
    } catch (_) {}

    if (window.seek) {
      await window.seek(t);
    } else if (window.renderAt) {
      await window.renderAt(t);
    }
    while (_timerQueue.length > 0 && _timerQueue[0].runAt <= _now) {
      const item = _timerQueue.shift();
      try { item.fn(...item.args); } catch (_) {}
    }
    if (!window.__fontsReady && document.fonts && document.fonts.ready) {
      await document.fonts.ready;
      window.__fontsReady = true;
    }

    // Wait for any delayRender handles — max 3s to avoid pipeline stalls
    if (_delayHandles.size > 0) {
      const startW = _realDateNow();
      while (_delayHandles.size > 0 && _realDateNow() - startW < 3000) {
        await new Promise(r => _realSetTimeout(r, 10));
      }
      // Force-clear stale handles so we never block indefinitely
      _delayHandles.clear();
    }
  };

  // ── Auto-Purify Video Canvas & DOM (Zero Scene Numbers & Zero Player Chrome) ──
  try {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-frameforge-purifier', 'true');
    styleEl.textContent = \`
      #scrub, .scrub, input[type="range"], #time, .time, .timeline, .timeline-bar, .progress-bar,
      .hud-counter, .scene-num, .scene-number, .scene-counter, .chapter-num,
      [class*="scene-num"], [class*="scene-count"], [id*="scene-num"],
      .loading, .spinner, .buffer, .buffering, [class*="spinner"], [class*="loading-overlay"], [id*="loading"],
      .watermark, .footer-source {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    \`;
    if (document.head) document.head.appendChild(styleEl);
    else document.addEventListener('DOMContentLoaded', () => document.head && document.head.appendChild(styleEl));

    const purgeDomNodes = () => {
      try {
        const elements = document.querySelectorAll('div, span, p, h1, h2, h3, h4, header, footer');
        for (const el of elements) {
          if (el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
          if (el.children.length > 2) continue;
          const txt = (el.textContent || '').trim();
          if (/^(?:scene|slide|chapter|part|step)?\\s*\\[?\\s*\\d{1,2}\\s*(?:\\/|\\s+of\\s+)\\s*\\d{1,2}\\s*\\]?$/i.test(txt) ||
              /^(?:loading|buffering|video loading)\\b/i.test(txt) ||
              /(?:satellite\\s*:|boundary\\s*:|datameet|official\\s+indian\\s+claim|\\bexplainer$)/i.test(txt)) {
            el.style.setProperty('display', 'none', 'important');
          }
        }
      } catch (_) {}
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', purgeDomNodes);
    } else {
      purgeDomNodes();
    }

    if (typeof CanvasRenderingContext2D !== 'undefined') {
      const _origFillText = CanvasRenderingContext2D.prototype.fillText;
      const _origStrokeText = CanvasRenderingContext2D.prototype.strokeText;
      const _origFillRect = CanvasRenderingContext2D.prototype.fillRect;

      function isBannedText(text, x, y, ctx) {
        if (typeof text !== 'string') return false;
        const s = text.trim();
        if (!s) return false;

        if (/^(?:scene|slide|chapter|part|step)?\\s*\\[?\\s*\\d{1,2}\\s*(?:\\/|\\s+of\\s+)\\s*\\d{1,2}\\s*\\]?$/i.test(s)) return true;
        if (/^(?:scene|slide|chapter|part|step)\\s*\\d+[:.\\s-]*$/i.test(s)) return true;
        if (/^(?:loading|buffering|status\\s*:|rendering|video loading|buffer)\\b/i.test(s)) return true;

        const h = (ctx && ctx.canvas) ? ctx.canvas.height : 1080;
        const isCorner = (y < 120 || y > h - 120);
        if (isCorner) {
          if (/(?:satellite|boundary|datameet|official\\s+.*claim|\\bexplainer$|nasa\\s*\\/)/i.test(s)) return true;
          if (/^\\d{1,2}:\\d{2}(?::\\d{2})?\\s*\\/\\s*\\d{1,2}:\\d{2}/.test(s)) return true;
        }
        return false;
      }

      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
        if (isBannedText(text, x, y, this)) return;
        return _origFillText.apply(this, arguments);
      };

      CanvasRenderingContext2D.prototype.strokeText = function (text, x, y, maxWidth) {
        if (isBannedText(text, x, y, this)) return;
        return _origStrokeText.apply(this, arguments);
      };

      CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
        const cHeight = (this.canvas && this.canvas.height) ? this.canvas.height : 1080;
        if (y >= cHeight - 24 && h <= 10 && w > 50) return;
        return _origFillRect.apply(this, arguments);
      };
    }
  } catch (_) {}
})();
`;

export async function openPageWithVirtualClock(browserOrOpts, htmlPathArg, optsArg = {}) {
  let browser, htmlPath, width, height;
  if (browserOrOpts && typeof browserOrOpts === 'object' && browserOrOpts.browser) {
    browser  = browserOrOpts.browser;
    htmlPath = browserOrOpts.htmlPath;
    width    = browserOrOpts.width || 1920;
    height   = browserOrOpts.height || 1080;
  } else {
    browser  = browserOrOpts;
    htmlPath = htmlPathArg;
    width    = optsArg.width || 1920;
    height   = optsArg.height || 1080;
  }
  const page = await browser.newPage();
  await page.addInitScript(VIRTUAL_CLOCK_INJECTION);

  const fileUrl = pathToFileURL(path.resolve(htmlPath)).href;
  await page.goto(fileUrl, { waitUntil: 'load' });

  // Await fonts before frame 0
  await page.evaluate(async () => {
    if (!window.__fontsReady && document.fonts && document.fonts.ready) {
      await document.fonts.ready;
      window.__fontsReady = true;
    }
  });

  await page.setViewportSize({ width, height });
  return page;
}

export async function captureFrame(page, t, { type = 'image/png', quality = 0.94, timeoutMs = 15000 } = {}) {
  // Hide the preview player bar (.bar) on every frame capture so it never bleeds into the output.
  // This is idempotent — repeated calls are a no-op once the style tag exists.
  await page.evaluate(() => {
    if (!document.getElementById('__ff_hide_bar')) {
      const s = document.createElement('style');
      s.id = '__ff_hide_bar';
      s.textContent = '.bar,.bar~*,[class*="player"],[class*="controls"],[id*="scrub"],[id*="time"]{display:none!important}';
      document.head.appendChild(s);
    }
  }).catch(() => {});

  // page.evaluate with an explicit timeout so a hung seek() never stalls the whole pipeline
  const dataUrl = await page.evaluate(async ({ time, mime, q }) => {
    await window.__seek(time);
    if (window.renderAt) {
      const res = await window.renderAt(time, mime, q);
      if (typeof res === 'string' && res.includes(',')) return res;
    }
    const canvas = document.getElementById('stage') || document.querySelector('canvas');
    if (canvas && typeof canvas.toDataURL === 'function') {
      try {
        return canvas.toDataURL(mime, q);
      } catch (_) {}
    }
    return null;
  }, { time: t, mime: type, q: quality }, { timeout: timeoutMs });

  if (typeof dataUrl === 'string' && dataUrl.includes(',')) {
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  }

  // Fall back to page.screenshot() — target the canvas element only so the
  // surrounding player UI (scrubber, time display, control bar) is never captured.
  const screenshotType = type === 'image/jpeg' ? 'jpeg' : 'png';
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const canvasEl = await page.$('#stage, canvas');
      if (canvasEl) {
        return await canvasEl.screenshot({
          type: screenshotType,
          quality: screenshotType === 'jpeg' ? Math.round(quality * 100) : undefined,
        });
      }
      return await page.screenshot({
        type: screenshotType,
        quality: screenshotType === 'jpeg' ? Math.round(quality * 100) : undefined,
      });
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 60 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}
