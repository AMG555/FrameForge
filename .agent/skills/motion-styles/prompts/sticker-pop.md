# Motion graphics style #54: Sticker Pop

- **ID:** `sticker-pop`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Fredoka (600 and 700), Caveat (700)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
A cosy scrapbook layer over your vlog: die-cut stickers with thick white borders (a title pill, stars, hearts, a coffee cup), striped washi tape on the corners and a lined paper note with handwriting, all popping in with a wobble.

## How It Explains
Stickers slap on in rhythm with what you say: a title pill first, then small mood stickers near you, a handwritten note that writes itself, and a tick-list that fills in. Each one pops with overshoot, settles with a little wobble and peels away before the next set.

## Demo
A study-with-me vlog intro

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Sticker Pop" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, STICKERS (shape, colour, position, time), the title pill text, the note lines and the tick-list, and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage(), the die-cut sticker painter (white border, drop shadow, pop and wobble), washi tape, the lined note with the Caveat write-on, the tick-list and the peel-off exit).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (600 and 700), Caveat (700).

THE STYLE
- Built for your footage: stickers sit around you, never over your face; footage() shows your clip or the stand-in.
- Stickers are drawn in code with a thick white die-cut border and a soft drop shadow, in soft candy colours (pink #ff7eb6, yellow #ffd23f, mint #8de0c4, coffee #a0704a). No emoji images or brand stickers.
- Motion: pop in with overshoot (back ease), then a decaying wobble; peel off by scaling down with a tilt.
- Washi tape: translucent pastel strips with paler stripes at the frame corners.
- Notes: off-white lined paper with Caveat handwriting that writes left to right; tick boxes fill with a hand-drawn check.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the title pill at 40 px or more, note handwriting at 40 px or more, and stickers at least 90 px across. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A study-with-me vlog intro") unless my content asks for it.

SOUND
- Bed: a soft lo-fi pad with a gentle beat.
- Map events to the kit: stickers get a squishy pop (SND.bloop plus "pop"); tape gets a short rip (a rising band-passed noise); the note gets SND.scratch; ticks get "marker" short; peel-offs get a soft "whoosh".
- Full mix (no voiceover): a soft lo-fi bed, a squishy pop for each sticker, a tape rip for washi, pencil scratches for the note.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Sticker Pop
Family: Edit Overlay
Look: A cosy scrapbook layer over your vlog: die-cut stickers with thick white borders (a title pill, stars, hearts, a coffee cup), striped washi tape on the corners and a lined paper note with handwriting, all popping in with a wobble.
How it explains: Stickers slap on in rhythm with what you say: a title pill first, then small mood stickers near you, a handwritten note that writes itself, and a tick-list that fills in. Each one pops with overshoot, settles with a little wobble and peels away before the next set.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Sticker Pop" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The title pill pops on the first word, each mood sticker on the word it matches, the note writes while you say it, and each tick lands on its item.
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
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, STICKERS (shape, colour, position, time), the title pill text, the note lines and the tick-list, and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage(), the die-cut sticker painter (white border, drop shadow, pop and wobble), washi tape, the lined note with the Caveat write-on, the tick-list and the peel-off exit).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (600 and 700), Caveat (700).

THE STYLE
- Built for your footage: stickers sit around you, never over your face; footage() shows your clip or the stand-in.
- Stickers are drawn in code with a thick white die-cut border and a soft drop shadow, in soft candy colours (pink #ff7eb6, yellow #ffd23f, mint #8de0c4, coffee #a0704a). No emoji images or brand stickers.
- Motion: pop in with overshoot (back ease), then a decaying wobble; peel off by scaling down with a tilt.
- Washi tape: translucent pastel strips with paler stripes at the frame corners.
- Notes: off-white lined paper with Caveat handwriting that writes left to right; tick boxes fill with a hand-drawn check.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the title pill at 40 px or more, note handwriting at 40 px or more, and stickers at least 90 px across. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A study-with-me vlog intro") unless my content asks for it.

SOUND
- Bed: a soft lo-fi pad with a gentle beat.
- Map events to the kit: stickers get a squishy pop (SND.bloop plus "pop"); tape gets a short rip (a rising band-passed noise); the note gets SND.scratch; ticks get "marker" short; peel-offs get a soft "whoosh".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark every sound soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Sticker Pop
Family: Edit Overlay
Look: A cosy scrapbook layer over your vlog: die-cut stickers with thick white borders (a title pill, stars, hearts, a coffee cup), striped washi tape on the corners and a lined paper note with handwriting, all popping in with a wobble.
How it explains: Stickers slap on in rhythm with what you say: a title pill first, then small mood stickers near you, a handwritten note that writes itself, and a tick-list that fills in. Each one pops with overshoot, settles with a little wobble and peels away before the next set.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/sticker-pop.html` (56.6 KB)
