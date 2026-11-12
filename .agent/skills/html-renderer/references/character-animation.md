# Character Animation — ClaudeAnimationBase Full Guide

Adapted from `JohnHeibel/ClaudeAnimationBase` `ANIMATION_GUIDE.md`.
The full hand-painted animation method for code-driven character films.
2.9k stars. All test videos generated with Opus 5.5 on `xhigh` reasoning in Claude Code.

---

## The Three Goals

Every rule serves one of three goals:

- **Handmade.** The video looks like someone painted it by hand, frame by frame — brush strokes, ink lines that boil, flat 2D, no lettering.
- **Alive.** Something is always moving and something is always happening. Faces act instead of snapping, and characters are big enough to feel.
- **One piece.** It's one short film, not a pile of clips. Plan it before you draw it, and link every scene to the next.

Underneath all three: the viewer has to be able to follow it. **Timing (rule 4) is the rule models get wrong most often.**

---

## The Rules

### Rule 1. The Medium Is Solid: Brush Strokes, Flat 2D, Boil

- **Paint with brush primitives.** Characters get flat colour plus an ink outline. Backgrounds get soft watercolour shapes.
- **Never use plain CSS shapes** (rect, ellipse, fill): they look like 2000s Flash. Use SVG path or canvas brushwork.
- **The linework boils.** Re-seed the PRNG 12 times a second (`BOIL = Math.floor(t * 12)`), so every drawing wobbles slightly like hand-drawn animation. That's the look — don't fight it.
- For anything that must stay put (star positions, tuft heights), use `hash(i)` — a seeded deterministic value per element.
- **Everything is flat 2D.** Never project 3D. Depth comes from overlap, scale, and colour (farther = smaller, bluer, paler). Never from a projection.
- **Soft palette, no pure black or white.** Use palette ink for black, palette cream for white. Keep colours soft and harmonious.

```javascript
// PRNG boil seed — quantize to 12fps grid
const BOIL = Math.floor(t * 12);
function boil(seed, amplitude = 1) {
  return Math.sin(seed * 19.37 + BOIL * 2.41) * amplitude;
}
// Use: stable elements use hash(i), boiling elements use boil(seed)
function hash(i) { return Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1; }
```

### Rule 2. No Text

- Show it, don't write it. No captions, no titles, no labels on objects, no speech bubbles with words.
- Character reactions are painted marks, never letters: `!`, `?`, zzz, sweat, hearts, a bulb, a rain cloud.
- A sign that repeats the story is the classic failure. If the character holds a sign saying "I'm lost", the shot has failed. Show the character being lost: looking left, then right, the map upside down, a sweat drop.
- If a single word is truly needed: paint it into the scene, keep it to one or two words, use it once.

### Rule 3. Something Happens in Every Scene

- **Every shot needs an event.** Something changes between its first frame and its last. "Character stands in a meadow being cute" is not a shot.
- **One focal action at a time.** Stage it with a clear silhouette.
- **Cause, then reaction.** When something happens, the character reacts: a take, an emotion change, a turn toward it.
- **Pay it off.** Whatever you set up (a door, a sandwich, a noise) gets resolved on screen.

### Rule 4. Timing: Model the Viewer

Timing is where generated animation fails most often: everything moves at one brisk speed, events pile on top of each other, and moments are over before anyone understands them.

**For every moment, ask: what does the viewer need to understand, and how long will that take them?**

- **Write the reads.** For each shot, list in order what the viewer has to understand. Each item is a *read*. Every read needs:
  - Time for the eye to find it
  - Time to understand it
  - A moment to register before the next thing starts
  - Small, distant, fast, or subtle things take longer to find than big, central, obvious ones
- **One read at a time.** Don't start a new read while the viewer is still taking in the last one.
- **Fast actions, slow meanings.** A motion can be very quick if it's anticipated, but what it means needs held time.
  - Anticipation tells the viewer where to look before the action
  - The hold after lets them understand it
  - Move quickly through what doesn't matter; spend time on what does
  - That contrast between quick and held is what gives rhythm
- **Lead the eye.** The viewer looks at whatever moves, is bright, is big, or is being looked at. Before an important read, get their eye to the right place first.
- **Let the reads set the length.** A shot is as long as its reads need. A shot that's over too fast had its reads squeezed; a padded shot had too few reads.

