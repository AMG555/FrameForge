# HyperFrames Motion Craft — Measured from Official Films

Adapted from `heygen-com/hyperframes` `skills/hyperframes/references/motion.md`.
All values measured frame-by-frame from the official HyperFrames launch films.

These are defaults. A reference the user provides, or a scene that deliberately does otherwise, wins for its own beat.

---

## Core Motion Rules

### Speed and Duration
- **A fast move takes 0.3–0.6 s** with motion blur on its own ease, peaking at its fastest frame
- **Motion blur**: 6–12 px on text-sized elements, 15–20 px full-frame, horizontal-only on horizontal moves
- **Render-time blur**: `data-motion-blur="on"` on the composition root smears moving elements along their real path (opt-in)

### Arrival vs Departure
- **Arrive slow, leave clean**: long-tailed ease-outs on arrivals; landing takes longer than leaving
- An exit is one smooth motion — never slide, stop, then leave
- Entrances that are too snappy read as glitches; slowing by ~1 second often fixes it

### Ease by Role

| Role | Ease |
|------|------|
| Arrival / landing | `expo.out`, `power4.out` (long tail) |
| Camera move / colour flood | `power2.inOut` (both ways) |
| Zoom through / exit | `power3.in` (accelerates out) |
| Rotation / progress bar | `linear` |

The same `power2.out` at 0.5 s on **everything** is the flat default that makes a film feel generated.

### Springs

Springs are named by damping ratio:

| Damping | Feel |
|---------|------|
| 1.0 | Never bounces — dead landing |
| 0.7–0.85 | Reads premium |
| 0.4–0.6 | Playful |
| < 0.3 | Cartoon |

- Position and size **may** bounce; opacity and colour **never** bounce
- GSAP equivalents: `elastic.out(1, 0.5)` and `back.out(1.4)`
- A closed-form spring of `t` keeps any frame renderable on its own (deterministic)

```javascript
// FrameForge engine.js — spring with damping ratio control
spring(t, { tension: 200, friction: 20 })   // damping ≈ 0.7 (premium)
spring(t, { tension: 300, friction: 10 })   // damping ≈ 0.3 (cartoon)
spring(t, { tension: 120, friction: 28 })   // damping ≈ 1.0 (dead)
```

### Timing Relationships
- **Exits are 40–50% shorter** than their entrances
- **Overlap**: the next element starts when the previous is 30–50% done — fully sequential looks robotic, all-at-once looks cheap
- **Stagger**: letters a frame apart, words 60–120 ms, list items 40–80 ms

### Beat Grid
- Frames per beat = `fps × 60 / BPM`
- Compute each beat from its **index** and round it — never add rounded beats repeatedly (at 128 BPM and 30 fps that drifts 2 frames in 32 beats)
- Cut on the beat; change the layout on the bar

### Cuts
- Cut at the **fastest frame** of a move, with matching direction and speed on both sides
- A click into a new screen is a match cut on the click's rebound — the new screen comes in slightly large and settles

---

## Title Animation Patterns

A landed title is **dead still** — the motion moves to the next element, the camera, or the world behind. Vary the entrance within a film.

| Pattern | How |
|---------|-----|
| Per word blur-in | `blur(6px)` → 0 and opacity 0 → 1 in 0.13 s, 0.067 s apart, no translate |
| Per word colour | Light grey → ink, 0.07–0.1 s apart, no position change |
| Whole line blur | 8 px → 0 in 0.13–0.2 s |
| Per letter name | 0.1 s apart, opacity 0.3 → 1, slight blur |
| Slot machine | One word rolls through options, ~0.1 s a roll |
| Behind subject | Title between the plate and a matte of the person |

### Hold Times
- A line the viewer must read holds **0.5 s + 0.3 s per word**
- The film's last line: **at least 2 s**
- A one- or two-word chapter line: **0.4 s**
- Exit: blur-out and fade 0.13–0.25 s word by word, or with the scene's move

### Title Sizes
- Body: 4–9% of frame height, one or two lines
- Quiet lines: 2.5–4% against hero words that fill 60–90% of width
- One highlighted word in the accent colour (carries meaning)

---

## Rhythm

| Pattern | Value |
|---------|-------|
| Montage cuts | Every 0.13–0.8 s |
| Demo hold | 7–10 s while UI acts |
| Average shot | 1.8–3 s with motion inside |
| Pre-payoff hold | 0.3–0.75 s before the payoff |
| Payoff speed | Normal speed (not slow) |

**Continuous motion that works**: UI working, footage playing, character acting, 3D world turning, slow orbit of background stage (3–5° per second).

**Defaults that look generated**:
- Breathing/floating/pulsing loops on titles and UI
- Titles that keep sliding or scaling after they land
- A slow creeping scale or push late in a scene
- Bounce on UI elements
- Click rings
- Every scene entering the same way
- Every element fading and sliding up

---

## Transitions with a Cause

