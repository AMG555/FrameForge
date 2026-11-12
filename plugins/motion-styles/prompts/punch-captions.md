# Motion graphics style #48: Punch Captions

- **ID:** `punch-captions`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Anton, Inter (800)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
High-retention captions over your talking-head clip: one to three words at a time in huge white Anton with a thick black outline, the key word swapped to yellow and tilted, little sticker pops (bolts, sparks, arrows) drawn in code, and punch-in zooms on the hits.

## How It Explains
Captions follow the speech in tiny chunks, each word slamming in with a scale and blur; the stressed word turns yellow and bigger with a punch zoom on the footage, and a small code-drawn sticker pops beside it. A handle sits quietly at the bottom.

## Demo
A talking-head hook: "This one habit changed everything"

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Punch Captions" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL and CAPS (chunks of words with their times, which word is the key word, which sticker pops), PUNCHES (zoom hits), the handle and scoreSound(); load your clip with Load footage and paste word timings for the captions. Keep and reuse the style's helpers (footage() with punch zooms, the chunked Anton captions with thick outline and slam-in, the yellow tilted key word, the sticker painters (bolt, spark, arrow, star), the safe-zone layout and the handle chip).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (800).

THE STYLE
- Built for your footage: footage() fills the frame (your clip when loaded, a stand-in until then). Captions sit in the middle band, never over the eyes, and stay inside phone safe zones.
- Captions: Anton, white, all caps, a black outline about 12% of the size, 1 to 3 words per chunk, centred; each word slams in (scale 1.6 to 1, quick blur).
- The key word of each chunk: yellow (#ffe14d), 25% bigger and tilted a few degrees, with a punch zoom (4 to 8%) on the footage at the same moment.
- Stickers are drawn in code (bolt, spark burst, arrow, star) in yellow or white with a black outline; never emoji images or brand stickers.
- Never caption the whole transcript at once: chunks of 1 to 3 words only.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep caption words at 76 px or more, key words at 96 px or more and keep captions inside the middle 60% of the height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A talking-head hook: "This one habit changed everything"") unless my content asks for it.

SOUND
- Bed: none (your audio leads). Effects only.
- Map events to the kit: each chunk gets a soft "pop"; key words get "slam" at low gain with the punch zoom; stickers get "sparkle" or SND.bloop; chunk changes with a cut get a short "whoosh".
- Full mix (no voiceover): soft whooshes and pops so the clip still feels edited; with your own audio, keep only small pops and the punch "slam" at low gain.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Punch Captions
Family: Edit Overlay
Look: High-retention captions over your talking-head clip: one to three words at a time in huge white Anton with a thick black outline, the key word swapped to yellow and tilted, little sticker pops (bolts, sparks, arrows) drawn in code, and punch-in zooms on the hits.
How it explains: Captions follow the speech in tiny chunks, each word slamming in with a scale and blur; the stressed word turns yellow and bigger with a punch zoom on the footage, and a small code-drawn sticker pops beside it. A handle sits quietly at the bottom.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Punch Captions" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Every caption word slams in at the start of its spoken word, within 0.03 s; the key word lands on its stressed syllable with the punch zoom; stickers pop 0.1 s after the key word.
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
- Replace the demo's story: TL and CAPS (chunks of words with their times, which word is the key word, which sticker pops), PUNCHES (zoom hits), the handle and scoreSound(); load your clip with Load footage and paste word timings for the captions. Keep and reuse the style's helpers (footage() with punch zooms, the chunked Anton captions with thick outline and slam-in, the yellow tilted key word, the sticker painters (bolt, spark, arrow, star), the safe-zone layout and the handle chip).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (800).

THE STYLE
- Built for your footage: footage() fills the frame (your clip when loaded, a stand-in until then). Captions sit in the middle band, never over the eyes, and stay inside phone safe zones.
- Captions: Anton, white, all caps, a black outline about 12% of the size, 1 to 3 words per chunk, centred; each word slams in (scale 1.6 to 1, quick blur).
- The key word of each chunk: yellow (#ffe14d), 25% bigger and tilted a few degrees, with a punch zoom (4 to 8%) on the footage at the same moment.
- Stickers are drawn in code (bolt, spark burst, arrow, star) in yellow or white with a black outline; never emoji images or brand stickers.
- Never caption the whole transcript at once: chunks of 1 to 3 words only.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep caption words at 76 px or more, key words at 96 px or more and keep captions inside the middle 60% of the height. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A talking-head hook: "This one habit changed everything"") unless my content asks for it.

SOUND
- Bed: none (your audio leads). Effects only.
- Map events to the kit: each chunk gets a soft "pop"; key words get "slam" at low gain with the punch zoom; stickers get "sparkle" or SND.bloop; chunk changes with a cut get a short "whoosh".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark every caption sound soft: true and keep the slams at half gain.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Punch Captions
Family: Edit Overlay
Look: High-retention captions over your talking-head clip: one to three words at a time in huge white Anton with a thick black outline, the key word swapped to yellow and tilted, little sticker pops (bolts, sparks, arrows) drawn in code, and punch-in zooms on the hits.
How it explains: Captions follow the speech in tiny chunks, each word slamming in with a scale and blur; the stressed word turns yellow and bigger with a punch zoom on the footage, and a small code-drawn sticker pops beside it. A handle sits quietly at the bottom.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/punch-captions.html` (55.4 KB)
