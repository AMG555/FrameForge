# Motion graphics style #102: Metamorphosis Specimen

- **ID:** `metamorphosis-specimen`
- **Family:** Hand-Drawn
- **Canvas:** `1280x720`
- **Fonts:** Cinzel, Caveat, JetBrains Mono
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Scientific biological documentary: deep navy cyan blueprint grid alternating with warm colored-pencil specimen illustrations, circular microscope loupe overlays with measurement calipers, and synthesized marimba/bell score.

## How It Explains
Microscopic life-cycle progression: cross-sectional blueprint views cut to organic hand-drawn details, magnifying reticles zoom into cellular structures, stage indicators step forward, and delicate lines animate organic growth.

## Demo
The metamorphosis of the monarch butterfly

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Metamorphosis Specimen" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers, synthesized sound kit, scenes, sound score, and canvas compositor. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player (play/pause, scrub, time, sound toggle, loop) and core motion helpers unchanged.
- Replace the demo story: TL, CUTS, specimen illustration curves, microscopy zoom coordinates, anatomical labels, and musical scale cues. Keep and reuse the style's core mechanics: dual navy blueprint / colored-pencil compositor, circular magnifying loupe with measurement ticks, organic path evolution, marimba synthesizer.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Cinzel, Caveat, JetBrains Mono.

THE STYLE
- Surface: alternating between deep navy cyan blueprint grid (#0b192c, #1e3e62) with fine white engineering lines and warm botanical drawing paper (#f8f5ee).
- Type: Cinzel for classical scientific taxonomy titles; Caveat for hand-penciled field annotations; JetBrains Mono for micrometer scale readings.
- How things appear: specimen outlines draw on with organic stroke evolution; magnifying loupe sweeps across frame to enlarge cellular textures.
- Emphasis: circular microscopy reticles with concentric degree ticks and vernier calipers; pulsating biological nodes indicating growth points.
- Pace: poetic, documentary cadence — slow observational holds giving viewers time to absorb intricate biological details.

RULES THAT KEEP IT IN STYLE
- Change the story, words and props; do not change the medium. Draw every subject accurately for my topic.
- Every frame is a pure function of time t. Use seeded PRNG and deterministic sine/spring curves for all randomness, never unseeded Math.random.
- It will be watched on phones and monitors: keep scientific title at 80 px or more, anatomical labels at 30 px or more, scale markings at 22 px or more. Fill the frame.
- Keep each frame render fast, well under 30 ms.

SOUND
- Synthesized acoustic score: Web Audio OfflineAudioContext synthesized marimba, tuned bells, focal ring clicks, and gentle paper sweeps.
- Atmosphere: resonant organic ambiance elevating educational curiosity without distracting from narration.
- Voiceover mix: melodic bells and marimba chime on phrase pauses; continuous science drone ducked 70% under narration.

STYLE CARD
Name: Metamorphosis Specimen
Family: Hand-Drawn
Look: Scientific biological documentary: deep navy cyan blueprint grid alternating with warm colored-pencil specimen illustrations, circular microscope loupe overlays with measurement calipers, and synthesized marimba/bell score.
How it explains: Microscopic life-cycle progression: cross-sectional blueprint views cut to organic hand-drawn details, magnifying reticles zoom into cellular structures, stage indicators step forward, and delicate lines animate organic growth.
```
