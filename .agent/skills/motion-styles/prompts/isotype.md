# Motion graphics style #29: Isotype

- **ID:** `isotype`
- **Family:** Data
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (500 and 800), JetBrains Mono (700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Pictogram statistics in the Isotype tradition: a grid of small grey people icons that pop in row by row, then the share that matters turns coral one by one and regroups into its own block, under one huge number.

## How It Explains
The crowd fills in first so you feel the size, then the stat colours in person by person, the big ratio slams in, and the coloured people walk into their own block so the split is obvious. A plain source line stays at the bottom.

## Demo
1 in 3 US adults sleep less than 7 hours

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Isotype" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the stat (RATIO, the headline text and the big number), the icon shape in personIcon() if the subject is not people, the source line, the takeaway and scoreSound(). Keep and reuse the style's helpers (the 9 by 9 icon grid, the row-by-row pop in, the one-by-one colour fill, the regroup into a solid block (sorted target slots), the big number, the source line and the restrained palette).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (500 and 800), JetBrains Mono (700).

THE STYLE
- One icon equals a fixed number of people (say so if it is not 1). Use a real, sourced ratio and keep the count of coloured icons exact for it.
- Icons are simple and identical: a round head and a rounded body, grey (#c3ced8) by default, coral (#ff5a3c) for the share that matters. No other colours.
- Background: cool pale grey-blue (#edf2f6); text in deep navy (#13212e).
- Order: fill the crowd row by row, colour the share one by one, then move the coloured icons into a solid block at the start of the grid (sorted target slots) so the split reads at a glance.
- Type: Archivo Black for the big number, Inter 800 for the statement (second line in coral), JetBrains Mono for the source line at the bottom.
- Pace: crowd in about 1.5 seconds, colour fill about 2 seconds, regroup about 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the big number at 120 px or more, the statement at 30 px or more and the source at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("1 in 3 US adults sleep less than 7 hours") unless my content asks for it.

SOUND
- Bed: a calm, light pad (padBed).
- Map events to the kit: each row gets a soft "tick"; each coloured icon gets a short pluck that climbs; the big number gets "slam"; the regroup gets a soft "whoosh"; the takeaway gets an open chord.
- Full mix (no voiceover): a calm pad, a soft tick per row, a rising pluck per coloured icon, and a low hit on the big number.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Isotype
Family: Data
Look: Pictogram statistics in the Isotype tradition: a grid of small grey people icons that pop in row by row, then the share that matters turns coral one by one and regroups into its own block, under one huge number.
How it explains: The crowd fills in first so you feel the size, then the stat colours in person by person, the big ratio slams in, and the coloured people walk into their own block so the split is obvious. A plain source line stays at the bottom.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Isotype" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The crowd fills while the group is described, the colour fill runs while the share is said, the big number slams on the number, and the regroup happens on the comparison.
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
- Replace the demo's story: TL, the stat (RATIO, the headline text and the big number), the icon shape in personIcon() if the subject is not people, the source line, the takeaway and scoreSound(). Keep and reuse the style's helpers (the 9 by 9 icon grid, the row-by-row pop in, the one-by-one colour fill, the regroup into a solid block (sorted target slots), the big number, the source line and the restrained palette).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (500 and 800), JetBrains Mono (700).

THE STYLE
- One icon equals a fixed number of people (say so if it is not 1). Use a real, sourced ratio and keep the count of coloured icons exact for it.
- Icons are simple and identical: a round head and a rounded body, grey (#c3ced8) by default, coral (#ff5a3c) for the share that matters. No other colours.
- Background: cool pale grey-blue (#edf2f6); text in deep navy (#13212e).
- Order: fill the crowd row by row, colour the share one by one, then move the coloured icons into a solid block at the start of the grid (sorted target slots) so the split reads at a glance.
- Type: Archivo Black for the big number, Inter 800 for the statement (second line in coral), JetBrains Mono for the source line at the bottom.
- Pace: crowd in about 1.5 seconds, colour fill about 2 seconds, regroup about 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the big number at 120 px or more, the statement at 30 px or more and the source at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("1 in 3 US adults sleep less than 7 hours") unless my content asks for it.

SOUND
- Bed: a calm, light pad (padBed).
- Map events to the kit: each row gets a soft "tick"; each coloured icon gets a short pluck that climbs; the big number gets "slam"; the regroup gets a soft "whoosh"; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark ticks and plucks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Isotype
Family: Data
Look: Pictogram statistics in the Isotype tradition: a grid of small grey people icons that pop in row by row, then the share that matters turns coral one by one and regroups into its own block, under one huge number.
How it explains: The crowd fills in first so you feel the size, then the stat colours in person by person, the big ratio slams in, and the coloured people walk into their own block so the split is obvious. A plain source line stays at the bottom.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/isotype.html` (55.8 KB)