Use 3–5 kinds in a film, each **caused by something on screen**. Hard cuts belong inside a scene (punch-ins); at most a third of seams between beats are hard cuts. Worlds never crossfade.

| Transition | How to Build |
|------------|-------------|
| Zoom through a button | Camera tracks to button with blur (0.6 s), button scales from ~8% to ~250% of frame in 0.35 s, strong ease-in; its fill becomes the next frame |
| Object becomes the world | Pill or card grows past the frame in 0.65 s ease-in-out, radius shrinks; what was around it blurs ~15 px and fades in 0.3 s; new content fades in while still growing |
| Morph | One container widens into the next (~110 → ~880 px in 0.2 s `power3.out`) with horizontal blur 12 → 0 |
| Carry across | Result shrinks 1 → 0.6 with blur peaking at 6 px mid-move, lands inside the next app as it builds around it |
| Colour flood | Hero object stays while the whole ground changes colour in ~0.4 s `power2.inOut` |
| Whip | Horizontal or vertical smear of 0.13–0.3 s; arriving element lands blurred and sharpens in ~0.13 s |
| Iris from click | `clip-path: circle()` opens from the clicked point onto the next world in 0.15 s |
| Dip cut | Outgoing frame darkens ~40% for 3 frames before a hard cut, so the cut reads as intentional |
| Blur swap | Out: opacity → 0 with ~8 px blur in 0.13–0.2 s; in: blur → 0 in 0.13 s; ground never cuts |

---

## The Right Mechanism for Camera Moves

| Request | Mechanism |
|---------|-----------|
| Punch-in, zoom, pan, Ken Burns, reframe | Tween `scale` and `x`/`y` on a **wrapper inside** the clip — never on the timed media element |
| Crop or mask reveal | Tween `clip-path` or mask on an inner wrapper; source time untouched |
| Constant speed change | `data-playback-rate` on the media (0.1–10) |
| Speed ramp | `rate` lane in `data-automation` on the media |
| Hold or freeze | Hold a final frame; a freeze mid-source needs a still exported first |

---

## Sound (HyperFrames/Earshot Standard)

Sound is half of how a film feels.

### The Default
- **A film over ~15 s** that tells something gets a music bed and sounds on its visible actions — unless the person asked for silence
- **Each storyline says its sound** in one line: the bed's feel and tempo, the one moment the music changes, which actions get effects

### The Clock
- **Narrated**: the voice is the clock — time each beat's start to its anchor word
- **Music only**: the music is the clock — land the payoff on strong beats; cuts follow motion, not the drums

### Effects: Few and Exact

Every effect has a cause on screen. Too many read as a template.

| Sound | Only on |
|-------|---------|
| click | A real cursor click on screen |
| whoosh | A scene cut, or a large card moving fast |
| soft key tick | Text arriving letter by letter or line by line |
| pop | A badge, chip, or number landing |
| riser into impact | The payoff or the mark — **once in the film** |

- Sound peak lands **one frame after** its picture (light arrives before sound)
- Each hit sits **3–6 dB over the bed**
- Rotate 2–3 takes of a repeated sound — the same whoosh on every cut is the most common tell
- No synthesized tones, chimes, or dings

### Levels
- Music under a voice: ~0.14 volume (≈ −17 dB relative)
- Target loudness: **−16 to −14 LUFS** (social/web)
- True peak: **−1 dBTP** or lower
- Check with `npx hyperframes audio <video> --json` equivalent: use earshot `measure` or ffmpeg `-filter loudnorm`

---

## Common Faults and Fixes

| Symptom | Cause |
|---------|-------|
| Blank or frozen scene | Timeline registered before async build finished, or `visibility` tweened on a `.clip` |
| Stutter or drift between renders | Layout measured in `onUpdate`, `requestAnimationFrame`, or clock time |
| Jump at a cut | Outgoing and incoming states differ at the seam |
| Ease looks off at a handoff | Speeds don't match across the seam — mirror the ease (`power3.in` out, `power3.out` in) |

---

## Quick Reference — FrameForge Mapping

| HyperFrames concept | FrameForge equivalent |
|--------------------|-----------------------|
| `data-start` / `data-duration` on `.clip` | `layer('id').on((t, lt, dur) => ...)` — `lt` is local time, `dur` is duration |
| `window.__timelines["id"] = tl` | Not needed — FrameForge engine handles timeline registration |
| GSAP `interpolate(t, frames, values, easing)` | `spring(lt, opts)`, `at(t, start, end)`, `kf(t, keyframes)` |
| `Easing.spring({damping: 200})` | `spring(lt, { tension: 200, friction: 20 })` |
| `data-motion-blur="on"` | `render_animation({ motionBlur: true })` (Playwright shutter) |
| `npx hyperframes check` | `validate_storyboard({ checkDeterminism: true })` |
| `npx hyperframes snapshot --review` | `render_animation({ mode: "review", contactSheet: true })` |
