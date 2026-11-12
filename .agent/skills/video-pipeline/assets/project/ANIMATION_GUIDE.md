# ANIMATION_GUIDE.md — Agent Context for HTML Video Projects

> This file is loaded as context by the model before it writes any scene code.
> It encodes the contract, the four storyboard gates, and the six determinism rules
> that make headless-Chrome rendering reproducible and parallel.
>
> Source: ClaudeAnimationBase ANIMATION_GUIDE.md + awesomeclaude.ai corpus study (703 prompts).

---

## The Contract

A video is a set of scene files where **every pixel is a pure function of time `t`**.

The renderer owns the clock. Scenes never call `Date.now()`, `performance.now()`,
`setTimeout`, `setInterval`, `Math.random()`, or any module-level mutable counter.
The renderer injects a virtual clock shim before the page loads, advances it one frame
at a time, and screenshots the result. Frame 400 can be captured hours after frame 399
and the scene must not care.

---

## Step 0 — Beat Sheet First

**Never write scene code before the storyboard passes all four gates.**

The workflow is always:

1. Write a beat sheet (title, shots, events, reads, transitions).
2. Reply with the beat sheet and four keyframe descriptions **only**. Stop.
3. Wait for approval.
4. Only after approval: write the scene files.

Fixing a line in a beat sheet costs one message. Fixing a finished scene costs a rewrite.

---

## The Four Storyboard Gates

Run `node scripts/storyboard-validator.mjs STORYBOARD.md` to enforce these automatically.

### Gate 1 — Every shot has an EVENT

An event is something that **physically happens** in the shot. It is not a description
of what the viewer sees, and it is not a mood adjective.

| ❌ FAILS | ✅ PASSES |
|---|---|
| "Clawd stands in a meadow." | "Clawd turns to face the viewer and extends one hand." |
| "A beautiful space scene." | "A comet crosses the frame left-to-right over 4 seconds." |
| "We see the city at night." | "The city's lights flicker off one by one from the edges in." |

### Gate 2 — Reads must not overlap

Each shot has a list of **reads** — the discrete things a viewer must understand,
with non-overlapping start and end timestamps.

```
# BAD — 0.0–1.5 and 1.0–2.5 overlap from 1.0–1.5
reads:
  - 0.0–1.5: Viewer recognises the character.
  - 1.0–2.5: Viewer understands she is running away.

# GOOD
reads:
  - 0.0–2.0: Viewer recognises the character.
  - 2.0–4.0: Viewer understands she is running away.
```

### Gate 3 — Every seam has a named transition

This includes the film open (transition_in on Shot 1) and film close
(transition_out on the last shot). A storyboard that starts or ends
without a declared transition fails.

Recognised transition names:
`cut` `fade-from-black` `fade-to-black` `dissolve` `wipe-left` `wipe-right`
`iris-in` `iris-out` `cross-dissolve` `push-left` `push-right` `flash` `dip-to-white`

### Gate 4 — No text on screen

"Lost" must be acted, not captioned. "Heartbroken" must be shown, not written.

The model **may not** write `text()`, `wallCard()`, `stamp()`, or `codeCard()` calls
that convey plot-critical information (character names, place names, dates, emotions,
narrative exposition). These helpers exist for UI/diagram/explainer content only,
not for storytelling that belongs in the direction.

---

## Six Determinism Rules

These rules are what make the render reproducible, parallel, and resumable.

### Rule 1 — Read time, never count frames

```js
// ❌ BAD — frame counter mutates across calls
let frame = 0
layer('x').on(() => { frame++; return { opacity: frame / 30 } })

// ✅ GOOD — pure function of t
layer('x').on(t => ({ opacity: Math.min(1, t / 1.0) }))
```

### Rule 2 — Seed everything with `hash(i)`

`hash(i)` in `reel/engine.js` is a deterministic integer hash of its index.
Use it wherever you need a stable pseudo-random value (star positions, brush seeds,
particle offsets). Never use `Math.random()` inside a scene file.

```js
import { hash } from './reel/engine.js'

// Star field — same every render
for (let i = 0; i < 200; i++) {
  const x = (hash(i)     % 1920)
  const y = (hash(i + 1) % 1080)
  // ...
}
```

**Boil wobble exception:** hand-drawn wobble is deliberately re-seeded 12 times
per second so it looks chaotic while remaining reproducible:

```js
const boilSeed = Math.floor(t * 12) // same bucket for every frame in that 1/12s window
const wobble   = (hash(boilSeed) % 7) - 3  // –3 to +3 px
```