### Rule 5. Alive

- **Nothing is ever still.** Every emotion has its own idle motion; cameras drift or push; environments are alive; linework boils.
- **Faces act, they never snap.** Change moods through the `emotions()` system — anticipation, squint, take, overshoot around every change.
- **Move like a cartoon, not a machine.** Every move follows classic animation principles (see below).
- **Character is big.** In a medium shot, the character is ~20–28 units. In a close-up: 40–70. Tiny characters (< 12 units) only for wide establishing shots.
- **Everything moves on a beat.** BPM drives every idle, bounce, and dance, so the whole film shares one pulse.

### Rule 6. Transitions Always

- **Every seam gets a transition**: into the first shot, between every pair of shots, out of the last.
- Never start on a hard frame, never just stop.
- **Pick a transition that belongs to the story**:
  - Brush wipe (fat strokes cover the frame and drag off)
  - Iris or shaped iris
  - Whip pan with a smear
  - Match cut (same shape or motion across the cut)
  - Cut on action (cut mid-move, finish in next shot)
  - Camera move that carries through into the next shot
  - Fade or push from paper or black
- A plain cut is fine only when it's on action or a deliberate smash cut.
- **Changes inside a shot are transitions too**: emotions, turns, prop arrivals and departures — always on arcs.

### Rule 7. One Piece: Vision Before Any Code

- **Storyboard first**, in writing, before writing any scene code.
- **One world.** Pick a palette and setting that carries through, with a colour arc across the video.
- **One thread.** Story has a beginning, middle, and end. Emotional arc is planned across the whole video, not per shot.
- **Rhyme the ending with the opening**: same place, pose, or motif — changed. Makes the film feel whole.
- **Link scenes**: motion continues across cuts, screen direction stays consistent.

---

## Animation Principles (The Classics Applied to Code)

Motion written as code comes out mechanical: every part moves at once, on the same curve, by the same amount. These principles fix that:

| Principle | How to Apply in Code |
|-----------|---------------------|
| **Anticipation** | Before a big move, a small move the opposite way. `jump()` builds this in. |
| **Squash and stretch** | Bodies squash on impact, stretch when fast — keeping volume. Parameter `sq`. |
| **Slow in, slow out** | Run progress through `easeIn()`, `easeOut()`, `backOut()` — never plain `lerp` over time |
| **Weight** | How something starts and stops says what it weighs. Heavy = slow start, slow stop, little bounce. |
| **Arcs** | Living things move on arcs, not lines. `arcPt(p0, p1, h, k)` |
| **Overlapping action** | Eyes lead, body follows, arms/hats/props drag behind. Offset each part's timing from the thing it hangs off. `spring()` for the settle. |
| **Avoid twinning** | Give one arm the action and the other something smaller. Offset timings and phases between characters. |
| **Exaggeration** | Push poses, takes, squash, and leans further than feels natural. Subtle reads as nothing. |
| **Strong key poses** | Each shot's storytelling poses should read as stills, with clear silhouette. |
| **Show the thought** | A character notices, thinks, then acts. Eyes move first. |
| **Secondary action** | Small actions that support the main one (hat bobbing, emote popping). Never compete with main action. |

---

## Storyboard Format

Write `STORYBOARD.md` before any scene code:

```
Logline: one sentence. Character wants ___, but ___, so ___.
World: setting, palette, light, how the colour changes across the video.
Motif: the thing that recurs and pays off.
Character's arc: the emotion keys across the whole video.

Shots:
  A  start–end  [transition in: ___]  what's seen · the EVENT · character's reaction · camera
     reads:  start–end  the first thing the viewer must understand
             start–end  the next one (where is the viewer's eye when it starts?)
             ...
  B  start–end  [transition: ___]  ...
  ...
  [transition out: ___]
```

**Reads are the timing sheet.** Give each one a start and end. Make sure each has time to be found and understood. Make sure no two important reads overlap.

Check the storyboard:
- Is there an event in every shot?
- Does every read have time to land before the next starts?
- Is there a transition at every seam?
- Is there any text anywhere?
- Does the ending rhyme with the opening?

---

## Frames Are Pure Functions of Time

**The most important technical constraint:**

