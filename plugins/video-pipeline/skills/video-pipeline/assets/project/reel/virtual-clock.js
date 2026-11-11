/**
 * virtual-clock.js — FrameForge Deterministic Virtual Clock Shim
 *
 * Intercepts browser timing primitives to enable frame-exact, deterministic
 * time control for headless video rendering.
 *
 * Laws enforced:
 *   1. Read time, not frames (seek(t) is absolute time in seconds).
 *   2. Seed everything (Math.random replaced with seeded PRNG).
 *   3. No integrating physics (timers scheduled along virtual timeline).
 *   4. Await document.fonts.ready before resolving seek().
 */
(() => {
  let virtualTime = 0;
  const rafCallbacks = new Map();
  let rafIdCounter = 0;
  const timeoutQueue = [];
  let timeoutIdCounter = 0;
  const _realDateNow = Date.now;
  const _realSetTimeout = window.setTimeout;
  const startDate = _realDateNow();

  window.__playwright = true;

  // 1. Hijack performance.now & Date
  window.performance.now = () => virtualTime;
  const OriginalDate = window.Date;
  class VirtualDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(startDate + virtualTime);
      } else {
        super(...args);
      }
    }
    static now() {
      return Math.floor(startDate + virtualTime);
    }
  }
  window.Date = VirtualDate;

  // 2. Hijack requestAnimationFrame & cancelAnimationFrame
  window.requestAnimationFrame = (callback) => {
    const id = ++rafIdCounter;
    rafCallbacks.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    rafCallbacks.delete(id);
  };

  // 3. Hijack setTimeout / clearTimeout / setInterval / clearInterval
  window.setTimeout = (callback, delay = 0, ...args) => {
    const id = ++timeoutIdCounter;
    timeoutQueue.push({ id, runAt: virtualTime + Math.max(0, delay), callback, args, repeat: 0 });
    timeoutQueue.sort((a, b) => a.runAt - b.runAt);
    return id;
  };
  window.clearTimeout = (id) => {
    const idx = timeoutQueue.findIndex(item => item.id === id);
    if (idx !== -1) timeoutQueue.splice(idx, 1);
  };
  window.setInterval = (callback, interval = 0, ...args) => {
    const id = ++timeoutIdCounter;
    const step = Math.max(16, interval);
    timeoutQueue.push({ id, runAt: virtualTime + step, callback, args, repeat: step });
    timeoutQueue.sort((a, b) => a.runAt - b.runAt);
    return id;
  };
  window.clearInterval = (id) => {
    const idx = timeoutQueue.findIndex(item => item.id === id);
    if (idx !== -1) timeoutQueue.splice(idx, 1);
  };

  // 4. Seeded PRNG replacement for Math.random()
  // CRITICAL: re-derive seed from virtualTime on every call so that seek(t) gives
  // the SAME random sequence regardless of how many frames were rendered before it.
  // This matches the harness-injected shim in capture.mjs and ensures dev-preview
  // mode is deterministic even without Playwright in the loop.
  window.Math.random = () => {
    let s = (0x2F6E2B1 ^ Math.imul(Math.floor(virtualTime), 0x9E3779B9)) | 0;
    s = (s + 0x6D2B79F5) | 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  // 4b. Remotion-pattern delayRender / continueRender async barrier
  const delayRenderHandles = new Set();
  let delayRenderCounter = 0;
  window.delayRender = (label = 'asset') => {
    const id = ++delayRenderCounter;
    delayRenderHandles.add(id);
    return id;
  };
  window.continueRender = (id) => {
    delayRenderHandles.delete(id);
  };
  window.cancelRender = (err) => {
    console.error("Render cancelled:", err);
  };

  // 5. Global seek contract
  window.seek = async (tSeconds) => {
    virtualTime = tSeconds * 1000;
    seed = (0x2F6E2B1 ^ Math.imul(Math.floor(tSeconds * 1000), 0x9E3779B9)) | 0;

    // Flush due timeouts
    while (timeoutQueue.length > 0 && timeoutQueue[0].runAt <= virtualTime) {
      const item = timeoutQueue.shift();
      try {
        item.callback(...item.args);
      } catch (err) {
        console.error("VirtualClock Timeout Error:", err);
      }
      if (item.repeat > 0) {
        item.runAt = virtualTime + item.repeat;
        timeoutQueue.push(item);
        timeoutQueue.sort((a, b) => a.runAt - b.runAt);
      }
    }

    // Flush current RAF callbacks
    const currentRafs = Array.from(rafCallbacks.values());
    rafCallbacks.clear();
    for (const cb of currentRafs) {
      try {
        cb(virtualTime);
      } catch (err) {
        console.error("VirtualClock RAF Error:", err);
      }
    }

    // Pause & seek CSS animations
    try {
      if (document.getAnimations) {
        document.getAnimations().forEach(a => {
          if (a.playState !== 'paused') a.pause();
          a.currentTime = virtualTime;
        });
      }
    } catch (_) {}

    // Custom scene render hook if exposed
    if (typeof window.renderFrame === "function") {
      await window.renderFrame(tSeconds);
    }

    // Await font readiness
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Await all async delayRender handles before resolving seek
    if (delayRenderHandles.size > 0) {
      const startW = _realDateNow();
      while (delayRenderHandles.size > 0 && _realDateNow() - startW < 10000) {
        await new Promise(r => _realSetTimeout(r, 10));
      }
    }
  };

  // Bridge for renderer
  window.__seek = window.seek;

  window.__VIRTUAL_CLOCK_INSTALLED__ = true;
})();

