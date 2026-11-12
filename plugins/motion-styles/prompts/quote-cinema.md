# Motion graphics style #45: Quote Cinema

- **ID:** `quote-cinema`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Instrument Serif (regular and italic), Inter (600)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A quiet cinematic quote card: deep warm black, a slow drifting light leak, heavy film grain and a slow push-in, with a quote that sets word by word in a large serif, one key word in warm italic, and a tracked author line.

## How It Explains
The frame breathes: the light leak drifts across, the camera pushes in slowly, and the quote fades up one word at a time in rhythm with the reading. The key word turns warm italic, the author line slides in, and a soft "save this" note closes it.

## Demo
"The best time to plant a tree was 20 years ago."

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Quote Cinema" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: QUOTE (the words, which word is the key word, the line breaks), the author line, the closing note, TL timing and scoreSound(). Keep and reuse the style's helpers (the warm black gradient, the drifting light leak, grain and vignette, the slow push-in, the word-by-word fade with a soft rise, the warm italic key word, the faint big quote mark and the tracked author line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (regular and italic), Inter (600).

THE STYLE
- Background: warm near-black (#0d0b0a to #1f1410) with one soft orange light leak (#ff9a3c, screen-blended) that drifts slowly, plus heavy grain and a vignette.
- The whole frame pushes in about 6% over the clip; nothing else moves fast.
- The quote is set in Instrument Serif at a large size, left aligned, one phrase per line; each word fades up with a 14 px rise in reading rhythm.
- One key word in warm italic (#ffb36b). A short warm rule and the author in Inter 600 caps with wide tracking.
- Only quote people accurately with the real author; use "proverb" or "attributed to" when the source is uncertain.
- Pace: about 0.3 seconds per word, hold the full quote at least 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the quote at 64 px or more and the author line at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story (""The best time to plant a tree was 20 years ago."") unless my content asks for it.

SOUND
- Music: a slow, warm pad of soft sine and triangle chords with long reverb, like a felt piano (SND.chord and k.voice).
- Map events to the kit: each new line gets a very soft pluck; the key word gets a gentle swell; the author line gets one low note; the closing note gets "shimmer" at low gain.
- Full mix (no voiceover): a slow, warm piano-like pad with long reverb, a soft swell on the key word, and a low note under the author line.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Quote Cinema
Family: Shorts Format
Look: A quiet cinematic quote card: deep warm black, a slow drifting light leak, heavy film grain and a slow push-in, with a quote that sets word by word in a large serif, one key word in warm italic, and a tracked author line.
How it explains: The frame breathes: the light leak drifts across, the camera pushes in slowly, and the quote fades up one word at a time in rhythm with the reading. The key word turns warm italic, the author line slides in, and a soft "save this" note closes it.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Quote Cinema" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each word fades up as it is spoken, the key word turns warm on its stress, and the author line lands after the quote ends.
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
- Replace the demo's story: QUOTE (the words, which word is the key word, the line breaks), the author line, the closing note, TL timing and scoreSound(). Keep and reuse the style's helpers (the warm black gradient, the drifting light leak, grain and vignette, the slow push-in, the word-by-word fade with a soft rise, the warm italic key word, the faint big quote mark and the tracked author line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif (regular and italic), Inter (600).

THE STYLE
- Background: warm near-black (#0d0b0a to #1f1410) with one soft orange light leak (#ff9a3c, screen-blended) that drifts slowly, plus heavy grain and a vignette.
- The whole frame pushes in about 6% over the clip; nothing else moves fast.
- The quote is set in Instrument Serif at a large size, left aligned, one phrase per line; each word fades up with a 14 px rise in reading rhythm.
- One key word in warm italic (#ffb36b). A short warm rule and the author in Inter 600 caps with wide tracking.
- Only quote people accurately with the real author; use "proverb" or "attributed to" when the source is uncertain.
- Pace: about 0.3 seconds per word, hold the full quote at least 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the quote at 64 px or more and the author line at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story (""The best time to plant a tree was 20 years ago."") unless my content asks for it.

SOUND
- Music: a slow, warm pad of soft sine and triangle chords with long reverb, like a felt piano (SND.chord and k.voice).
- Map events to the kit: each new line gets a very soft pluck; the key word gets a gentle swell; the author line gets one low note; the closing note gets "shimmer" at low gain.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the pad very low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Quote Cinema
Family: Shorts Format
Look: A quiet cinematic quote card: deep warm black, a slow drifting light leak, heavy film grain and a slow push-in, with a quote that sets word by word in a large serif, one key word in warm italic, and a tracked author line.
How it explains: The frame breathes: the light leak drifts across, the camera pushes in slowly, and the quote fades up one word at a time in rhythm with the reading. The key word turns warm italic, the author line slides in, and a soft "save this" note closes it.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/quote-cinema.html` (54.2 KB)
