# Motion graphics style #46: Breaking Desk

- **ID:** `breaking-desk`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (700 to 900), JetBrains Mono (600)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
An invented news-desk package over your footage: a LIVE bug with a channel name, a red BREAKING tab, a white headline bar that types itself, a scrolling ticker, a map inset with a pulsing dot, and a clock.

## How It Explains
The LIVE bug and clock pop in, the BREAKING tab slides in, the headline types out with a flash, the ticker scrolls under it, and a map inset shows where it happened. A second headline swaps in with a wipe for the follow-up, and a "MORE AT 6" style card closes.

## Demo
Weekly AI news recap

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Breaking Desk" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, the channel name (invented), HEADLINES, TICKER items, the map inset dot position, the closing card and scoreSound(); load your own footage with Load footage. Keep and reuse the style's helpers (footage() under everything, the LIVE bug and clock, the BREAKING tab, the typing headline bar with a flash, the ticker, the map inset with a pulsing dot, the headline swap wipe and the colour rules).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 to 900), JetBrains Mono (600).

THE STYLE
- Built for your footage: everything sits on top of footage(), which shows your clip when it is loaded and a stand-in presenter until then. Keep the presenter's face clear of graphics.
- Always an invented channel name and look; never imitate a real network's logo, colours or layout, and never present opinions as reported fact.
- Red (#e11d2e) for LIVE and BREAKING only; white bars with near-black text (#0b1220) for headlines; a dark ticker bar with white mono text.
- Headline bars type themselves at about 30 characters a second and flash white once complete.
- The map inset is a dark rounded card with simple continent blobs and a pulsing red dot.
- Pace: bug and tab in the first second, one headline every 4 to 5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 40 px or more, the ticker at 22 px or more and the bug at 24 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Weekly AI news recap") unless my content asks for it.

SOUND
- Bed: a tense news bed (a low pulsing synth with soft hats).
- Map events to the kit: open with a sting (a short brass-like sawtooth chord plus a timpani boom); the tab gets "whoosh"; typing gets soft ticks; the headline flash gets "click"; swaps get "whoosh" and "glitch" at low gain; the close gets a short sting.
- Full mix (no voiceover): a news sting (a brass-like chord with a timpani hit) at the start, a tension bed, a whoosh for each swap and soft ticks for typing.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Breaking Desk
Family: Shorts Format
Look: An invented news-desk package over your footage: a LIVE bug with a channel name, a red BREAKING tab, a white headline bar that types itself, a scrolling ticker, a map inset with a pulsing dot, and a clock.
How it explains: The LIVE bug and clock pop in, the BREAKING tab slides in, the headline types out with a flash, the ticker scrolls under it, and a map inset shows where it happened. A second headline swaps in with a wipe for the follow-up, and a "MORE AT 6" style card closes.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Breaking Desk" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The BREAKING tab lands on the first word, the headline types while it is read, the map dot pulses on the place name, and the second headline swaps on "and" or "also".
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
- Replace the demo's story: TL, the channel name (invented), HEADLINES, TICKER items, the map inset dot position, the closing card and scoreSound(); load your own footage with Load footage. Keep and reuse the style's helpers (footage() under everything, the LIVE bug and clock, the BREAKING tab, the typing headline bar with a flash, the ticker, the map inset with a pulsing dot, the headline swap wipe and the colour rules).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 to 900), JetBrains Mono (600).

THE STYLE
- Built for your footage: everything sits on top of footage(), which shows your clip when it is loaded and a stand-in presenter until then. Keep the presenter's face clear of graphics.
- Always an invented channel name and look; never imitate a real network's logo, colours or layout, and never present opinions as reported fact.
- Red (#e11d2e) for LIVE and BREAKING only; white bars with near-black text (#0b1220) for headlines; a dark ticker bar with white mono text.
- Headline bars type themselves at about 30 characters a second and flash white once complete.
- The map inset is a dark rounded card with simple continent blobs and a pulsing red dot.
- Pace: bug and tab in the first second, one headline every 4 to 5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 40 px or more, the ticker at 22 px or more and the bug at 24 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Weekly AI news recap") unless my content asks for it.

SOUND
- Bed: a tense news bed (a low pulsing synth with soft hats).
- Map events to the kit: open with a sting (a short brass-like sawtooth chord plus a timpani boom); the tab gets "whoosh"; typing gets soft ticks; the headline flash gets "click"; swaps get "whoosh" and "glitch" at low gain; the close gets a short sting.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the bed very low and mark ticks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Breaking Desk
Family: Shorts Format
Look: An invented news-desk package over your footage: a LIVE bug with a channel name, a red BREAKING tab, a white headline bar that types itself, a scrolling ticker, a map inset with a pulsing dot, and a clock.
How it explains: The LIVE bug and clock pop in, the BREAKING tab slides in, the headline types out with a flash, the ticker scrolls under it, and a map inset shows where it happened. A second headline swaps in with a wipe for the follow-up, and a "MORE AT 6" style card closes.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/breaking-desk.html` (57.2 KB)
