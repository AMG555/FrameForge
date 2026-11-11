# Engine API — Full Function Reference

Source: `reel/engine.js`  
Load with: `import { reel, layer, at, stagger, seek, hash, ... } from './reel/engine.js';`

---

## Configuration

### `reel({ width, height, fps, duration, title })`
Sets global compositor dimensions and timeline length. Call **once** at the top of `edit.js`.  
Sets `window.DURATION` and `window.FPS` — required by the render harness.

```js
reel({ width: 1920, height: 1080, fps: 30, duration: 65 });
reel({ width: 1080, height: 1920, fps: 30, duration: 30 }); // portrait / reel
```

`REEL.captionY` — override caption baseline (px from top, default centre-bottom).

---

## Layer System

### `layer(name, { start?, end? }) → Layer`
Declare a named visual layer. Returns the same Layer if called twice with the same name.  
`start` / `end` define the shot window in seconds (default: whole film).

```js
layer('hero', { start: 3, end: 12 }).on((t, lt, dur) => ({
  opacity: lt < 0.4 ? lt / 0.4 : lt > dur - 0.4 ? (dur - lt) / 0.4 : 1,
  transform: `translateY(${(1 - spring(lt)) * 60}px)`,
}));
```

**Callback signature: `fn(t, lt, dur) → styleObject`**  
- `t` — absolute video time (seconds)  
- `lt` — local time within the shot (`t - start`)  
- `dur` — shot duration (`end - start`)

**Iron rule:** Every CSS property driven by this layer must be explicitly reset when the layer is inactive. If you return `{ opacity: 1 }` at `lt=5` but the next frame is `lt=6` where you return `null`, the browser keeps `opacity: 1`. Use:

```js
if (lt > dur) return { opacity: 0, display: 'none' };
```

---

## Timed Element Placement

### `at(t, element)`
Mount a DOM element, made visible only while `t >= start` and `t < start + element._duration`.

### `stagger(t, dt, elements[])`
Place elements with staggered delays. Returns `[{t, element}]` timing log.

```js
stagger(2.0, 0.18, [card1, card2, card3]);
// card1 appears at t=2.0, card2 at t=2.18, card3 at t=2.36
```

---

## Math & Easing

### `hash(i) → float [0, 1)`
Deterministic sin-based hash of integer `i`. **Use instead of `Math.random()`.**

```js
const x = hash(particleIndex) * REEL.width;
const wobble = hash(i + Math.floor(t * 12)); // boil at 12fps
```

### `hash2(i, j) → float [0, 1)`
Two-dimensional hash for grid seeds: `hash(i * 1000 + j)`.

### `lerp(t, a, b, t0?, t1?) → number`
Linear interpolation from `a` to `b` over `[t0, t1]`, clamped.

```js
lerp(lt, 0, 100, 0, 0.5)  // 0→100 in first 0.5 s of shot
```

### `easeIn(t)`, `easeOut(t)`, `easeInOut(t)`
Quadratic easing. Input `[0, 1]`, output `[0, 1]`.

### `spring(t, { tension?, friction?, delay? }) → float`
Closed-form damped harmonic oscillator. Returns `0 → ~1` (may briefly exceed 1 when underdamped).

| Preset | tension | friction | Character |
|--------|---------|----------|-----------|
| Snappy | 280 | 28 | Fast settle, tiny overshoot |
| Default | 200 | 22 | Natural entrance |
| Bouncy | 160 | 13 | Visible overshoot |
| Gentle | 100 | 20 | Slow, overdamped |

```js
const s = spring(lt, { tension: 200, friction: 22, delay: 0.2 });
// opacity: s,  transform: `scale(${0.88 + 0.12 * s}) translateY(${(1-s)*40}px)`
```

### `measureSpring({ tension?, friction?, threshold? }) → number`
Calculates the analytical settling time (in seconds) for a spring configuration. Eliminates guess-and-check when timing animations.

```js
const settleTime = measureSpring({ tension: 200, friction: 22 }); // ~0.72s
```

### `interpolate(val, inputRange[], outputRange[], opts?) → number`
Remotion-compatible multi-segment interpolation with clamp/identity extrapolation and custom easing.

```js
const y = interpolate(lt, [0, 0.5, 1.2], [100, 0, -20], { extrapolateRight: 'clamp' });
```

### `interpolateColors(val, inputRange[], outputColors[], opts?) → string`
Remotion-compatible perceptually uniform color interpolation with gamma correction (2.2). Blends hex and rgba colors without muddy middle grays.

```js
const bg = interpolateColors(lt, [0, 2], ['#111827', '#4f46e5']);
```

### `sequence(from, duration, fn) → (t) => styleObject`
Temporal window wrapper that scopes computation to `[from, from + duration]`. Local time is passed as first argument.

```js
layer('card').on(sequence(2.0, 4.0, (lt, dur) => ({
  opacity: lt < 0.3 ? lt / 0.3 : 1
})));
```

### `noise2D(seed, x, y) → float [-1, 1]` & `noise3D(seed, x, y, z) → float [-1, 1]`
Deterministic continuous simplex/perlin noise matching `@remotion/noise`. Zero dependencies. Essential for handheld camera shake, organic floating, and subtle rotational wobble.

```js
const shakeX = noise2D('cam', t * 3, 0) * 12; // +/-12px handheld drift
const shakeY = noise2D('cam', 0, t * 3) * 8;
```

