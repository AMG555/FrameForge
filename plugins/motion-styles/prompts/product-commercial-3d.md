# Motion graphics style #106: 3D Studio Product Commercial

- **ID:** `product-commercial-3d`
- **Family:** 3D
- **Canvas:** `1920x1080` (16:9) or `1080x1920` (9:16)
- **Fonts:** Inter Tight (600, 800), JetBrains Mono (500)
- **Three.js 3D:** Yes (Three.js WebGL PBR Engine)
- **Footage Overlay:** No

## Look
Apple-grade luxury hardware commercial: Three.js physically based materials (anodized titanium, frosted clearcoat glass, brushed metallic edges), 3-point softbox studio lighting, contact ambient occlusion shadows on floor plane, macro rack-focus depth of field, and exploded internal mechanical assembly.

## How It Explains
Showcases physical products, industrial engineering, or high-end gadgets: the hero device slowly rotates in a dark studio void, sweeping rim lights highlight precision CNC chamfers, glass lenses reveal internal sensor arrays in exploded slow-motion, and ultra-crisp typographic specs animate alongside precision callout lines.

## Demo
Precision Engineered Audio & Acoustic Chamber Architecture

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "3D Studio Product Commercial" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its Three.js PBR materials, studio lighting stage, smooth turntable camera, exploded assembly, and synthesized sound score. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- ZERO UI CHROME: NEVER render on-screen player chrome, scrub bars, timeline progress lines, scene numbers (e.g. "01 / 26"), loading spinners, buffering rings, or corner metadata/source footers. Render pure broadcast video visuals only.
- Core motion helpers: Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Replace the product model, exploded components, specification callouts, and camera turntable sequence for my topic.
- Keep and reuse the style's core mechanics: Three.js ACES Filmic tone mapping, PCFSoftShadowMap, MeshStandardMaterial & MeshPhysicalMaterial with micro-roughness, soft shadow contact plane, rack-focus transitions, and precision measurement lines.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Inter Tight, JetBrains Mono.

THE STYLE
- Surface: deep matte studio stage (#08090b) with soft radial ground shadow falloff.
- Materials: PBR metallic surfaces (roughness 0.2, metalness 0.85), physical clearcoat glass with transmission, and glowing micro-LED indicator accents.
- Lighting: key softbox light casting soft PCF shadows + cool blue rim kicker light sculpting product edges.
- Motion: luxurious slow-motion turntable rotation ($t$), smooth camera push-ins, and precision exploded component separation with spring settling.
- Type: Inter Tight for bold feature claims; JetBrains Mono in cyan/white for technical specifications and dimensional tolerances.
- Audio: deep studio sub-bass drone, metallic friction whooshes, tactile pneumatic clicks, and acoustic riser sweeps.

RULES THAT KEEP IT IN STYLE
- Draw every product component accurately in 3D geometry.
- Every frame is a pure function of time t. Zero Math.random().
```
