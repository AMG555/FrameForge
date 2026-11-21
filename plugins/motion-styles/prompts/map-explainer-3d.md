# Motion graphics style #105: 3D Map Explainer

- **ID:** `map-explainer-3d`
- **Family:** 3D
- **Canvas:** `1920x1080` (16:9) or `1080x1920` (9:16)
- **Fonts:** Space Grotesk (700), JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes (Three.js WebGL Geospatial Engine)
- **Footage Overlay:** No

## Look
The premier geopolitical and investigative journalism map aesthetic (Vox / Johnny Harris / RealLifeLore): Three.js displaced terrain elevation, procedural ocean shader with Gerstner wave ripples and shoreline foam, glowing vector boundary ribbons, curved 3D flight/trade arcs with traveling photon pulses, floating glass city pins projected to screen coordinates, and low-altitude cinematic flyovers under ACES Filmic studio sunlight.

## How It Explains
Complex geopolitical, historical, economic, or territorial conflicts explained through terrain: the camera swoops down through mountain passes, rivers glint under dynamic sunlight, disputed borders pulse with neon outline ribbons, glowing arcs track trade routes and troop movements, and floating statistical pins lock in place over strategic straits.

## Demo
The Geopolitics of Global Chokepoints & Trade Corridors

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "3D Map Explainer" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its Three.js procedural terrain elevation, ocean water shader, glowing boundary ribbons, 3D curved flight arcs, screen-projected labels, and synthesized sound score. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or coordinates you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player (play/pause, scrub, time, sound toggle, loop) and core motion helpers unchanged.
- Replace the demo story: terrain heightmap/coordinates, boundary ribbons, flight arcs, city pin labels, camera flyover path, and audio cues.
- Keep and reuse the style's core mechanics: Three.js ACES Filmic tone mapping, PCFSoftShadowMap, hypsometric terrain tinting, Gerstner ocean waves, glowing 3D Bezier trade arcs with traveling photon light pulses, and world-to-screen projected label cards.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Space Grotesk, JetBrains Mono.

THE STYLE
- Surface: rich displaced 3D terrain with hypsometric color bands (deep sea navy #0a1b38 -> sand #e4d7a8 -> forest green #2a4c28 -> rock grey #5a5652 -> snow white #f5f6f8).
- Ocean: dynamic procedural Gerstner wave shader with Fresnel edge reflection, sunlight specular glint, and shoreline white foam.
- Boundaries: country borders highlighted as extruded 3D ribbons with emissive glow (cyan #38bdf8 or danger amber #f59e0b).
- Routes & Arcs: 3D Quadratic Bezier curves rising above terrain, with bright traveling photon dots indicating direction of flow ($t$).
- Pins & Typography: 2D glass cards projected to screen coordinates (`vector.project(camera)`) floating above cities with leader lines.
- Camera: sweeping low-altitude Catmull-Rom spline flyovers with smooth banking and natural horizon roll.
- Audio: low cinematic ambient rumble, ocean breeze, subtle radio communication clicks, radar blips, and sonic booms on route locks.

RULES THAT KEEP IT IN STYLE
- Change the geography, labels, and routes; do not change the medium. Draw every territory and route accurately for my topic.
- Every frame is a pure function of time t. Use seeded PRNG and deterministic curves for all motion. Zero Math.random().
- Keep primary territory titles at 48 px or more, data callouts at 24 px or more.
```