### Rule 3 — No integrating physics

Never integrate velocity per tick. Use closed-form motion or precompute the
simulation into an array before the layer is registered.

```js
// ❌ BAD — position depends on previous frame
let vx = 0, x = 0
layer('ball').on(() => { vx += 0.1; x += vx; return { left: x } })

// ✅ GOOD — closed-form quadratic
layer('ball').on(t => ({ left: 0.5 * 120 * t * t + 'px' }))
```

### Rule 4 — Await `document.fonts.ready` before frame 0

The renderer calls `await page.evaluate(() => document.fonts.ready)` before
advancing the clock. Scene code must not assume fonts are available before that
await resolves — if a font load fails, every text frame renders in the system
fallback and the entire video looks wrong.

### Rule 5 — ffmpeg owns audio

Never capture audio from the browser. Audio is a separate pass:

1. TTS generates audio → word-level timestamps from `scripts/transcribe.py`
2. Scene resolves animation anchors from those timestamps via `cuePhrase()`
3. `node scripts/render.mjs full` renders video frames (silent)
4. `uv run scripts/mix_audio_pro.py --sfx-events --room broadcast --platform youtube` builds the final audio track
   (reads out/sfx-events.json from window.__events() automatically; use `mix_audio.py` for the simple chain)
5. `node scripts/render.mjs mux` merges with `-c:v copy` (video stream untouched)

`cuePhrase(phrase)` **throws a fatal build error** if the phrase cannot be found
in the loaded captions track. If a phrase stops being spoken, the build fails and
names the missing words — re-recording voice-over can never silently desync the film.

### Rule 6 — Tag BT.709 and use `-t` not `-shortest`

The renderer's ffmpeg encode always includes:

```
-color_primaries bt709 -color_trc bt709 -colorspace bt709
```

Untagged HD video gets decoded with the wrong matrix on some players and colours shift.

Always use `-t <duration>` for the output duration, not `-shortest`. `-shortest`
hangs if the input has a subtitle or data stream.

---

## Motion Vocabulary

Write these explicitly in the brief. The model will follow them.

**Allowed:** easeIn, easeOut, easeInOut, spring(t), lerp(t, a, b), fade, slide, scale, rotate.

**Banned (AI slop tells):**
- Particle bursts that emit from a single point
- Lens flares
- Neon glow on everything
- RGB chromatic-aberration split used decoratively
- Bouncy easing on text (`spring` on entrance is OK; double-bounce is not)
- Perspective / `rotateY` in a flat/painted 2D style (breaks layout math and look)

---

## Review Surface

Before `node scripts/render.mjs full`, always generate stills:

```bash
# Shape of the film — first/middle/last of each shot
node scripts/render.mjs sheet

# Every frame of one motion or transition
node scripts/render.mjs strip 2.1 2.6

# Story-carrying face or detail at full resolution
node scripts/render.mjs storyboard

# Mobile crop check
node scripts/render.mjs crop 9:16 3.0
```

Budget: **at least one sheet per shot, a strip per key motion and transition,
a crop per story-carrying face.**

Feed the PNGs back to the model. Name what failed. Then re-render the affected range.
Re-rendering frame 400 costs nothing. Unguided revision costs everything.

---

## Pre-render checklist (run before `render full`)

```bash
node scripts/look.mjs          # fonts, clipped text, NaN transforms, missing images
node scripts/storyboard-validator.mjs STORYBOARD.md  # all four gates
```

Both must exit 0.

---

## Subagent rules (long films)

- One orchestrator, N chapter subagents.
- **Chapter subagents may not edit shared helpers** (`reel/engine.js`, `reel/engine.css`,
  `scripts/render.mjs`, `scripts/look.mjs`).
- Each subagent loads its rules from `pipeline/briefings/<chapter>.md` on disk, not
  from the parent context. This keeps context small and rules isolated.
- Verification runs with subagents: 2 subagents at a time, each scanning 10 frames,
  every 5 frames of the rendered sequence.

---

## Cost reference (single data points, not benchmarks)

| Project | Cost |
|---|---|
| 15s launch spot from a one-liner | ~$2 API |
| Full lyric music video (high effort) | ~$200 |
| 3-min Remotion film (~7,400 lines) | 7% of weekly quota |
| Model tokens alone (~90K in / 15K out) | ~$0.66 at Opus 5.5 list price |

Render is **free and local**. The expensive part is model iteration, which is why
the storyboard gate and the still-review loop exist — they eliminate the most
expensive kind of work: finishing a scene before discovering it was wrong.
