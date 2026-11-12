# Motion graphics style #57: VHS Camcorder

- **ID:** `vhs-camcorder`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** VT323
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
A home-video camcorder overlay on your footage: a blocky white PLAY or REC readout, a blinking red dot, a battery icon, a date and time stamp, a tracking-noise band that rolls through, chroma bleed, a warm faded grade and scanlines.

## How It Explains
Your clip plays as if recorded on tape: the on-screen display ticks the clock, a tracking band rolls through every few seconds with a little horizontal tear, the colour bleeds red and cyan at the edges, and a rewind moment (REW ◀◀ with streaks) jumps between scenes.

## Demo
A summer nostalgia edit

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "VHS Camcorder" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, the date, the start time, the rewind moments, and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage() under a warm, faded grade, red and cyan chroma offsets, the rolling tracking band with tear, scanlines, the VT323 on-screen display (PLAY / REC / REW, battery, date, running time), and the rewind transition).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: VT323.

THE STYLE
- Built for your footage: footage() under everything, then a warm faded grade (multiply warm, lift blacks), red and cyan offset copies for chroma bleed, and scanlines.
- The on-screen display uses VT323 in white with a soft dark shadow: PLAY ▶ or REC ● top left, SP below, a battery icon top right, the date and a running clock bottom left.
- A tracking band (white noise lines and a horizontal tear) rolls from top to bottom every few seconds; keep it out of faces for long.
- Rewind: REW ◀◀ replaces PLAY, horizontal streaks and a stronger tear, the clock runs backwards, then PLAY returns.
- Use a believable but clearly nostalgic date; never fake a real event's footage.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the display text at 36 px or more and inside a 40 px margin. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A summer nostalgia edit") unless my content asks for it.

SOUND
- Bed: constant tape hiss (high-passed noise) and a quiet motor hum.
- Map events to the kit: REC, PLAY and REW get a mechanical "click"; the rewind gets a fast warbling, pitch-rising noise; the tracking band gets a short crackle burst.
- Full mix (no voiceover): tape hiss, a soft motor hum, a mechanical click when REC or REW starts, and a fast warble for the rewind.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: VHS Camcorder
Family: Edit Overlay
Look: A home-video camcorder overlay on your footage: a blocky white PLAY or REC readout, a blinking red dot, a battery icon, a date and time stamp, a tracking-noise band that rolls through, chroma bleed, a warm faded grade and scanlines.
How it explains: Your clip plays as if recorded on tape: the on-screen display ticks the clock, a tracking band rolls through every few seconds with a little horizontal tear, the colour bleeds red and cyan at the edges, and a rewind moment (REW ◀◀ with streaks) jumps between scenes.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "VHS Camcorder" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Rewinds happen between thoughts; the tracking band rolls in pauses, never across a key word.
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
- Replace the demo's story: TL, the date, the start time, the rewind moments, and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage() under a warm, faded grade, red and cyan chroma offsets, the rolling tracking band with tear, scanlines, the VT323 on-screen display (PLAY / REC / REW, battery, date, running time), and the rewind transition).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: VT323.

THE STYLE
- Built for your footage: footage() under everything, then a warm faded grade (multiply warm, lift blacks), red and cyan offset copies for chroma bleed, and scanlines.
- The on-screen display uses VT323 in white with a soft dark shadow: PLAY ▶ or REC ● top left, SP below, a battery icon top right, the date and a running clock bottom left.
- A tracking band (white noise lines and a horizontal tear) rolls from top to bottom every few seconds; keep it out of faces for long.
- Rewind: REW ◀◀ replaces PLAY, horizontal streaks and a stronger tear, the clock runs backwards, then PLAY returns.
- Use a believable but clearly nostalgic date; never fake a real event's footage.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the display text at 36 px or more and inside a 40 px margin. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A summer nostalgia edit") unless my content asks for it.

SOUND
- Bed: constant tape hiss (high-passed noise) and a quiet motor hum.
- Map events to the kit: REC, PLAY and REW get a mechanical "click"; the rewind gets a fast warbling, pitch-rising noise; the tracking band gets a short crackle burst.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the hiss very low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: VHS Camcorder
Family: Edit Overlay
Look: A home-video camcorder overlay on your footage: a blocky white PLAY or REC readout, a blinking red dot, a battery icon, a date and time stamp, a tracking-noise band that rolls through, chroma bleed, a warm faded grade and scanlines.
How it explains: Your clip plays as if recorded on tape: the on-screen display ticks the clock, a tracking band rolls through every few seconds with a little horizontal tear, the colour bleeds red and cyan at the edges, and a rewind moment (REW ◀◀ with streaks) jumps between scenes.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/vhs-camcorder.html` (55.3 KB)