### `evolvePath(progress, pathLength) → { strokeDasharray, strokeDashoffset }`
Path reveal utility matching `@remotion/paths`. Generates CSS stroke dash parameters to draw SVG curves smoothly.

```js
const { strokeDasharray, strokeDashoffset } = evolvePath(spring(lt), 640);
```

### `transition`
Preset transition style generators matching `@remotion/transitions`.
- `transition.fade(p)`
- `transition.slide(p, { direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' })`
- `transition.wipe(p, { direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' })`
- `transition.flip(p, { axis: 'x' | 'y' })`
- `transition.zoom(p, { from: 0.8, to: 1.0 })`

### `absoluteFill(extraStyles?) → object`
Standard layout helper matching Remotion's `<AbsoluteFill>`:
`{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }`

### `loopTime(t, duration) → number`
Loops local time within `[0, duration)` for periodic cycles, matching Remotion `<Loop>`.

### `loadGoogleFont(family, opts?) → Promise<void>`
Loads Google Fonts and prevents FOUT during headless rendering by integrating with the `delayRender` / `continueRender` async barrier.

### `kf(t, keys[], easing?) → number | number[]`
Keyframe interpolation with easing.

```js
kf(lt, [[0, 0], [0.5, 100], [1.5, 80]], easeOut)
kf(lt, [[0, [0,0]], [1, [200,100]]])  // vector interpolation
```

### `seg(t, a, b) → float [0, 1]`
Normalise `t` into `[a, b]`: `(t - a) / (b - a)`, clamped.

```js
const progress = seg(lt, 0.5, 1.5);  // 0 before 0.5s, 1 after 1.5s
```

### `pulse(t, k?) → float`
Exponential beat pulse: spikes at integer `t`, decays. `k` controls decay rate (default 6).

### `onTwos(t) → number`
Quantize time to 12 fps step — for traditional animation "on twos" look.

### `boilSeed(key, t?) → float [0, 1)`
Deterministic per-12fps-step seed for linework boil. Restarts stream per element name so parallel elements don't shift each other's randomness.

```js
const wobble = (boilSeed('outline', t) * 6) - 3;  // –3 to +3 px jitter
```

---

## Shot Registry

### `shots([ [t0, fn0], [t1, fn1], ... ])`
Register time-ordered shots. Each `fn(t, lt, dur)` is called only while its window is active. Cleaner than individual `layer()` calls for long films.

```js
shots([
  [0,  (t, lt, dur) => { /* intro  */ }],
  [5,  (t, lt, dur) => { /* hook   */ }],
  [12, (t, lt, dur) => { /* reveal */ }],
]);
```

---

## Component Builders

All components return `HTMLElement` instances. Mount with `at(t, element)` or `document.getElementById('stage').appendChild(element)`.

### `text(str, opts)`
Animated text block.

| Opt | Default | Notes |
|-----|---------|-------|
| `font` | `48px "Nirmala UI",...` | Full CSS font shorthand |
| `color` | `#ffffff` | CSS color |
| `x` | `'center'` | px or `'center'` |
| `y` | `100` | px from top |
| `align` | `'center'` | CSS text-align |

### `chip(str, opts)`
Pill-shaped label. Good for tags, captions, inline badges.

### `wallCard(lines[], opts)`
Frosted-glass card with title + body lines. For fact cards, definitions.

```js
at(5.0, wallCard(['GPS TRILATERATION', 'Signal timing from 4+ satellites pinpoints location.']));
```

### `imageCard(src, opts)`
Image with optional caption overlay.

### `browserCard(src, opts)`
Website screenshot rendered as a card (uses `<iframe>` in non-headless mode, static image in render).

### `terminal(lines[], opts)`
Animated terminal output. Lines appear one by one.

### `stamp(str, opts)`
Bold diagonal stamp. Good for `VERIFIED`, `SOURCE`, `CLAIM` overlays.

### `codeCard(code, lang?, opts)`
Syntax-highlighted code block. `lang` defaults to `'js'`.

---

## Caption Sync

### `captions(outlinePath)`
Load Whisper word-level JSON (`transcribe.py` output). Auto-displays caption bar synced to audio.

```js
captions('audio/outline.txt');
```

### `cuePhrase(phrase, offset?) → number`
Returns the video timestamp (seconds) when `phrase` starts being spoken.  
**Throws a hard build error if the phrase is not found** — re-recording VO can never silently desync the film.

```js
const tReveal = cuePhrase('and that is how GPS works');
layer('reveal').on(t => ({
  opacity: t < tReveal ? 0 : spring(t - tReveal),
}));
```

### `cue(sfxName, t, vol?)`
Trigger a sound effect at time `t`. Name resolves to `audio/sfx/<name>.mp3`.

---

## Face Layout

### `faceAt(layout, t)`
Position a talking-head face layer. Layouts: `'FULL'`, `'SPLIT'`, `'PIP'`.

---

## Raw Frame Hook

### `on(fn)`
Register a raw per-frame compute function outside the layer system. For custom canvas overlays or Three.js scenes.

---

## Global Aliases

`engine.js` sets these on `window` for the render harness:

| Global | Points to |
|--------|-----------|
| `window.seek(t)` | `seek(t)` |
| `window.__seek(t)` | `seek(t)` |
| `window.renderFrame(t)` | `seek(t)` |
| `window.DURATION` | `REEL.duration` |
| `window.FPS` | `REEL.fps` |
