# Editorial Paper Collage & Halftone B-Roll

Derived from `pyang5166/gbro-collage-broll`. Converts abstract script claims and voiceover segments into premium editorial paper-collage animations.

---

## The Three-Gate Validation Process

Never generate collage visual components blindly. Follow the 3-gate rule:

1. **Gate 1: Semantic Claim Extraction**
   - Identify the primary noun and verb in the voiceover beat.
   - Example: *"Interest rates surged to 20-year highs"* $\to$ Noun: `Central Bank / Rates`, Verb: `Surge / Escalator`.

2. **Gate 2: Visual Metaphor Alignment**
   - Match abstract concepts to tactile paper cutouts:
     - Growth / Inflation $\to$ Stacking banknotes, inflating balloon stamp, ascending staircase.
     - Tech / AI $\to$ Vintage computer monitor, mechanical gear cutouts, circuit blueprint overlay.
     - Time $\to$ Torn wall calendar pages, pocket watch face, pendulum swing.

3. **Gate 3: Spatial Layout & Halftone Verification**
   - 2.5D perspective tilt (`rotateX(15deg) rotateY(-10deg)`).
   - Halftone dot texture overlay (`radial-gradient(circle, #000 1.5px, transparent 1.5px)`).
   - Torn paper drop shadow (`filter: drop-shadow(4px 6px 0px rgba(0,0,0,0.35))`).

---

## 12fps Step-Stagger Entrance Contract

Collage elements must feel hand-placed, not mechanically smooth:

```javascript
// Step to 12fps stop-motion cadence
const step = Math.floor(t * 12);
const dropProgress = Math.min(1, step / 6); // settles in 0.5s

// Damped paper bounce
const scale = 1.15 - 0.15 * dropProgress;
const rot = -4 + Math.sin(seed * 11) * 3;
```

