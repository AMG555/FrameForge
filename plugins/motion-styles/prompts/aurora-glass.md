# Motion graphics style #98: Aurora Glass

- **ID:** `aurora-glass`
- **Family:** Screen and UI
- **Canvas:** `1280x720`
- **Fonts:** Plus Jakarta Sans (600-800), Inter (400-600), Space Mono
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Premium dark creator tech explainer: deep near-black canvas (#0A0E14) with a rising cyan aurora bloom, floating frosted glassmorphism cards with hairline top highlights, edge-lit neon phone mockups, glowing geometric typography, and smooth focus-stacked parallax.

## How It Explains
Gliding camera moves through a layered 3D depth of field: key metrics and headlines glow with soft blue halos, glass tiles spring in with parallax drift, dashed connector lines draw between nodes, and data pills pulse with beat-synced timing.

## Demo
The architecture of next-gen AI systems

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Aurora Glass" style (Screen and UI) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers, synthesized sound kit, scenes, sound score, and canvas compositor. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player (play/pause, scrub, time, sound toggle, loop) and core motion helpers unchanged.
- Replace the demo story: TL, CUTS, metrics, glass cards, headline tokens, node trees, and audio cues. Keep and reuse the style's core mechanics: aurora bloom, frosted glass card compositor, hairline edge-lit highlights, focus stack blur, smooth power4 easing.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Plus Jakarta Sans (600-800), Inter (400-600), Space Mono.

THE STYLE
- Surface: deep near-black (#0A0E14) canvas with a radial cyan/electric blue (#37BDF8) aurora bloom rising from bottom-center and a faint coordinate dot-grid.
- Type: Plus Jakarta Sans for bold glowing statements, Inter for neutral body lines, Space Mono for compact timestamps and data tokens.
- How things appear: elements fade up with smooth exponential focus pulls; frosted glass cards spring in with gentle back.out easing and parallax y-drift.
- Emphasis: edge-lit neon borders around phone frames and metric tiles; soft breathing glow halos on hero numbers; dashed connectors animating between nodes.
- Pace: calm, authoritative, breathing rhythm — no harsh stepped stutters; smooth camera parallax and slow cinematic push-ins.

RULES THAT KEEP IT IN STYLE
- Change the story, words and props; do not change the medium. Draw every subject accurately for my topic.
- Every frame is a pure function of time t. Use seeded PRNG and deterministic sine/spring curves for all randomness, never unseeded Math.random.
- It will be watched on phones and monitors: keep statement text at 72 px or more, metric numbers at 110 px or more, data pills at 26 px or more. Fill the frame.
- Keep each frame render fast, well under 30 ms.

SOUND
- Atmosphere: low warm sub bass drone, smooth pneumatic whooshes, high-frequency glass taps, and soft chime arpeggios.
- Sync: UI card arrivals sync to vocal emphasis; number counter ticks lock to frame boundaries.
- Voiceover mix: ambient sub drone stays low beneath speech; glass card pop and connector swoosh sounds ducked 60%.

STYLE CARD
Name: Aurora Glass
Family: Screen and UI
Look: Premium dark creator tech explainer: deep near-black canvas (#0A0E14) with a rising cyan aurora bloom, floating frosted glassmorphism cards with hairline top highlights, edge-lit neon phone mockups, glowing geometric typography, and smooth focus-stacked parallax.
How it explains: Gliding camera moves through a layered 3D depth of field: key metrics and headlines glow with soft blue halos, glass tiles spring in with parallax drift, dashed connector lines draw between nodes, and data pills pulse with beat-synced timing.
```
