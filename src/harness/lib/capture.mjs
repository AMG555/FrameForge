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
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    if (_delayHandles.size > 0) {
      const startW = _realDateNow();
      while (_delayHandles.size > 0 && _realDateNow() - startW < 10000) {
        await new Promise(r => _realSetTimeout(r, 10));
      }
    }
  };
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
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });

  await page.setViewportSize({ width, height });
  return page;
}

export async function captureFrame(page, t, { type = 'image/png', quality = 0.94 } = {}) {
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
  }, { time: t, mime: type, q: quality });

  if (typeof dataUrl === 'string' && dataUrl.includes(',')) {
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  }

  const screenshotType = type === 'image/jpeg' ? 'jpeg' : 'png';
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
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
