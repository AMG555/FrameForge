# Motion graphics style #101: 3D Assembly Guide

- **ID:** `assembly-3d`
- **Family:** 3D
- **Canvas:** `1280x720`
- **Fonts:** Inter Tight, JetBrains Mono
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Step-by-step procedural exploded assembly instructions: clean cream backdrop, precision 3D mechanical components gliding smoothly into interlocking slots, rotating threaded screws driving into fastener holes, and dimensional callout badges.

## How It Explains
Technical manual brought to life in code: components hover in exploded view, guide arrows indicate motion paths, screws spin with ratchet sound cues, parts snap together with solid locking clicks, and floating step markers track progress.

## Demo
Modular furniture precision assembly

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "3D Assembly Guide" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers, synthesized sound kit, scenes, sound score, and canvas compositor. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player (play/pause, scrub, time, sound toggle, loop) and core motion helpers unchanged.
- Replace the demo story: TL, CUTS, 3D geometry meshes, fastener coordinates, exploded offsets, assembly sequence, and sound triggers. Keep and reuse the style's core mechanics: isometric perspective camera, exploded-to-assembled spring interpolation, threaded screw rotation, dimension caliper callouts, step badges.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Inter Tight, JetBrains Mono.

THE STYLE
- Surface: warm clean cream (#fbfaf6) technical drawing surface with subtle isometric grid lines and soft ambient occlusion shadows.
- Type: Inter Tight for clear instructional headlines; JetBrains Mono in bold uppercase for part IDs (PART A, SCREW M4x20) and step numbers.
- How things appear: mechanical panels hover in exploded isometric perspective and glide smoothly into alignment along dashed tracking lines.
- Emphasis: fastener screws spinning with tightening rotation; pre-drilled holes highlighted with glowing cyan rings; locking joints snapping shut.
- Pace: calm, methodical instructional pacing: 4 to 8 seconds per assembly step with clear visual confirmation before the next phase.

RULES THAT KEEP IT IN STYLE
- Change the story, words and props; do not change the medium. Draw every subject accurately for my topic.
- Every frame is a pure function of time t. Use seeded PRNG and deterministic sine/spring curves for all randomness, never unseeded Math.random.
- It will be watched on phones and monitors: keep step title at 72 px or more, part letters (A, B, C) at 48 px or more, dimension callouts at 26 px or more. Fill the frame.
- Keep each frame render fast, well under 30 ms.

SOUND
- Technical foley: precision metallic clinks, screwdriver ratchet turns, wooden peg taps, and solid lock clicks.
- Score: light, clean, acoustic or ambient electronic soundtrack providing steady working rhythm.
- Voiceover mix: mechanical clicks and locking snaps audible between phrases; music volume lowered 60% during voiceover.

STYLE CARD
Name: 3D Assembly Guide
Family: 3D
Look: Step-by-step procedural exploded assembly instructions: clean cream backdrop, precision 3D mechanical components gliding smoothly into interlocking slots, rotating threaded screws driving into fastener holes, and dimensional callout badges.
How it explains: Technical manual brought to life in code: components hover in exploded view, guide arrows indicate motion paths, screws spin with ratchet sound cues, parts snap together with solid locking clicks, and floating step markers track progress.
```
