# Advanced Animation Patterns — ClaudeAnimationBase + OneTake + Collage B-Roll + Remotion

Derived from:
- `JohnHeibel/ClaudeAnimationBase` — organic 12fps cel boil and character emotions (Opus 5.5 pattern)
- `feitangyuan/onetake` — continuous single-shot seamless camera choreography with 39-move library
- `pyang5166/gbro-collage-broll` — editorial paper collage + halftone 2.5D tilt + 3-gate QA
- `remotion-dev/skills` — React composition, spring physics, GSAP markup patterns

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

---

## 5. OneTake — 39-Move Library and Rhythm+Carry Oracle

The OneTake system (from `feitangyuan/onetake`) is built around one constraint: **six rejected films, six acceptance criteria**. Every feature came from a specific rejection.

### Why It Exists (Each Rule Cost a Cut)

| Rule | Origin |
|------|--------|
| Vary shot length by ≥4× | Uniform cadence = "PPT 式" (slideshow feel) — failed twice |
| Something must survive every section boundary | "Beats that replace each other" = Pocket Weather Club v1, v2 both rejected (carry score 0.00, 0.40) |
| Camera must chase the subject | One Dot film: "就缺灵动的跟踪运镜" — still camera rejected |
| Every beat is the collision that starts the next | "knockon" — causal carry |
| Small elements, big ground | "70% white" genre; full-bleed is the exception |
| The cause must be visible | Hand drawn from recorded path, or concept's own subject |

### The Rhythm + Carry Oracle (verify_promo.py)

Before showing any render, run the oracle:

```bash
python3 scripts/verify_promo.py draft.mp4 --comp comp.html --ref ref.mp4
```

**What it checks**:

1. **Rhythm legs**: fail uniform shot lengths, no dead-still stretch, clipped or never-quiet audio
2. **Continuity** (the critical leg): fail beats that replace each other (carry score < 0.5). This is the ONLY leg that failed both rejected Pocket Weather cuts (v1 0.00, v2 0.40) while accepted films passed (v3 0.75)
3. **Curves**: fail fast moves (> 80 px/frame) in a film without shutter blur
4. **Framing**: fail any frame where a declared subject leaves the frame (or is cut off)

**Carry score thresholds**:
- Score < 0.5 → FAIL (the film is a slideshow)
- Score 0.5–0.75 → WARNING (acceptable if rhythm is strong)
- Score > 0.75 → PASS

### The OM Motion Library (engine.js `OM` object)

**All moves are pure CSS: `(t, opts) → { transform, opacity, clipPath }`.
Feed `t` via `seg(currentTime, start, end)` to get normalised 0→1 progress.**

Never re-derive springs or eases inline. Use `OM.*` — they encode the correct
physics and carry the carry-score contract (exit velocity ≥ 0.5× peak velocity).

```javascript
import { OM, seg } from './reel/engine.js';

// Usage pattern: seg() gives normalised t for a time window
layer('hero').on((t) => {
  const p = seg(t, 0.5, 1.5);          // 0→1 over 0.5–1.5 seconds
  Object.assign(heroEl.style, OM.spring(p));
});
```

