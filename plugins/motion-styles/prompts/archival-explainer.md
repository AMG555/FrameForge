# Motion graphics style #99: Archival Explainer

- **ID:** `archival-explainer`
- **Family:** Edit Overlay
- **Canvas:** `1280x720`
- **Fonts:** Fraunces (300 to 900 italic), Archivo (700 caps), Caveat
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Investigative editorial documentary collage: warm newsprint paper (#efe9dc) with fine print grain, archival cutouts with thick colored sticker borders, signature cyan-blue marker highlight boxes, high-contrast Fraunces serif headlines, and snappy stop-motion on twos.

## How It Explains
Snappy stepped cuts and low-shutter timing: yellow and cyan marker sweeps highlight scanned document evidence, hand-drawn arrows connect margin notes, pushpin maps track routes, and photo cards rack focus in shallow 3D space.

## Demo
How global shipping routes secretly changed

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Archival Explainer" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers, synthesized sound kit, scenes, sound score, and canvas compositor. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file:
- Keep the page player (play/pause, scrub, time, sound toggle, loop) and core motion helpers unchanged.
- Replace the demo story: TL, CUTS, evidence cards, highlighter boxes, document scans, map routes, and sound cues. Keep and reuse the style's core mechanics: newsprint paper texture, stepped stop-motion on twos, sticker cutout borders, marker highlight sweep, Caveat margin notes.
- Aim for 15 to 45 seconds unless my content needs more, and set the duration in window.DURATION.
- Keep window.seek(t), window.DURATION, and deterministic rendering exposed so the video renders frame by frame via headless Chrome and FFmpeg.
- Load the style's fonts before first draw: Fraunces (300 to 900 italic), Archivo (700 caps), Caveat.

THE STYLE
- Surface: warm newsprint paper (#efe9dc) with subtle print fibers, faint blueprint grid, and fine film grain stepped on twos.
- Type: Fraunces serif for expressive high-contrast headlines, Archivo in uppercase for chapter tags and dates, Caveat for hand-drawn margin notes.
- How things appear: archival cutout cards snap in with snappy overshoots; marker highlight boxes wipe across key phrases from left to right.
- Emphasis: signature AIS cyan (#37BDF8) or warning red (#e23b2e) marker shapes; hand-drawn arrows and scribbles linking evidence.
- Pace: snappy, journalistic, low-shutter stop-motion rhythm with deliberate stepped timing (steps(6)) and shallow 3D rack focus.

RULES THAT KEEP IT IN STYLE
- Change the story, words and props; do not change the medium. Draw every subject accurately for my topic.
- Every frame is a pure function of time t. Use seeded PRNG and deterministic sine/spring curves for all randomness, never unseeded Math.random.
- It will be watched on phones and monitors: keep headline text at 84 px or more, archival document text legible at 28 px or more, chapter kickers at 24 px or more. Fill the frame.
- Keep each frame render fast, well under 30 ms.

SOUND
- Documentary foley: marker squeak sweeps, typewriter keystrokes, paper shuffle snaps, projector motor hum, and camera shutter clicks.
- Music: thoughtful investigative brass and rhythmic bass line pacing the narrative progression.
- Voiceover mix: marker sweeps and paper snaps hit in rhythmic dialogue gaps; background projector ambient ducked 70%.

STYLE CARD
Name: Archival Explainer
Family: Edit Overlay
Look: Investigative editorial documentary collage: warm newsprint paper (#efe9dc) with fine print grain, archival cutouts with thick colored sticker borders, signature cyan-blue marker highlight boxes, high-contrast Fraunces serif headlines, and snappy stop-motion on twos.
How it explains: Snappy stepped cuts and low-shutter timing: yellow and cyan marker sweeps highlight scanned document evidence, hand-drawn arrows connect margin notes, pushpin maps track routes, and photo cards rack focus in shallow 3D space.
```
