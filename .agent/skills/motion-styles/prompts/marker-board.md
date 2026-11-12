# Motion graphics style #23: Marker Board

- **ID:** `marker-board`
- **Family:** Hand-Drawn
- **Canvas:** `720x1280`
- **Fonts:** Permanent Marker, Caveat (700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A clean whiteboard in a grey frame: black, blue, red and green marker doodles that draw themselves stroke by stroke, a visible marker pen following the tip, hand-drawn boxes, arrows, a red circle on the key idea and Caveat side notes.

## How It Explains
Everything appears by being drawn: the title writes on, then boxes, arrows and words are inked in order with the pen moving to each stroke. The key idea gets circled in red with a handwritten note, and a green tick or symbol lands the takeaway.

## Demo
The 3-step funnel

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Marker Board" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL and STROKES (the ordered list of what gets drawn: text, boxes, arrows, circles, notes, with their times and colours) and scoreSound(). Keep and reuse the style's helpers (the board, frame and tray, the ghost smudges, drawText() write-on reveal, hd() hand-drawn lines and ellipses, the pen that follows the active stroke tip, the four marker colours and the Caveat notes).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Permanent Marker, Caveat (700).

THE STYLE
- One whiteboard (#f9fafa) in a light grey frame with a tray at the bottom and faint ghost smudges of old erasing. No cuts: the whole idea is drawn on one board.
- Everything is drawn in order: text is revealed left to right with a clip (drawText), lines and shapes with hd() at the stroke progress. A marker pen (body, cap, tip) follows the tip of whatever is being drawn.
- Colours mean things: black for structure, blue for the title and labels, red only for the key idea (circle, underline, note), green only for the payoff.
- Type: Permanent Marker for all board writing; Caveat 700 for small handwritten side notes.
- Keep strokes chunky (4 to 6 px) and slightly wobbly, with two passes per line.
- Pace: something is always being drawn. Allow 0.4 to 1 second per stroke, and hold the finished board about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the title at 56 px or more, box words at 40 px or more and notes at 34 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The 3-step funnel") unless my content asks for it.

SOUND
- Bed: a quiet, warm pad.
- Map events to the kit: every stroke gets a marker squeak ("marker" for its duration, soft); a cap click (click) at the start; the red circle gets a longer, louder marker; the green payoff gets a pluck; the end gets an open chord.
- Full mix (no voiceover): marker squeaks on every stroke, a cap click at the start, and a soft pad under it all.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Marker Board
Family: Hand-Drawn
Look: A clean whiteboard in a grey frame: black, blue, red and green marker doodles that draw themselves stroke by stroke, a visible marker pen following the tip, hand-drawn boxes, arrows, a red circle on the key idea and Caveat side notes.
How it explains: Everything appears by being drawn: the title writes on, then boxes, arrows and words are inked in order with the pen moving to each stroke. The key idea gets circled in red with a handwritten note, and a green tick or symbol lands the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Marker Board" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each stroke starts as its word is spoken and finishes by the end of that phrase; the red circle draws on the stressed word.
- Cut between scenes only at idea boundaries (a new step, a new claim, a reveal), never mid-word, and finish each cut just before the next idea's first spoken word.
- Put the emphasis moves on stressed words. A counter lands at the exact moment its number is spoken.
- Keep the player's "Load voiceover" button working so I can drop in my audio and hear it in sync.

STORYBOARD FIRST
Before building, show me a storyboard and wait for my OK:
- One HTML page (an artifact if you can) with a grid of 6 to 10 panels, one per beat. Draw each panel on a canvas with the reference's own helpers, scene drawing and finishing pass, so the stills already look like the finished piece. No animation or sound yet.
- Under each panel: the beat number, its start and end time, the exact on-screen words, the camera move or emphasis, how it gets there from the previous beat (the same scene continuing, or a cut and which kind), and its key sounds.
- Below the grid, list any facts or numbers you had to assume.
When I approve it (or after my changes), build the full animation and reuse the storyboard's drawing code.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL and STROKES (the ordered list of what gets drawn: text, boxes, arrows, circles, notes, with their times and colours) and scoreSound(). Keep and reuse the style's helpers (the board, frame and tray, the ghost smudges, drawText() write-on reveal, hd() hand-drawn lines and ellipses, the pen that follows the active stroke tip, the four marker colours and the Caveat notes).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Permanent Marker, Caveat (700).

THE STYLE
- One whiteboard (#f9fafa) in a light grey frame with a tray at the bottom and faint ghost smudges of old erasing. No cuts: the whole idea is drawn on one board.
- Everything is drawn in order: text is revealed left to right with a clip (drawText), lines and shapes with hd() at the stroke progress. A marker pen (body, cap, tip) follows the tip of whatever is being drawn.
- Colours mean things: black for structure, blue for the title and labels, red only for the key idea (circle, underline, note), green only for the payoff.
- Type: Permanent Marker for all board writing; Caveat 700 for small handwritten side notes.
- Keep strokes chunky (4 to 6 px) and slightly wobbly, with two passes per line.
- Pace: something is always being drawn. Allow 0.4 to 1 second per stroke, and hold the finished board about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the title at 56 px or more, box words at 40 px or more and notes at 34 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The 3-step funnel") unless my content asks for it.

SOUND
- Bed: a quiet, warm pad.
- Map events to the kit: every stroke gets a marker squeak ("marker" for its duration, soft); a cap click (click) at the start; the red circle gets a longer, louder marker; the green payoff gets a pluck; the end gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark marker sounds soft: true so they sit under the voice.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Marker Board
Family: Hand-Drawn
Look: A clean whiteboard in a grey frame: black, blue, red and green marker doodles that draw themselves stroke by stroke, a visible marker pen following the tip, hand-drawn boxes, arrows, a red circle on the key idea and Caveat side notes.
How it explains: Everything appears by being drawn: the title writes on, then boxes, arrows and words are inked in order with the pen moving to each stroke. The key idea gets circled in red with a handwritten note, and a green tick or symbol lands the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/marker-board.html` (57.2 KB)