**Entrances** (element appearing, enter → stage):
```javascript
OM.spring(t, { scale0: 0.6, scale1: 1.0, opacity0: 0, opacity1: 1 })
  // → { transform: 'scale(…)', opacity: … }
  // Damped spring overshoot. Default tension:180, friction:18. Standard arrival.

OM.rise(t, { dist: 60, opacity0: 0 })
  // → { transform: 'translateY(…)', opacity: … }
  // Translates up from dist px below while fading in.

OM.iris(t, { cx: '50%', cy: '50%' })
  // → { clipPath: 'circle(…% at cx cy)' }
  // Radial clip-path expands from centre. 141% covers full diagonal.

OM.morphRect(t, { axis: 'y' })
  // → { clipPath: 'inset(…% 0 …% 0)' }
  // Clip-path from narrow rect to full frame. axis: 'x' or 'y'.

OM.silk(t, { direction: 'left' })
  // → { clipPath: 'inset(0 …% 0 0)' }
  // Curtain-pull clip from the specified edge.

OM.zoomThrough(t, { from: 0.8, through: 1.15, to: 1.0 })
  // → { transform: 'scale(…)' }
  // Scale through 1× — portal / push-through effect. Peak at t=0.5.

OM.scalePop(t)
  // → { transform: 'scale(…)', opacity: … }
  // Title scales from 1.6× down to 1× with expo ease (HyperFrames title pattern).

OM.wordByWord(t, { wordIndex: 0, totalWords: 1, delay: 0.08 })
  // → { transform: 'translateY(…)', opacity: … }
  // Per-word spring stagger. Call with different wordIndex for each word.

OM.revealWipe(t, { direction: 'left' })
  // → { clipPath: 'inset(0 …% 0 0)' }
  // Horizontal clip wipe — title text reveal.

OM.typewriter(t, { chars: 20 })
  // → { '--tw-chars': revealed }
  // Returns CSS custom property for character count (use in CSS clip on ::before).

OM.counterFlip(t, { from: 0, to: 100, height: 60 })
  // → { transform: 'translateY(…)' }
  // Odometer-style numeric reveal via vertical translate.
```

**Carries** (element surviving a scene boundary — carry score ≥ 0.5 required):
```javascript
OM.irisClose(t, { cx: '50%', cy: '50%' })
  // → { clipPath: 'circle(…% at cx cy)' }
  // Reverse of iris — stage contracts to a point.

OM.belt(t, { strips: 6, direction: 'left' })
  // → { '--belt-strips': 6, '--belt-p': t, transform: … }
  // Horizontal strip sequence reveal (film-strip / ticker).

OM.ripple(t, { cx: '50%', cy: '50%', opacity0: 0.6 })
  // → { clipPath: 'circle(…% at cx cy)', opacity: … }
  // Expanding + fading radial wave. Used for carry momentum.
```

**Camera** (keyed, operated feel):
```javascript
OM.camera(t, {
  x0: 0, y0: 0, x1: 20, y1: -10,   // pan range in px
  scale0: 1.0, scale1: 1.08,         // zoom range
  seed: 'cam',                        // deterministic noise seed
  shakeAmp: 2,                        // micro-shake amplitude (px)
  shakeFreq: 1.5,                     // shake frequency (cycles/sec)
})
// → { transform: 'translate(…px, …px) scale(…)' }
// Slow Ken Burns push + seeded noise micro-shake.

OM.handheld(t, { amp: 6, freq: 8, seed: 'hh' })
// → { transform: 'translate(…px, …px) rotate(…deg)' }
// Vérité/documentary shake. 3-axis (x, y, z rotate).
```

**Exits** (faster than entrances — OneTake rule):
```javascript
OM.popOut(t, { scale1: 1.0, scale2: 1.4 })
  // → { transform: 'scale(…)', opacity: … }  Uses easeIn.

OM.drop(t, { dist: 120 })
  // → { transform: 'translateY(…)', opacity: … }  Gravity ease-in.

OM.implode(t, { cx: '50%', cy: '50%' })
  // → { clipPath: 'circle(…%)', opacity: … }  Iris collapse.

OM.slideExit(t, { direction: 'left', dist: 110 })
  // → { transform: 'translateX(…%)' }  Off-canvas slide.
```

**Ambient / Atmospheric** (idle states, breathing room):
```javascript
OM.breathe(t, { amp: 0.015, freq: 0.4 })  // subtle scale oscillation
OM.float(t, { amp: 8, freq: 0.3 })         // sinusoidal vertical drift
OM.pulseOpacity(t, { lo: 0.7, hi: 1.0, freq: 1.0 }) // rhythmic emphasis
OM.odometer(t, { from: 0, to: 9, height: 60 }) // digit column roll
```

**Carry score** (rhythm oracle — check at t=0.8–1.0):
```javascript
const score = OM.carryScore(1.0);  // must be ≥ 0.5 to PASS
// carryScore < 0.5 → the film is a slideshow (FAIL)
// carryScore 0.5–0.75 → acceptable if rhythm is strong (WARNING)
// carryScore > 0.75 → PASS
```

### Sound: A Palette in a Room, Never One Beep Per Event

