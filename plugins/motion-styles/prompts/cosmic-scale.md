# Motion graphics style #10: Cosmic Scale

- **ID:** `cosmic-scale`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Space Grotesk (500 and 700), JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Planets and stars at their true relative sizes in a deep starfield, built in Three.js with textures painted in code, and a camera that pulls back in big log-scale moves to reveal the scale.

## How It Explains
It starts close on something familiar, then each beat the camera pulls back by a power of ten so the next, bigger object slides into frame beside it. Every body gets a thin label with its real size, and the final reveal lands with a boom and a big counter.

## Demo
How big is the Sun?

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Cosmic Scale" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, BODIES (names, real radii, positions, painted textures), the CAM keyframes, the labels and counter in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), the painted canvas textures (paintTex), the starfield, the log-scale camera track (camAt), proj3() labels that only show when a body is big enough, the sun glow pass, chip(), wordLine() and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (500 and 700).

THE STYLE
- Sizes are real: every body uses its true radius relative to the others (Earth = 1 unit), lined up side by side. Never fake a ratio; let tiny things be tiny and point them out with a ring and a label.
- Every surface is painted in code on a canvas (paintTex): oceans and continents, gas bands, craters, granulated plasma. No photos or downloaded textures.
- The camera moves on a log scale (camAt keys hold the log of the distance), so each pull-back feels like the same size of jump. Stars stay fixed far away so the motion reads as scale, not travel.
- Palette: black space (#02030a), white stars, warm sun orange (#ffb347 to #ff7a12) with a soft screen-blended glow, cool label blue (#bfe1ff). One warm accent (#ffcf8a) for the second headline line.
- Type: Space Grotesk 700 headlines at the top, JetBrains Mono labels with the real size, a dashed ring around anything smaller than a few pixels.
- Pace: hold the familiar object for 2 to 3 seconds, then one pull-back every 1.5 to 2.5 seconds, and hold the final reveal for about 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 56 px or more, labels at 22 px or more and the counter at 90 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How big is the Sun?") unless my content asks for it.

SOUND
- Bed: a deep, slow drone with a filtered pad; no beat.
- Map events to the kit: every pull-back gets a long, low "whoosh"; each label gets a soft ping; the final reveal gets "riser" into "boom"; the counter "tick"s only when the shown number changes; the takeaway gets "shimmer".
- Full mix (no voiceover): keep the deep drone, at most about 3 sounds at once, and a moment of near-silence before the big reveal.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Cosmic Scale
Family: 3D
Look: Planets and stars at their true relative sizes in a deep starfield, built in Three.js with textures painted in code, and a camera that pulls back in big log-scale moves to reveal the scale.
How it explains: It starts close on something familiar, then each beat the camera pulls back by a power of ten so the next, bigger object slides into frame beside it. Every body gets a thin label with its real size, and the final reveal lands with a boom and a big counter.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Cosmic Scale" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each pull-back starts about 0.3 s before the next object is named, its label lands on its name, and the reveal of the biggest object lands on the stressed word.
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
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, BODIES (names, real radii, positions, painted textures), the CAM keyframes, the labels and counter in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), the painted canvas textures (paintTex), the starfield, the log-scale camera track (camAt), proj3() labels that only show when a body is big enough, the sun glow pass, chip(), wordLine() and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (500 and 700).

THE STYLE
- Sizes are real: every body uses its true radius relative to the others (Earth = 1 unit), lined up side by side. Never fake a ratio; let tiny things be tiny and point them out with a ring and a label.
- Every surface is painted in code on a canvas (paintTex): oceans and continents, gas bands, craters, granulated plasma. No photos or downloaded textures.
- The camera moves on a log scale (camAt keys hold the log of the distance), so each pull-back feels like the same size of jump. Stars stay fixed far away so the motion reads as scale, not travel.
- Palette: black space (#02030a), white stars, warm sun orange (#ffb347 to #ff7a12) with a soft screen-blended glow, cool label blue (#bfe1ff). One warm accent (#ffcf8a) for the second headline line.
- Type: Space Grotesk 700 headlines at the top, JetBrains Mono labels with the real size, a dashed ring around anything smaller than a few pixels.
- Pace: hold the familiar object for 2 to 3 seconds, then one pull-back every 1.5 to 2.5 seconds, and hold the final reveal for about 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 56 px or more, labels at 22 px or more and the counter at 90 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How big is the Sun?") unless my content asks for it.

SOUND
- Bed: a deep, slow drone with a filtered pad; no beat.
- Map events to the kit: every pull-back gets a long, low "whoosh"; each label gets a soft ping; the final reveal gets "riser" into "boom"; the counter "tick"s only when the shown number changes; the takeaway gets "shimmer".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the drone very low, mark label pings soft: true and keep the boom for the single reveal.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Cosmic Scale
Family: 3D
Look: Planets and stars at their true relative sizes in a deep starfield, built in Three.js with textures painted in code, and a camera that pulls back in big log-scale moves to reveal the scale.
How it explains: It starts close on something familiar, then each beat the camera pulls back by a power of ten so the next, bigger object slides into frame beside it. Every body gets a thin label with its real size, and the final reveal lands with a boom and a big counter.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/cosmic-scale.html` (60.8 KB)
