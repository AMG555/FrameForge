# Motion graphics style #40: Tier List

- **ID:** `tier-list`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (700 and 800)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A classic tier-list board on dark charcoal: S to D rows with bright rainbow labels, rounded item tiles with simple icons drawn in code, and a stash of unranked tiles at the bottom that fly up one by one.

## How It Explains
Each item leaves the stash, hangs for a moment in the middle with its name so you can react, then arcs into its tier and snaps into place with a squash and a row flash. The last item gets a dramatic pause before it lands, and the outro asks for comments.

## Demo
My fruit tier list

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Tier List" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, TIERS (labels and colours), ITEMS (name, icon painter, chosen tier, time), the headline, the outro text and scoreSound(). Keep and reuse the style's helpers (the tier rows and rainbow labels, tile() with a code-drawn icon, the stash row, the fly-in arc with a mid-air hold and name chip, the snap with squash and row flash, and the dramatic last pick).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 and 800).

THE STYLE
- Board: dark charcoal (#16161c) with five rows (#23232b), each with a coloured label square: S #ff6b6b, A #ffb36b, B #ffe066, C #8ce99a, D #74c0fc, letters in Archivo Black.
- Items are rounded tiles (#2f2f3a) with a simple flat icon drawn in code; never use real logos or product photos.
- Motion: a tile lifts from the stash, scales up in the centre with its name in a chip, holds, then arcs into the next free slot of its row with a squash and a short flash of the row.
- Type: Archivo Black for the headline and tier letters; Inter 800 for names and the outro.
- Pace: about 1.5 to 2 seconds per item; the last item gets a 1 second pause.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep tier letters at 56 px or more, item names at 34 px or more and the headline at 56 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("My fruit tier list") unless my content asks for it.

SOUND
- Bed: a bouncy, simple beat (padBed with kick and hats).
- Map events to the kit: lifts get "whoosh"; the mid-air hold gets a soft rising tone; snaps get "pop" whose pitch is higher for better tiers; the last pick gets a drum roll (fast soft noise hits) and "slam"; the outro gets an open chord.
- Full mix (no voiceover): a bouncy beat, a "whoosh" for each lift, a "pop" for each snap (pitch by tier), and a drum roll before the last pick.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Tier List
Family: Shorts Format
Look: A classic tier-list board on dark charcoal: S to D rows with bright rainbow labels, rounded item tiles with simple icons drawn in code, and a stash of unranked tiles at the bottom that fly up one by one.
How it explains: Each item leaves the stash, hangs for a moment in the middle with its name so you can react, then arcs into its tier and snaps into place with a squash and a row flash. The last item gets a dramatic pause before it lands, and the outro asks for comments.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Tier List" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each tile lifts on its name, hangs while the opinion is given, and snaps into its row on the verdict word.
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
- Replace the demo's story: TL, TIERS (labels and colours), ITEMS (name, icon painter, chosen tier, time), the headline, the outro text and scoreSound(). Keep and reuse the style's helpers (the tier rows and rainbow labels, tile() with a code-drawn icon, the stash row, the fly-in arc with a mid-air hold and name chip, the snap with squash and row flash, and the dramatic last pick).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 and 800).

THE STYLE
- Board: dark charcoal (#16161c) with five rows (#23232b), each with a coloured label square: S #ff6b6b, A #ffb36b, B #ffe066, C #8ce99a, D #74c0fc, letters in Archivo Black.
- Items are rounded tiles (#2f2f3a) with a simple flat icon drawn in code; never use real logos or product photos.
- Motion: a tile lifts from the stash, scales up in the centre with its name in a chip, holds, then arcs into the next free slot of its row with a squash and a short flash of the row.
- Type: Archivo Black for the headline and tier letters; Inter 800 for names and the outro.
- Pace: about 1.5 to 2 seconds per item; the last item gets a 1 second pause.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep tier letters at 56 px or more, item names at 34 px or more and the headline at 56 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("My fruit tier list") unless my content asks for it.

SOUND
- Bed: a bouncy, simple beat (padBed with kick and hats).
- Map events to the kit: lifts get "whoosh"; the mid-air hold gets a soft rising tone; snaps get "pop" whose pitch is higher for better tiers; the last pick gets a drum roll (fast soft noise hits) and "slam"; the outro gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark pops soft: true and keep the drum roll short.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Tier List
Family: Shorts Format
Look: A classic tier-list board on dark charcoal: S to D rows with bright rainbow labels, rounded item tiles with simple icons drawn in code, and a stash of unranked tiles at the bottom that fly up one by one.
How it explains: Each item leaves the stash, hangs for a moment in the middle with its name so you can react, then arcs into its tier and snaps into place with a squash and a row flash. The last item gets a dramatic pause before it lands, and the outro asks for comments.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/tier-list.html` (57.6 KB)