OneTake requires **5 materials in one room** — not a raw sine pop on every event (which was "低劣/cheap" within a minute of review):

```python
# sfx_palette.py — 5 synthesised materials in one shared reverb
# Each material is a physical model of the medium

MATERIALS = {
  'air':    { freq: (800, 4000),  attack: 0.005, decay: 0.08, model: 'filtered_noise' },
  'wood':   { freq: (200, 800),   attack: 0.002, decay: 0.15, model: 'modal_resonator' },
  'glass':  { freq: (1000, 6000), attack: 0.001, decay: 0.35, model: 'modal_resonator' },
  'sub':    { freq: (40, 120),    attack: 0.008, decay: 0.25, model: 'sine_decay' },
  'bubble': { freq: (400, 1200),  attack: 0.003, decay: 0.12, model: 'rising_sine' },
}

ROOM = {
  'ir': 'voxengo_small_room.wav',  # convolution reverb IR
  'pre_delay': 8,   # ms
  'wet': 0.18,      # 18% wet
}

# All peaks at -8 dBFS so music can sit on top
# Master to -16 LUFS with ceiling -3.5 to -4 dBTP
```

**Sound events from the composition** — not guessed, read from `window.__events()`:
```javascript
// In your composition's f(t) function:
window.__events = () => [
  { t: 0.8, material: 'wood', intensity: 0.7, pan: -0.2 },
  { t: 1.5, material: 'air',  intensity: 0.4, pan:  0.1 },
  { t: 2.1, material: 'glass', intensity: 0.9, pan:  0.0 },
];
```

### Hard Rules (Each One Cost a Cut)

```
❌ Never default to the template's story
❌ Never carry the last film's look into the next
❌ Never cut on a metronome (equal shot lengths = slides)
❌ Never replace a beat — carry it (something must survive every section boundary)
❌ Never show a page as a thumbnail expecting its motion to read
❌ Never let the frame be always in motion (rests make bursts land; reference is still 34% of the time)
❌ Small elements, big ground (genre frame is 70% white/negative space)
❌ The cause must be visible (the hand, or the concept's own subject)
❌ Moves from the library, curves chosen by t80
❌ Fast moves (> 80 px/frame) need the shutter (real motion blur)
❌ No particles/confetti/speck bursts (read as a template)
❌ One material set for sound, one room
❌ Everything deterministic: __seek(t) twice gives the same frame
```

---

## 6. Remotion — React Composition Patterns

From `remotion-dev/skills` (first-party skills, v4.0.543+).

### The Golden Rule: `useCurrentFrame()` as Deep as Possible

```tsx
// ✅ Correct — useCurrentFrame in the smallest component that needs it
const FadeIn = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{
      opacity: interpolate(frame, [0, 2 * fps], [0, 1], {
        extrapolateRight: 'clamp',
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    }}>
      Content
    </div>
  );
};

// ❌ Wrong — subscribes the whole composition on every frame
const CompositionWrong = () => {
  const frame = useCurrentFrame();  // re-renders everything
  return <div><FadeIn /><OtherStuff /></div>;
};
```

### CSS Transform Shorthands (Not `transform`)

```tsx
// ✅ Use scale, translate, rotate — Studio can edit these
style={{
  scale: interpolate(frame, [0, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.spring({ damping: 200 }),
    output: 'perceptual-scale',  // ALWAYS for scale animations
  }),
  translate: interpolate(frame, [0, 100], ['0px 0px', '100px 100px']),
}}

// ❌ Wrong — transform strings break Studio editing
const scale = interpolate(frame, [0, 100], [0, 1]);
style={{ transform: `scale(${scale})` }}
```

### Remotion Spring vs FrameForge Spring

```tsx
// Remotion (React)
import { Easing } from 'remotion';
Easing.spring({ damping: 200 })  // damping: high = less bounce

// FrameForge (HTML compositor)
spring(lt, { tension: 200, friction: 20 })  // friction: high = less bounce

// Equivalent presets:
// Remotion damping 200  ≈ FrameForge { tension: 200, friction: 28 }  (premium)
// Remotion damping 100  ≈ FrameForge { tension: 180, friction: 16 }  (playful)
// Remotion damping 50   ≈ FrameForge { tension: 200, friction: 10 }  (cartoon)
```

