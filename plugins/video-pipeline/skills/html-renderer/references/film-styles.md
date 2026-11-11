# Film Styles Catalog — 12 Production Video Aesthetics

Derived from `lemomo-ai/lemo-opuscar` and calibrated for FrameForge's code-driven rendering and FFmpeg post-processing.

---

## 1. Cinematic 2.39:1 (Anamorphic)
- **Aspect Ratio**: 1920×804 letterboxed or 2.39:1 wide.
- **Palette**: Deep teal (`#0A192F`), rich copper/gold (`#D4AF37`), slate shadow (`#0D1117`).
- **Motion**: Slow continuous push-in (`zoom_in`, $p = 1.0 + t \times 0.04$), organic Lissajous camera drift.
- **Lighting**: Subtle horizontal anamorphic lens flare (`linear-gradient(90deg, transparent 45%, rgba(0,210,255,0.4) 50%, transparent 55%)`).
- **FFmpeg Filter**: `curves=m='0/0 0.25/0.2 0.75/0.8 1/1':r='0/0 0.5/0.53 1/1':b='0/0.03 0.5/0.48 1/0.97',eq=saturation=1.12:contrast=1.05`.

---

## 2. Product Launch (OneTake Smooth)
- **Concept**: Fluid, single-shot 3D hero showcase (Apple / Teenage Engineering style).
- **Palette**: Pure dark obsidian (`#0F0F11`), titanium silver (`#E1E4E8`), neon blue accent (`#0070F3`).
- **Motion**: `onetake` continuous orbit. No cuts. The stage camera glides around the hero subject using smooth spring interpolation ($k=180, d=16$).
- **Lighting**: Studio rim lighting with specular glass reflections and ambient occlusion.

---

## 3. Editorial Paper Collage & Halftone (`gbro-collage-broll`)
- **Concept**: Physical magazine clippings, halftone screen dots, torn paper borders, 2.5D card tilt.
- **Palette**: Newsprint beige (`#F4EEDD`), printer black (`#1A1A1A`), risograph red (`#FF3E3E`), postal blue (`#1D4ED8`).
- **Motion**: Stop-motion 12fps step-stagger entrance, rotational drop with 3-property spring.
- **Border**: SVG `feTurbulence` torn edge filter.

---

## 4. Cyberpunk Neon
- **Concept**: High-voltage dystopian tech, terminal data HUDs, glowing reticles.
- **Palette**: Terminal black (`#05050A`), laser cyan (`#00F0FF`), electric magenta (`#FF0055`), hazard amber (`#FFE600`).
- **Motion**: Fast speed ramps (1.25x), chromatic aberration on transition, micro-glitch displacement.
- **FFmpeg Filter**: `curves=r='0/0 0.5/0.45 1/1':b='0/0.08 0.5/0.58 1/1',eq=saturation=1.3:contrast=1.1`.

---

## 5. Vintage 16mm Film
- **Concept**: Archival documentary, analog imperfections, warm organic glow.
- **Palette**: Warm sepia (`#3D2F1D`), aged ivory (`#F5EBE1`), faded olive (`#4A503D`).
- **Texture**: Seeded 12fps film grain, gentle gate weave ($y \pm 1.5\text{px}$), vignetted rounded corners.
- **FFmpeg Filter**: `curves=vintage,eq=contrast=0.95:saturation=0.85`.

---

## 6. Minimal Swiss Monochrome
- **Concept**: Grid-aligned brutalist architecture, massive typography, bold numbers.
- **Palette**: Stark white (`#FFFFFF`), pure pitch (`#000000`), international safety orange (`#FF5500`).
- **Typography**: Heavy grotesque sans-serif (`Archivo`, `Cabinet Grotesk`, `Inter Display`).
- **Motion**: Rigid geometric slides along orthogonal 12-column grid.

---

## 7. Anime Action & Speedlines
- **Concept**: Shonen battle energy, radiant impact lines, frame freeze punches.
- **Palette**: Midnight navy (`#0B0E14`), flash yellow (`#FFE500`), crimson fire (`#FF1E27`).
- **Motion**: 1-frame impact white flash on narrative beat drops, radiating radial vector lines, extreme punch-in (1.20x).

---

## 8. Retro VHS Cassette
- **Concept**: 1980s magnetic tape playback, tracking errors, scanlines.
- **Palette**: CRT green tint (`#102A12`), phosphorescent white (`#E6FFE6`).
- **Overlay**: Blinking REC symbol, monospace timestamp in corner (`SP 00:04:12`), subtle horizontal sync tear.

---

## 9. Sci-Fi Vector HUD
- **Concept**: Telemetry telemetry data, circular reticles, radar sweeps, coordinate displays.
- **Palette**: Dark space blue (`#020813`), tactical emerald (`#00FF88`), radar amber (`#FFB300`).
- **Motion**: Continuously rotating bearing dials ($\omega = 0.5\text{rad/s}$), pulsing wave graphs.

---

## 10. Lo-Fi Chill / Bedroom Beats
- **Concept**: Calm pastel aesthetic, ambient floating particles, soft shadows.
- **Palette**: Lavender dusk (`#9D8DF1`), dusty rose (`#B88698`), cream peach (`#FFEEDB`).
- **Motion**: Ultra-smooth easing (`easeInOutQuad`), floating dust motes with sine drift.

---

## 11. Broadcast News / Financial Explainer
- **Concept**: CNBC / Bloomberg ticker, multi-panel layout, telemetry graphs.
- **Palette**: Financial blue (`#0A2540`), green profit (`#00D924`), alert red (`#E60000`).
- **Components**: Scrolling live ticker at bottom, animated line chart drawing left to right.

---

## 12. 3D Isometric Blueprint
- **Concept**: Technical engineering breakdown, wireframe orthographic perspective.
- **Palette**: Blueprint cobalt (`#0D3B66`), drafting cyan (`#64DFDF`), technical white (`#F8F9FA`).
- **Projection**: `rotateX(60deg) rotateZ(-45deg)` CSS 3D stage with layered extruded cards.

