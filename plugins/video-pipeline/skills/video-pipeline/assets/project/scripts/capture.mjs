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
  const _startDate = Date.now();

  window.__playwright = true;

  // 1. Deterministic clocks
  performance.now = () => _now;
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
      document.getAnimations().forEach(a => {
        if (a.playState !== 'paused') a.pause();
        a.currentTime = _now;
      });
    } catch (_) {}
  };

  // 6. Absolute virtual seek
  window.__seek = async (t) => {
    _now = t * 1000;
    if (window.renderAt) {
      await window.renderAt(t);
    } else if (window.seek) {
      await window.seek(t);
    }
    while (_timerQueue.length > 0 && _timerQueue[0].runAt <= _now) {
      const item = _timerQueue.shift();
      try { item.fn(...item.args); } catch (_) {}
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  };
})();
`;

export async function openPageWithVirtualClock(browser, htmlPath, { width = 1920, height = 1080 } = {}) {
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
      return await window.renderAt(time, mime, q);
    }
    return null;
  }, { time: t, mime: type, q: quality });

  if (typeof dataUrl === 'string' && dataUrl.includes(',')) {
    return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  }

  const screenshotType = type === 'image/jpeg' ? 'jpeg' : 'png';
  return page.screenshot({
    type: screenshotType,
    quality: screenshotType === 'jpeg' ? Math.round(quality * 100) : undefined,
  });
}
