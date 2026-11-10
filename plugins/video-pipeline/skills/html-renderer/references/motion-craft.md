# Motion Craft Reference — 10 Hard Motion Craft Rules

This guide defines the production motion design standards implemented across FrameForge and the HTML-as-compositor rendering pipeline.

---

## 1. Springs, Not Linear Easing
Real physical motion never moves at constant velocity or abrupt linear ramps. Every entrance and transition must model a damped harmonic oscillator:

$$\ddot{x} + 2\zeta\omega\dot{x} + \omega^2 x = 0$$

- **Default tension**: `160 - 200`
- **Default friction**: `13 - 16`
- **Closed-form function**: `spring(t, delay, tension, friction)` maps pure time $t$ to normalized displacement $[0, 1]$ with natural overshoot and settling.

---

## 2. Three-Property Entrances
Never animate a single property (such as opacity alone or scale alone). High-production visuals orchestrate three coordinated properties for every entering entity:
1. **Scale**: $0.88 \to 1.0$ (spatial arrival)
2. **Opacity**: $0.0 \to 1.0$ (perceptual fade)
3. **Translation**: $Y: +40\text{px} \to 0\text{px}$ or $X: \pm 60\text{px} \to 0\text{px}$ (directional momentum)

---

## 3. Staggered Entrance Choreography
Never trigger all elements simultaneously. When rendering cards, list items, or diagram nodes:
- Stagger siblings by $0.15\text{s} - 0.28\text{s}$ relative to base timestamp.
- Hierarchy flows from primary anchor $\to$ structural components $\to$ explanatory callouts $\to$ micro-badges.

---

## 4. Asymmetric Timing: Exits Faster Than Entrances
- **Entrances**: Informative, welcoming, gentle settling ($0.5\text{s} - 0.8\text{s}$ duration).
- **Exits**: Crisp, decisive, purposeful ($0.2\text{s} - 0.35\text{s}$ duration). Exits must clear the stage without lingering.

---

## 5. Five-Layer Depth Stack
Every scene must maintain clear atmospheric depth across 5 distinct visual layers:
- **Layer 1: Ambient Backdrop** — Radial gradients, atmospheric tint, depth falloff.
- **Layer 2: Environment / Context** — Architectural wainscoting, blueprint grid, floor plane, distant mountain ridges, or starry cosmos.
- **Layer 3: Primary Visual Entity** — The core subject (doodle character, cutaway engine, split comparison cards, neural insight core, or optical loupe).
- **Layer 4: Explanatory Callouts & Overlays** — Connecting vector lines, animated pulse packets, telemetry tags, and indicator badges.
- **Layer 5: Foreground Framing & Vignette** — Subtle radial corner shading, specular glass arcs, or foreground foliage.

---

## 6. Continuous Audio-Driven Camera Progression
Scenes must never switch camera angles at arbitrary fixed timer intervals. Camera motion is a continuous parametric function of speech duration:

$$p = \frac{t}{\text{DURATION}}$$

- **Dynamic zoom**: $1.0 + p \times 0.08$
- **Dynamic pan**: Organic Lissajous drift ($\sin(0.4t) \times 6\text{px}$)
- **Cut synchronization**: Scene cuts occur strictly on spoken sentence boundaries and audio cues.

---

## 7. Continuous Life (Zero Frozen PowerPoint Slides)
Every frame must contain subtle life. An audience detects static images instantly:
- Rotating gears ($t \times \omega$)
- Oscillating telemetry needles and wave pulses
- Flowing data packets along pipeline tracks
- Gentle character breathing and foliage sway ($\sin(3t) \times 4\text{px}$)

---

## 8. Hand-Drawn Boil Wobble at 12fps
When rendering hand-drawn doodle characters and sketch line work, apply authentic 12fps line boil wobble:
- Quantize step to 12fps: `step = Math.floor(t * 12)`
- Use seeded deterministic trigonometric noise:
  `Math.sin(seed * 19.37 + step * 2.41) * 2.4`
- Never use `Math.random()` inside the render loop.

---

## 9. Regional Typography & HarfBuzz Text Shaping
Ensure professional typographic hierarchy:
- Auto-detect script (Malayalam: Manjari / Gayathri / Chilanka; Devanagari: Noto Sans Devanagari; Latin: Inter / Rajdhani / Cinzel).
- Maintain WCAG AAA contrast ratios against backgrounds.
- Gate on-screen subtitles: display narration text only when explicitly requested in prompt.

---

## 10. Closed-Loop Visual QA Gate
Never deliver rendered video blind. The production harness must execute automated quality checks across 4 axes:
1. **Content Presence**: Non-blank ($> 1.5\%$ foreground variance).
2. **Luminance / Exposure**: Non-blown ($< 96\%$ overexposure).
3. **Compositional Distribution**: Not corner-confined ($> 12\%$ bbox coverage).
4. **Motion Delta Verification**: Test frame delta between $t = 30\%$ and $t = 70\%$ to guarantee continuous animation.