### Available Built-in Effects (Remotion @remotion/effects)

Color and tone:
`brightness`, `colorCorrection`, `curves`, `duotone`, `exposure`, `grayscale`, `hue`, `invert`, `levels`, `lut` (3D .cube), `saturation`, `shadowsHighlights`, `tint`, `vibrance`, `whiteBalance`

Blur and trails:
`blur`, `lightTrail`, `linearProgressiveBlur`, `radialProgressiveBlur`, `regionBlur`, `zoomBlur`

Lighting:
`dropShadow`, `glow`, `lightLeak`, `longShadows`, `shine`, `starburst`, `vignette`

Distortion:
`barrelDistortion`, `chromaticAberration`, `cornerPin`, `fisheye`, `noiseDisplacement`, `skew`, `wave`

Textures:
`burlap`, `checkerboard`, `contourLines`, `dotGrid`, `emboss`, `flannel`, `halftone`, `lines`, `liquidContours`, `noise`, `paper`, `scanlines`, `speckle`, `tvSignalOff`, `waves`, `whiteNoise`, `zigzag`

Edges: `outline`, `roughenEdges`, `shrinkwrap`, `tear`

**Apply to** `<Video>`, `<CanvasImage>`, `<AnimatedImage>`, `<Solid>`, `<HtmlInCanvas>`, `@remotion/shapes`, `@remotion/rive`. For plain HTML elements, wrap in `<HtmlInCanvas>`.

---

## 7. GBro Collage B-Roll — 3-Gate Approval Workflow

The gbro-collage-broll system enforces mandatory human approval at three gates before any video generation.

### Why 3 Gates?
1. Prevents wrong metaphors from consuming video generation credits
2. Forces the agent to think visually before coding
3. Each gate narrows scope so errors are caught cheaply

### Gate 1: Visual Metaphor Only (No Images, No Video)
```
Input: ~5-second voiceover script (one sentence / one idea)
Output:
  - Core meaning (what the viewer must understand)
  - Emotion (calm, surprise, urgency, insight, absurd, ironic)
  - One-sentence visual proposition
  - 3–6 key objects
  - Suggested background colour + accent colours
  - Expected assembly order

STOP — wait for user: "可以" / "通过" / "pass" / corrections
```

### Gate 2: Static Frame Only (No Video)
```
After Gate 1 approval:
  - Write visual-spec.json (self-contained)
  - Generate static frame (imagegen)
  - QA: is metaphor clear? no text/logos/watermarks? 3-6 large groups? enough negative space?

STOP — wait for user confirmation of the still image
```

### Gate 3: Video Generation (Default: Gemini Omni Flash)
```
After Gate 2 approval:
  - Prepare first frame (solid colour background = same colour as still)
  - Prepare last frame (confirmed Gate 2 still)
  - Write Omni prompt: "assemble piece by piece, start-frame-empty → end-frame-complete"
  - Generate 5s 9:16 720×1280 24fps silent MP4

QA after generation:
  - First frame: near-empty colour field
  - Middle: gradual assembly visible, not overall fade-in
  - No cuts, no zoom, no 3D
  - No text/logos/watermarks
  - Last frame matches Gate 2 still
```

### Visual Standards
```
✓ Strong, flat, uniform colour field background
✓ Main subjects as black-and-white halftone photographic cut-outs
✓ Key cards/buttons/rules in coloured cardstock (red, yellow, cyan, orange, purple, cream)
✓ All paper pieces have crisp cut edges, cream keyline, soft drop shadow, paper grain
✓ Motion is assemble-from-empty (not drift, sway, or slow zoom)
✗ No subtitles, no full voiceover text, no logos, no watermarks, no UI
```

### Colour-to-Emotion Mapping
```
Burnt orange / red   → time consumption, labour, urgency
Mustard yellow       → tools, warning, experience loss
Forest green         → cognition, aesthetics, system reset
Deep purple          → norms, sedimentation, long-term memory
Cyan green           → judgment, collaboration, automated execution
Cobalt blue          → (avoid as default — too overused)
```
