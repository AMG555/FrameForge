# Motion graphics style #97: Paper Collage Film

- **ID:** `paper-collage-film`
- **Family:** Hand-Drawn
- **Canvas:** `1920x1080`
- **Fonts:** Fraunces, Ultra, Inter
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Torn-paper stop-motion collage film on twos: layered paper strips with white fibrous edges, watercolour sky, halftone textures, photo cutouts dropping in with squash and bounce, push-ins to paper iris zooms, kaleidoscopic mirrors, and title drops on torn bands.

## How It Explains
Continuous camera journey through physical paper layers: rip wipes reveal new scenes, photo cutouts slap and settle, details zoom through paper irises, paper strip rockets transition upwards, and text slams with white paper backings and perspective drop shadows.

## Demo
Physical Torn Paper Wildlife Trailer

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Paper Collage Film" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers, synthesized sound kit, scenes, sound score, and canvas compositor. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player (play/pause, scrub, time, sound toggle, loop) and core motion helpers unchanged.
- Replace the demo story: TL, CUTS, SCENES, COPY, cutouts, paper textures, score cues, and sound foley. Keep and reuse the style's core mechanics: CL.torn, CL.piece, CL.drop, CL.iris, CL.kaleidoscope, paper foley synthesizer, 12fps boiling on twos.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Fraunces, Ultra, Inter.

THE STYLE
- Surface: warm torn kraft paper and newsprint layers (#efe9dc, #f4ecd8) with white fibrous torn edges (2 to 14 px width) and 12fps paper boil on twos.
- Type: Fraunces Black Italic for headlines, Ultra for stamped emphasis words, Inter for small subtitle labels.
- How things appear: paper cutouts drop in over 4 frames with squash and settle; rip wipes tear across the screen; paper irises zoom into microscopic details.
- Transitions: zero hard digital cuts — continuous physical camera moves: paper rip wipes, hexagon kaleidoscope mirrors, and strip rocket ascents.
- Pace: continuous fluid stop-motion rhythm at 12fps, punch zooms on musical beats, and a 1.5s logo brand hold at the finish.

RULES THAT KEEP IT IN STYLE
- Change the story, words and props; do not change the medium. Draw every subject accurately for my topic.
- Every frame is a pure function of time t. Use seeded PRNG and deterministic sine/spring curves for all randomness, never unseeded Math.random.
- It will be watched on phones and monitors: keep main title text at 110 px or more, callout tags at 32 px or more, label chips at 24 px or more. Fill the frame.
- Keep each frame render fast, well under 30 ms.

SOUND
- Synthesized paper foley: paper tear swooshes, cardboard slaps, newsprint crumples, typewriter taps, and bell rings.
- Score: warm rhythmic funk groove or marimba acoustic arpeggios synchronized to 120 BPM beat grid.
- Voiceover mix: paper foley ducked under speech, crisp paper slaps and tears hit on pauses and transition cuts.

STYLE CARD
Name: Paper Collage Film
Family: Hand-Drawn
Look: Torn-paper stop-motion collage film on twos: layered paper strips with white fibrous edges, watercolour sky, halftone textures, photo cutouts dropping in with squash and bounce, push-ins to paper iris zooms, kaleidoscopic mirrors, and title drops on torn bands.
How it explains: Continuous camera journey through physical paper layers: rip wipes reveal new scenes, photo cutouts slap and settle, details zoom through paper irises, paper strip rockets transition upwards, and text slams with white paper backings and perspective drop shadows.
```
