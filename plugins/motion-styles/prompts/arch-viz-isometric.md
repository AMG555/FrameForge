# Motion graphics style #107: 3D Architectural Cutaway

- **ID:** `arch-viz-isometric`
- **Family:** 3D
- **Canvas:** `1920x1080` (16:9) or `720x1280` (9:16)
- **Fonts:** Space Grotesk (700), Inter (500)
- **Three.js 3D:** Yes (Three.js WebGL Architecture Engine)
- **Footage Overlay:** No

## Look
Architectural Digest and engineering cross-section explainer: clean isometric perspective, cutaway walls revealing multi-story interior layouts, warm oak flooring and matte architectural concrete, transparent glass partitions, dynamic sun study lighting (morning to golden hour shadow drift), and animated dimension callouts.

## How It Explains
Explains architectural space, infrastructure, sustainable building systems, or urban planning: slabs and structural columns assemble upward from the ground plane, walls slide into position, daylight sweeps through interior rooms casting moving sunbeam shadows, and callout arrows highlight airflow, thermal zones, and floor area metrics.

## Demo
Sustainable Net-Zero Biophilic Residence & Thermal Envelope

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "3D Architectural Cutaway" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its Three.js isometric building cutaway, sun-study shadow sweep, interior material shaders, and architectural callout system. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player and core motion helpers unchanged.
- Replace the floorplan, structural slabs, room dividers, dimension callouts, and sun path for my topic.
- Keep and reuse the style's core mechanics: isometric camera with orthographic/low-FOV projection, dynamic sun shadow sweep ($t$), glass cutaway partitions, concrete and wood materials, and animated dimension arrows.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Space Grotesk, Inter.

THE STYLE
- Surface: warm pale grey drawing board (#f4f5f7) with subtle millimeter grid lines.
- Architecture: clean white render walls, warm natural timber panels (#c89666), dark steel mullions (#1e232a), and translucent glass.
- Lighting: dynamic sun position sweeping along an arc, casting realistic long shadows across interior rooms.
- Callouts: architectural leader lines, square meter badges, and animated dashed airflow / circulation paths.
- Audio: ambient room tone, soft construction acoustic percussion, slide ruler snaps, and crisp pencil strike accents.
```
