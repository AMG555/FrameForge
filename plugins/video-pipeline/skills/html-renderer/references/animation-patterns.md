# Advanced Animation Patterns — ClaudeAnimationBase + OneTake + Collage B-Roll

Derived from:
- `JohnHeibel/ClaudeAnimationBase` — organic 12fps cel boil and character emotions (Opus 5.5 pattern)
- `feitangyuan/onetake` — continuous single-shot seamless camera choreography (zero-cut spline)
- `pyang5166/gbro-collage-broll` — editorial paper collage + halftone 2.5D tilt

---

## 1. ClaudeAnimationBase — 12fps Organic Cel Boil

The ClaudeAnimationBase pattern was engineered specifically for Claude Code + Opus 5.5
code-driven animation. The core idea: hand-drawn frames never hold still. Apply
deterministic seeded wobble at exactly 12fps to simulate organic life.

### Iron Rules (ClaudeAnimationBase contract)

1. **Quantize to 12fps**: `const step = Math.floor(t * 12)` — animation updates only on 12fps grid, not every rendered frame.
2. **Seeded determinism**: `Math.sin(seed * 19.37 + step * 2.41) * amplitude` — seed is a fixed number per element, never `Math.random()`.
3. **3-property boil on all hand-drawn entities**: position boil ± 2px, rotation boil ± 3deg, scale boil 0.97–1.03.
4. **Character emotion states**: encode as integer (0=neutral, 1=happy, 2=surprised, 3=concerned, 4=excited) and blend linearly between keyframe poses.
5. **Never use CSS transitions** — all motion is pure JS returning computed styles per-frame.

### 12fps Boil Template

```javascript
// In edit.js — organic 12fps boil on a character/doodle element
layer('char_body').on((t, lt, dur) => {
  if (lt < 0 || lt > dur) return { opacity: 0, display: 'none' };

  // Quantize to 12fps grid (ClaudeAnimationBase rule #1)
  const step = Math.floor(lt * 12);
  const seed = 7.3;  // fixed per element, never random

  // Seeded position boil (rule #2)
  const bx = Math.sin(seed * 19.37 + step * 2.41) * 2.4;  // ±2.4px X
  const by = Math.cos(seed * 11.29 + step * 1.87) * 1.8;  // ±1.8px Y

  // Scale boil (subtle breathing life, rule #3)
  const sc = 1.0 + Math.sin(seed * 7.11 + step * 3.14) * 0.025;

  // Rotation boil (organic wobble)
  const rot = Math.sin(seed * 13.71 + step * 0.79) * 1.8; // ±1.8deg

  // Spring entrance (motion craft rule #1)
  const enter = spring(lt, { tension: 200, friction: 20 });
  const exit  = lt > dur - 0.25 ? 1 - (dur - lt) / 0.25 : 0;
  const opacity = enter * (1 - exit);

  return {
    opacity,
    transform: `translate(${bx}px, ${by}px) scale(${sc * (0.88 + 0.12 * enter)}) rotate(${rot}deg)`,
  };
});
```

### Character Emotion Blending

```javascript
// Emotion state: 0=neutral, 1=happy, 2=surprised, 3=concerned
// Encoded as a fractional value for smooth cross-blend
const emotion = 0;  // set per scene

// Eyebrow positions per emotion [neutral, happy, surprised, concerned]
const browY = [0, -4, -10, 2];
const mouthCurve = [0, 8, 4, -5]; // positive = smile, negative = frown

const eyebrowShift = browY[emotion] || 0;
const mouthShift   = mouthCurve[emotion] || 0;
```

---

## 2. OneTake Continuous Camera Choreography

The OneTake pattern eliminates every hard cut. The entire video lives in one
continuous 2.5D coordinate space. The camera moves through it via spring-physics
spline rather than mounting/unmounting DOM elements.

### Spatial Canvas Setup

```javascript
// The whole video is ONE scene positioned on a 2.5D plane.
// Each narrative beat is a region of this canvas, not a separate HTML page.

// Scene regions (scene index → canvas position in pixels)
const SCENES = [
  { x: 0,    y: 0,   zoom: 1.00, start: 0 },     // Hook
  { x: 1920, y: 0,   zoom: 1.15, start: 12 },    // Mechanism
  { x: 1920, y: 400, zoom: 1.80, start: 25 },    // Zoom Detail
  { x: 960,  y: 200, zoom: 0.85, start: 38 },    // Wide Resolution
];

// Camera spring navigation between scenes
layer('onetake_camera').on((t, lt, dur) => {
  // Find current and next scene based on t
  let curr = SCENES[SCENES.length - 1];
  let next = curr;
  for (let i = 0; i < SCENES.length - 1; i++) {
    if (t >= SCENES[i].start && t < SCENES[i + 1].start) {
      curr = SCENES[i];
      next = SCENES[i + 1];
      break;
    }
  }

  // Spring travel from curr to next
  const travelStart = curr.start;
  const travelDur   = next.start - curr.start;
  const travelT     = Math.max(0, t - travelStart);
  const s = spring(travelT, { tension: 140, friction: 14 });

  const cx = curr.x + (next.x - curr.x) * s;
  const cy = curr.y + (next.y - curr.y) * s;
  const cz = curr.zoom + (next.zoom - curr.zoom) * s;

  // Depth-parallax background (z=0.2 moves at 20% of camera speed)
  // Apply via CSS transform to #stage element
  return {
    position: 'absolute', inset: '0',
    transform: `translate(${-cx}px, ${-cy}px) scale(${cz})`,
    transformOrigin: '50% 50%',
  };
});
```