- Frames render **in parallel and out of order**
- A shot is `fn(t, lt, dur)` and must draw the **same frame for the same `t`**, every time
- No state carried between frames; no counters; no `Math.random()`; no physics that integrates frame by frame
- Compute **everything from `t`**, in closed form

```javascript
// CORRECT — pure function of lt (local time)
layer('char').on((t, lt, dur) => {
  const step = Math.floor(lt * 12);       // 12fps boil step
  const bx = Math.sin(7.3 * 19.37 + step * 2.41) * 2.4;
  const emotion = lt < 1.5 ? 'neutral' : 'happy';  // computed from lt, not state
  return { transform: `translateX(${bx}px)` };
});

// WRONG — global state carries between frames
let emotionState = 'neutral';  // ← never do this
layer('char').on((t, lt, dur) => {
  if (lt > 1.5) emotionState = 'happy';  // ← breaks determinism
  return { emotion: emotionState };
});
```

**Seed each animated element separately.** A moving element uses a different amount of randomness each frame, which shifts the stream for everything drawn after it. Give each element a unique seed:

```javascript
function elementBoil(seed) {
  const step = Math.floor(t * 12);
  return {
    dx: Math.sin(seed * 19.37 + step * 2.41) * 2.4,
    dy: Math.cos(seed * 11.29 + step * 1.87) * 1.8,
    rot: Math.sin(seed * 13.71 + step * 0.79) * 1.8,
    sc: 1.0 + Math.sin(seed * 7.11 + step * 3.14) * 0.025,
  };
}
// Usage: const b = elementBoil(7.3); // seed 7.3 for this element
```

---

## Time and Motion Helpers

```javascript
// Progress through [a, b] → 0..1
function seg(t, a, b) { return Math.min(1, Math.max(0, (t - a) / (b - a))); }

// Keyframes — values may be arrays
function kf(t, keys, ease = (x => x)) {
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i+1];
    if (t >= t0 && t <= t1) {
      const p = ease(seg(t, t0, t1));
      return Array.isArray(v0) ? v0.map((v, j) => v + (v1[j] - v) * p) : v0 + (v1 - v0) * p;
    }
  }
  return keys[keys.length - 1][1];
}

// Easing
const easeOut  = t => 1 - Math.pow(1 - t, 3);
const easeIn   = t => t * t * t;
const ease     = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const backOut  = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

// Rhythm
// BEAT = 60 / BPM  (seconds per beat)
// pulse(t, k = BEAT) → 1.0 on each beat, then decays
function pulse(t, k) { return Math.max(0, 1 - (t % k) / (k * 0.7)); }

// Jump: crouch → stretch → arc → squash-land
// Returns {dy, sq} — add to character's pose
function jump(t, t0, t1, h) {
  if (t < t0 || t > t1 + 0.3) return { dy: 0, sq: 0 };
  const p = seg(t, t0, t1);
  const arc = Math.sin(p * Math.PI);  // parabolic arc
  const land = t > t1 ? Math.max(0, 1 - seg(t, t1, t1 + 0.3) * 3) : 0;
  return { dy: -h * arc + land * 8, sq: -arc * 0.12 + land * 0.18 };
}

// Spring settle after an event
function spring(t, opts = {}) {
  const { tension = 200, friction = 20 } = opts;
  const w = Math.sqrt(tension);
  const zeta = friction / (2 * w);
  if (zeta >= 1) return 1 - Math.exp(-friction * t / 2) * (1 + friction * t / 2);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
}
```

---

## Character Emotion System

31 emotions grouped by family:

| Family | Emotions |
|--------|----------|
| **Joy** | happy, excited, laugh, love, proud, starstruck, playful, hopeful, relieved |
| **Sly** | smug, cool, mischief, suspicious |
| **Low** | sad, cry, bored, sleepy, ko |
| **Hot** | angry, furious, determined, disgusted |
| **Alarm** | scared, nervous, surprised, confused, dizzy |
| **Mind** | neutral, thinking, idea, shy |

**Emotion blending** — never snap between emotions, always blend through anticipation:

