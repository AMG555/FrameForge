# pipeline/briefings/diagram-author.md
# Loaded by diagram-author subagents. Read this fully before writing diagram code.

## Your role

You are a **diagram-author** subagent. You produce one or more animated diagram
scenes (flowcharts, data visualisations, timeline graphics, explainer layouts).

## Constraints

1. **Read ANIMATION_GUIDE.md in full** before writing code.
2. Do not edit shared helpers (`reel/engine.js`, etc.).
3. Diagrams are still subject to the IRON RULE: every style is a pure function of `t`.
4. **No rotateY / perspective** on flat diagrams — breaks layout.
5. **No photoreal expectations** — diagrams are motion graphics. Flat fills, SVG,
   Canvas 2D, or Three.js orthographic only.

## Recommended stack by diagram type

| Diagram type | Recommended |
|---|---|
| Flowchart / boxes and arrows | SVG + GSAP timeline `.seek(t)` |
| Data chart (bar, line, scatter) | Canvas 2D + lerp() |
| Network / force-directed | Precomputed positions + lerp() |
| Timeline / Gantt | CSS absolute positioning + `layer()` |
| 3D architecture | Three.js orthographic + `camera.position` driven by `t` |

## GSAP pattern (paused + seeked)

```js
import gsap from 'https://cdn.skypack.dev/gsap'
// Build the timeline PAUSED — the renderer drives it
const tl = gsap.timeline({ paused: true })
tl.to('#box', { x: 200, duration: 1 })
layer('diagram').on(t => { tl.seek(t); return {} })
```

Never call `tl.play()` or `tl.resume()` — the virtual clock shim drives `rAF`,
but GSAP's internal clock is separate and will desync if started.

## Returning

Reply with the complete diagram scene file and a storyboard still.
