# Remotion Design Patterns in FrameForge

FrameForge ports Remotion's industry-standard motion primitives directly into its pure HTML/Playwright compositor. This document provides a side-by-side mapping and explains how to port Remotion code into FrameForge with zero React overhead, instant execution, and zero commercial licensing restrictions.

---

## 1. Architectural Comparison

| Dimension | Remotion (`remotion-dev/remotion`) | FrameForge (`html-renderer`) |
| :--- | :--- | :--- |
| **Runtime** | React 18/19, Babel/Vite bundler | Pure ES Modules, zero build step |
| **License** | Commercial license ($25+/dev/mo for >3 devs) | Pure MIT License |
| **Frame Execution** | React re-renders virtual DOM per frame | Direct `seek(t)` property dispatch |
| **Deterministic Clock** | Custom webpack injection & timing hooks | Playwright Virtual Clock injection |
| **Cold Startup** | 3–10 seconds (bundler startup + bundle load) | Instant (<100ms native browser load) |
| **Visual Math** | Analytical springs, noise, interpolation | 100% mathematically identical algorithms |

---

## 2. Concept Mapping Table

| Remotion Concept | FrameForge Primitive | Signature / Usage |
| :--- | :--- | :--- |
| `<Composition>` | `reel(opts)` | `reel({ width: 1920, height: 1080, fps: 30, duration: 60 })` |
| `<Sequence from={f} durationInFrames={d}>` | `sequence(from, dur, fn)` / `layer(name, { start, end })` | Scoped relative timeline window `[start, end]` |
| `useCurrentFrame()` / `useVideoConfig()` | `(t, lt, dur)` in layer handler | `layer('x').on((t, lt, dur) => ({ ... }))` |
| `<AbsoluteFill>` | `absoluteFill(extraStyles)` | Full-bleed absolute overlay preset |
| `interpolate()` | `interpolate(val, inRange, outRange, opts)` | Multi-segment range mapping with clamp/identity |
| `interpolateColors()` | `interpolateColors(val, inRange, outColors, opts)` | Gamma-corrected (2.2) perceptual color interpolation |
| `spring()` | `spring(t, opts)` | Analytical damped harmonic oscillator ($0 \to 1$) |
| `measureSpring()` | `measureSpring(opts)` | Closed-form settling time ($t_{\text{settle}} = -\ln(\epsilon) / (\zeta \omega)$) |
| `delayRender()` / `continueRender()` | `window.delayRender()` / `window.continueRender()` | Async screenshot barrier awaiting textures/shaders/fonts |
| `@remotion/noise` | `noise2D(seed, x, y)` / `noise3D(seed, x, y, z)` | Deterministic continuous gradient noise ($[-1, 1]$) |
| `@remotion/paths` (`evolvePath`) | `evolvePath(progress, length)` | SVG `strokeDasharray` & `strokeDashoffset` calculator |
| `@remotion/transitions` | `transition.slide()`, `.wipe()`, `.fade()`, `.flip()` | CSS transform and clip-path generators |
| `<Loop durationInFrames={d}>` | `loopTime(t, duration)` | `t % duration` modulo loop time |
| `@remotion/google-fonts` | `loadGoogleFont(family, opts)` | Dynamic web font loader with automatic render barrier |

---

## 3. Side-by-Side Implementations

### A. Spring Motion with Analytical Settling Time

#### Remotion:
```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const MyComponent = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 200, mass: 1 } });
  return <div style={{ transform: `scale(${progress})` }}>Hello</div>;
};
```

#### FrameForge:
```js
import { layer, spring, measureSpring } from './reel/engine.js';

// Precompute exact duration of entrance animation
const settleTime = measureSpring({ tension: 200, friction: 22 }); // 0.72s

layer('hero', { start: 0, end: 10 }).on((t, lt) => {
  const s = spring(lt, { tension: 200, friction: 22 });
  return {
    transform: `scale(${0.85 + 0.15 * s})`,
    opacity: s,
  };
});
```

---

### B. Gamma-Corrected Color Blending

Linear interpolation between saturated colors results in dull brown/gray midpoints. FrameForge uses Remotion's gamma-corrected linear-light transfer ($r^{2.2}$).

```js
import { layer, interpolateColors } from './reel/engine.js';

layer('background').on((t) => ({
  backgroundColor: interpolateColors(
    t,
    [0, 2.5, 5],
    ['#ff0055', '#00e5ff', '#ffe600']
  ),
}));
```

---

### C. Handheld Organic Camera Shake (`noise2D`)

```js
import { layer, noise2D } from './reel/engine.js';

layer('camera').on((t) => {
  const shakeX = noise2D('handheld', t * 2.5, 0) * 8; // +/- 8px
  const shakeY = noise2D('handheld', 0, t * 2.5) * 6; // +/- 6px
  const rot = noise2D('handheld', t * 1.5, 10) * 0.75; // +/- 0.75 deg
  return {
    transform: `translate(${shakeX}px, ${shakeY}px) rotate(${rot}deg)`,
  };
});
```

---

### D. Path Drawing & Handwriting Reveal (`evolvePath`)

```js
import { evolvePath, spring } from './reel/engine.js';

const pathEl = document.getElementById('chart-line');
const totalLen = pathEl.getTotalLength();

layer('chart', { start: 1, end: 5 }).on((t, lt) => {
  const progress = spring(lt, { tension: 150, friction: 20 });
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, totalLen);
  pathEl.style.strokeDasharray = strokeDasharray;
  pathEl.style.strokeDashoffset = strokeDashoffset;
});
```

---

### E. Transitions between Shots

```js
import { layer, transition, seg } from './reel/engine.js';

// Wipe entrance over first 0.5s of shot
layer('b-roll', { start: 5, end: 10 }).on((t, lt) => {
  const inProgress = seg(lt, 0, 0.5);
  return {
    ...transition.wipe(inProgress, { direction: 'from-left' }),
  };
});
```

---

### F. Async Texture / Shader / Font Preloading (`delayRender`)

When loading remote media or compiling Three.js WebGL shaders, prevent Playwright from screenshotting prematurely:

```js
import { loadGoogleFont } from './reel/engine.js';

// Automatically acquires delayRender, loads font weights, and continues render
await loadGoogleFont('Space Grotesk', { weights: [400, 600, 700] });

// Manual async assets:
const handle = window.delayRender('loading-hdr-texture');
const texture = await new THREE.TextureLoader().loadAsync('assets/hdr.jpg');
window.continueRender(handle);
```