```javascript
// emotions(t, keys) — acted emotion changes
// Around each key: squints just before, swaps face, fires a take
function emotions(t, keys) {
  // Find current segment
  for (let i = keys.length - 1; i >= 0; i--) {
    const [keyT, name, overrides = {}] = keys[i];
    if (t >= keyT) {
      const nextKeyT = i < keys.length - 1 ? keys[i+1][0] : Infinity;
      const lt = t - keyT;
      const segDur = nextKeyT - keyT;

      // Anticipation squint just before transition (0.12s before)
      const anticipation = i < keys.length - 1
        ? Math.max(0, (t - (nextKeyT - 0.12)) / 0.12)
        : 0;

      return {
        emotion: name,
        squint: anticipation * 0.8,
        take: anticipation > 0.5 ? (anticipation - 0.5) * 2 : 0,
        ...overrides,
      };
    }
  }
  return { emotion: keys[0][1] };
}
```

---

## Review Loop (Render → Look → Fix)

You **cannot see motion by reading code**. Render and look at every shot:

1. **Contact sheet**: every shot's first, middle, and last frames (checks the shape of the whole piece)
2. **Strip**: every frame of a key motion — turns, takes, jumps, throws, transitions (0.1–0.15 s step)
3. **Crop**: full-resolution detail — faces, hands, contacts, glows

At each zoom level, check:
- **Read**: is the event clear from the sheet alone? Is the character big enough? Does it separate from the background?
- **Timing**: does every read have enough time to land?
- **Motion**: does every move have anticipation and follow-through? Any pops or snaps?
- **Boil**: in a strip, does stable linework match between frames? Anything still that changes every frame needs its own seed.
- **Contacts**: do feet touch the ground? Do held things touch the arm tips?
- **Transitions**: do the first and last 0.5 s of every shot open and close with a transition?
- **Rules**: any text? Any 3D? Any dead stretch where nothing is happening?

**Budget**: at least one sheet per shot, a strip for every key motion and transition, and a crop for every face that carries the story.

---

## Common Failures

| Failure | What it looks like |
|---------|-------------------|
| Signs / captions | Words anywhere on screen |
| Dead character | Standing still, smiling, nothing happening |
| Uniform speed | Everything at one brisk speed, events stacked |
| Flashed moments | Moments over before viewer understands them |
| Tiny character | Whole video with character < 12 units in a big empty landscape |
| Snapping faces | Expression swaps from one frame to the next |
| Mechanical motion | Linear moves, every part at once, mirrored arms |
| Timid poses | Takes that barely read |
| Jittery linework | Still things re-boiling because a moving element shifted the PRNG stream |
| Hard cuts everywhere | No transitions at seams |
| 3D rotation | `rotateY`, perspective boxes, or projected turns |
| Digital shapes | Plain CSS shapes mixed into drawn content |

---

## Render Pipeline

```bash
# Contact sheet: shape of the whole piece
node render.mjs --sheet=0.1,0.8,1.6,2.4,3.1,3.9 --cols=6 --w=320 --out=out/check/sheet.jpg

# Strip: every frame of a moment (turns, takes, jumps, throws)
node render.mjs --strip=2.1:2.6 --cols=6 --w=320 --out=out/check/strip.jpg

# Crop: full-resolution detail (face, hands, contacts, glows)
node render.mjs --sheet=2.3,2.4 --crop=760,420,500,400 --w=500 --out=out/check/face.jpg

# Crop following a world point through camera
node render.mjs --strip=2.1:2.6 --crop-at=960,700,500,400 --out=out/check/feet.jpg

# Final render
node render.mjs --clip --out=out/video.mp4
```

FrameForge equivalent:
```
render_animation({ mode: "review", contactSheet: true, stripStart: 2.1, stripEnd: 2.6 })
```

---

## Linux / Headless Rendering

For cloud or CI rendering without a GPU:

```bash
# Ubuntu 23.10+ blocks Chrome's sandbox
node render.mjs --clip --out=out/video.mp4  # adds --no-sandbox automatically on Linux

# Software WebGL (SwiftShader) when no GPU
node render.mjs --soft-gl --clip --out=out/video.mp4

# NVIDIA GPU on headless Linux
node render.mjs --gpu-angle=gl-egl --clip --out=out/video.mp4
# or: --gpu-angle=vulkan

# Check which renderer each flag set gets
node gpu_probe.mjs <chrome-path>

# Playwright's Chromium is found automatically
```

FrameForge Playwright renderer handles this automatically via `--no-sandbox` on Linux.