### Zero-Cut Scene Handshake

When the camera reaches Scene N+1, Scene N's primary subject shrinks and slides
to a supporting position rather than disappearing:

```javascript
// Outgoing subject: compress to supporting node
layer('scene1_subject_exit').on((t, lt, dur) => {
  if (t < SCENES[1].start - 1.0 || t > SCENES[1].start + 0.5) return { display: 'none' };
  const exitP = Math.min(1, (t - (SCENES[1].start - 1.0)) / 1.0);
  const s = spring(exitP, { tension: 200, friction: 22 });
  return {
    transform: `translateX(${-580 * s}px) scale(${1 - 0.35 * s})`,
    opacity: 1 - s * 0.4,
  };
});
// SFX at peak camera velocity (OneTake rule #3)
cue('whoosh', SCENES[1].start - 0.04, 0.7);
```

---

## 3. Editorial Paper Collage & Halftone (gbro-collage-broll)

### 12fps Stop-Motion Drop Entrance

```javascript
// Collage card entrance — hand-placed, 12fps stepped, not smooth
layer('collage_card').on((t, lt, dur) => {
  if (lt < 0 || lt > dur) return { opacity: 0, display: 'none' };

  // 12fps step grid
  const step = Math.floor(lt * 12);
  const dropProgress = Math.min(1, step / 6);  // settles in 0.5s (6 frames @ 12fps)

  const seed = 3.7;  // fixed per card
  const scale = 1.15 - 0.15 * dropProgress;   // overshoots then settles
  const rot   = -4 + Math.sin(seed * 11) * 3; // fixed tilt angle

  return {
    opacity: dropProgress > 0 ? 1 : 0,
    transform: `scale(${scale}) rotate(${rot}deg) translateY(${(1 - dropProgress) * -60}px)`,
    filter: 'drop-shadow(4px 6px 0px rgba(0,0,0,0.35))',
  };
});
```

### Halftone Overlay (CSS background)

```javascript
// Halftone texture overlay — applied on Layer 2 (environment/context)
layer('halftone_env').on((t, lt, dur) => {
  if (lt < 0 || lt > dur) return { opacity: 0, display: 'none' };
  return {
    position: 'absolute', inset: '0',
    backgroundImage: `radial-gradient(circle, #000 1.5px, transparent 1.5px)`,
    backgroundSize: '12px 12px',
    opacity: 0.08,
    mixBlendMode: 'multiply',
    pointerEvents: 'none',
  };
});
```

### 2.5D Perspective Tilt

```javascript
// Apply to the whole collage card container
layer('collage_container').on((t, lt, dur) => {
  const tiltX = 15 * Math.sin(lt * 0.3);  // gentle breathing tilt
  const tiltY = -10 * Math.cos(lt * 0.2);
  return {
    transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
    transformStyle: 'preserve-3d',
  };
});
```

---

## 4. Reanimate Closed-Loop Pattern (reanimate.niazmorshed.dev)

The reanimate pattern is the Opus 5.5 correction loop for existing animations.

```
Phase 1 — Record:   Playwright records every moving element at fixed fps
Phase 2 — Tabulate: start, duration, distance, easing curve per element
Phase 3 — Rebuild:  Agent rewrites edit.js from the tabulation (not from scratch)
Phase 4 — Re-record: Same Playwright setup, same seed
Phase 5 — Diff:     Pixel diff + timing diff. Target: 0px, ≤17ms per element

Pass/fail thresholds:
  pixel_diff_max:    0 (deterministic rendering must be identical)
  timing_diff_ms:    ≤17 (one frame at 60fps)
  easing_diff_score: ≤0.05 (normalized spring curve comparison)
```

In FrameForge this maps to:
```
render_animation({ mode: "golden", goldenSave: true })
// then fix edit.js, then:
render_animation({ mode: "golden", goldenCheck: true })
// must return: all hashes match
```
