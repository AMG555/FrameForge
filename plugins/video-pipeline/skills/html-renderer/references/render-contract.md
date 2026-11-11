# Render Contract — Deterministic Frame Specification

This document specifies the strict mathematical and runtime contract required for all FrameForge HTML-as-compositor rendering engines.

---

## 1. Pure Mathematical Function of Time: $F(t) \to \text{Pixels}$

Every scene page must behave as a pure, stateless function of time $t$ in seconds:

$$\text{Frame}(t) = \mathcal{R}(\text{SceneState}(t))$$

- **Zero Memory Leaks**: Frame $N$ must never depend on whether Frame $N-1$ was previously rendered.
- **Out-of-Order Parallelism**: Frames can be rendered out of sequence across multiple worker threads (e.g. Worker 1 renders $t=1.0\text{s}$, Worker 2 renders $t=0.2\text{s}$, Worker 3 renders $t=2.5\text{s}$).

---

## 2. Virtual Clock Interception

The harness injects a virtual clock prior to page script execution (`capture.mjs`):

- **Overridden APIs**:
  - `window.performance.now()` $\to$ returns $t \times 1000$
  - `Date.now()` $\to$ returns `virtualEpoch + t * 1000`
  - `window.Date` constructor $\to$ anchored to `VirtualDate(t)`
  - `requestAnimationFrame(cb)` $\to$ registered into a synchronized callback queue
  - `CSS Animations` $\to$ synced via `document.getAnimations().forEach(a => a.currentTime = t * 1000)`

---

## 3. Seeded PRNG Determinism Invariant

Standard `Math.random()` produces divergent frames on repeated renders and breaks cache hashing.
- **Forbidden**: `Math.random()`
- **Required**: Seeded PRNG (`sfc32` or deterministic integer hashing).
- **Time-Synchronized Reseed**:
  ```javascript
  let _seed = (0x2F6E2B1 ^ Math.imul(Math.floor(t * 1000), 0x9E3779B9)) | 0;
  function prng() {
    _seed = (_seed + 0x6D2B79F5) | 0;
    let x = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
  ```

---

## 4. Three-Point Purity Gate (`verify-purity.mjs`)

Every scene must pass the 3-point purity gate prior to full-rate production encoding:
1. **Repeat Check**: Sampling $t = 1.0\text{s}$ twice in succession must yield identical SHA-256 frame hashes.
2. **Wander Check**: Seeking forward $0\text{s} \to 2.5\text{s}$ and then jumping back to $1.0\text{s}$ must yield the identical hash as the cold seek.
3. **Cold Jump Check**: Spawning a fresh browser session and seeking immediately to $1.0\text{s}$ must match the sequential seek.

---

## 5. Master Encoding Contract (`encode.mjs`)

Output MP4s must comply with broadcast and streaming color standards:
- **Codec**: `libx264` (Profile: High, Level: 4.2)
- **Pixel Format**: `yuv420p`
- **Color Matrix**: `BT.709` tags:
  `-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`
- **Audio Synchronization**: Exact audio mux with 18dB voiceover sidechain ducking.

