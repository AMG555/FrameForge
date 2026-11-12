# Motion graphics style #34: Swiss Grid

- **ID:** `swiss-grid`
- **Family:** Kinetic Type
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (500, 700 and 900)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
International Typographic Style in motion: a strict six-column grid, one huge number, solid red, black and blue geometric blocks, flush-left Inter in black, and small caps labels, all snapping into place with precise wipes.

## How It Explains
Blocks wipe in along the grid, the big number counts up digit by digit, and the statement snaps in line by line. Halfway through, the whole composition re-arranges on the grid to introduce the second point, then settles on a one-line takeaway.

## Demo
73% of your brain is water

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Swiss Grid" style (Kinetic Type) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the fact (NUM, its unit, the statement lines, the second point), the block layout in LAYOUTS, the source line, the takeaway and scoreSound(). Keep and reuse the style's helpers (the six-column grid, the wipe-in blocks, the digit-by-digit counter, the line-by-line mask reveals, the grid re-arrangement between LAYOUTS, the strict left alignment and the red, black and blue palette).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (500, 700 and 900).

THE STYLE
- Off-white ground (#f5f5f2) with a faint six-column grid (60 px columns plus margins). Everything snaps to the grid; nothing is centred except by the grid.
- Colour is structural: red (#e1251b) and blue (#1f4fd8) blocks, black (#111) type and bars, nothing else.
- One huge number in Archivo Black, counting up digit by digit; statements in Inter 900, flush left, tight leading; labels in Inter 700 small caps with tracking.
- Motion is precise: rectangular wipes, mask reveals that rise exactly one line, and layout changes where every block slides to a new grid position with the same easing.
- Always show the source in small type at the bottom.
- Pace: the composition builds in about 2 seconds, the number counts for about 1.5 seconds, one re-arrangement, then the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the big number at 180 px or more, statements at 46 px or more and labels at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("73% of your brain is water") unless my content asks for it.

SOUND
- Bed: a minimal pulse: a soft sine bass note on each beat and a quiet click track.
- Map events to the kit: each block wipe gets a crisp "click"; number digits get a "tick" each; the lock gets a low sine hit; the re-arrangement gets a short "whoosh"; the takeaway gets a single clean chord.
- Full mix (no voiceover): a minimal pulse (a soft sine bass and clicks), a crisp click per block, a low hit when the number locks.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Swiss Grid
Family: Kinetic Type
Look: International Typographic Style in motion: a strict six-column grid, one huge number, solid red, black and blue geometric blocks, flush-left Inter in black, and small caps labels, all snapping into place with precise wipes.
How it explains: Blocks wipe in along the grid, the big number counts up digit by digit, and the statement snaps in line by line. Halfway through, the whole composition re-arranges on the grid to introduce the second point, then settles on a one-line takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Swiss Grid" style (Kinetic Type) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Blocks wipe in on the beat of the first sentence, the number locks on its last spoken syllable, each statement line snaps on its first word, and the re-arrangement lands on the turn ("but", "and").
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
- Replace the demo's story: TL, the fact (NUM, its unit, the statement lines, the second point), the block layout in LAYOUTS, the source line, the takeaway and scoreSound(). Keep and reuse the style's helpers (the six-column grid, the wipe-in blocks, the digit-by-digit counter, the line-by-line mask reveals, the grid re-arrangement between LAYOUTS, the strict left alignment and the red, black and blue palette).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (500, 700 and 900).

THE STYLE
- Off-white ground (#f5f5f2) with a faint six-column grid (60 px columns plus margins). Everything snaps to the grid; nothing is centred except by the grid.
- Colour is structural: red (#e1251b) and blue (#1f4fd8) blocks, black (#111) type and bars, nothing else.
- One huge number in Archivo Black, counting up digit by digit; statements in Inter 900, flush left, tight leading; labels in Inter 700 small caps with tracking.
- Motion is precise: rectangular wipes, mask reveals that rise exactly one line, and layout changes where every block slides to a new grid position with the same easing.
- Always show the source in small type at the bottom.
- Pace: the composition builds in about 2 seconds, the number counts for about 1.5 seconds, one re-arrangement, then the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the big number at 180 px or more, statements at 46 px or more and labels at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("73% of your brain is water") unless my content asks for it.

SOUND
- Bed: a minimal pulse: a soft sine bass note on each beat and a quiet click track.
- Map events to the kit: each block wipe gets a crisp "click"; number digits get a "tick" each; the lock gets a low sine hit; the re-arrangement gets a short "whoosh"; the takeaway gets a single clean chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark clicks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Swiss Grid
Family: Kinetic Type
Look: International Typographic Style in motion: a strict six-column grid, one huge number, solid red, black and blue geometric blocks, flush-left Inter in black, and small caps labels, all snapping into place with precise wipes.
How it explains: Blocks wipe in along the grid, the big number counts up digit by digit, and the statement snaps in line by line. Halfway through, the whole composition re-arranges on the grid to introduce the second point, then settles on a one-line takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/swiss-grid.html` (55.9 KB)
