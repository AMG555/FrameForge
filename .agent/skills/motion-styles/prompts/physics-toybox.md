# Motion graphics style #18: Physics Toybox

- **ID:** `physics-toybox`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (700 and 800), JetBrains Mono (700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Bright plastic toys in Three.js on a sunny yellow floor: glossy balls, a white ramp and a curving chain of coloured dominoes that grow in size, with crisp shadows and a slow-motion moment on the key hit.

## How It Explains
A ball rolls down the ramp and starts a chain reaction you can follow beat by beat. Time slows to a quarter when the important thing happens (a chip says so), then snaps back to full speed for the big finish and the takeaway.

## Demo
What if you tip a chain of growing dominoes?

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Physics Toybox" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, the chain (count, sizes, path, colours), the slow-motion window in simT(), the props, the facts in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3() with shadows, the floor, the deterministic fall model (each piece starts when the previous one hits it), the simT() time remap for slow motion, motion streaks, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 and 800), JetBrains Mono (700).

THE STYLE
- Every object is a simple, glossy Three.js primitive in toy colours (#ff5a5f, #2ec4b6, #3a86ff, #ff9f1c, #8f5bff) on a warm yellow floor (#ffe39b) with sharp soft shadows.
- Motion must be physically believable but deterministic: compute fall angles, rolls and bounces from t with simple formulas (no physics engine), each piece starting when the previous one reaches it.
- Slow motion: remap time with simT(t) for one key window (0.25×) and show a dark "0.25× SLOW-MO" chip while it runs.
- Type: Archivo Black headline in near-black with the second line red; one white fact chip at the bottom in Inter 700.
- Use real physics facts (with the source idea in plain words).
- Pace: the setup holds under 2 seconds, the chain runs, slow motion lasts 2 to 3 seconds, the takeaway holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 56 px or more, the fact chip at 28 px or more and the slow-mo tag at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("What if you tip a chain of growing dominoes?") unless my content asks for it.

SOUND
- Bed: a playful, light pad with soft hats.
- Map events to the kit: a rolling ball gets a soft filtered noise roll; each domino hit gets a "click" plus a wooden tap whose pitch drops as the pieces get bigger; slow motion gets a pitched-down "whoosh"; the last big hit gets SND.thud and "boom"; the takeaway gets an open chord.
- Full mix (no voiceover): keep the playful pad, every hit audible, and a short gap before the last, biggest hit.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Physics Toybox
Family: 3D
Look: Bright plastic toys in Three.js on a sunny yellow floor: glossy balls, a white ramp and a curving chain of coloured dominoes that grow in size, with crisp shadows and a slow-motion moment on the key hit.
How it explains: A ball rolls down the ramp and starts a chain reaction you can follow beat by beat. Time slows to a quarter when the important thing happens (a chip says so), then snaps back to full speed for the big finish and the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Physics Toybox" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The first hit lands on the word that starts the chain, slow motion begins on the word that sets up the key moment, and the last piece lands on the stressed word of the punchline.
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
- Replace the demo's story: TL, the chain (count, sizes, path, colours), the slow-motion window in simT(), the props, the facts in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3() with shadows, the floor, the deterministic fall model (each piece starts when the previous one hits it), the simT() time remap for slow motion, motion streaks, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 and 800), JetBrains Mono (700).

THE STYLE
- Every object is a simple, glossy Three.js primitive in toy colours (#ff5a5f, #2ec4b6, #3a86ff, #ff9f1c, #8f5bff) on a warm yellow floor (#ffe39b) with sharp soft shadows.
- Motion must be physically believable but deterministic: compute fall angles, rolls and bounces from t with simple formulas (no physics engine), each piece starting when the previous one reaches it.
- Slow motion: remap time with simT(t) for one key window (0.25×) and show a dark "0.25× SLOW-MO" chip while it runs.
- Type: Archivo Black headline in near-black with the second line red; one white fact chip at the bottom in Inter 700.
- Use real physics facts (with the source idea in plain words).
- Pace: the setup holds under 2 seconds, the chain runs, slow motion lasts 2 to 3 seconds, the takeaway holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 56 px or more, the fact chip at 28 px or more and the slow-mo tag at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("What if you tip a chain of growing dominoes?") unless my content asks for it.

SOUND
- Bed: a playful, light pad with soft hats.
- Map events to the kit: a rolling ball gets a soft filtered noise roll; each domino hit gets a "click" plus a wooden tap whose pitch drops as the pieces get bigger; slow motion gets a pitched-down "whoosh"; the last big hit gets SND.thud and "boom"; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark clacks soft: true and keep the final thud full.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Physics Toybox
Family: 3D
Look: Bright plastic toys in Three.js on a sunny yellow floor: glossy balls, a white ramp and a curving chain of coloured dominoes that grow in size, with crisp shadows and a slow-motion moment on the key hit.
How it explains: A ball rolls down the ramp and starts a chain reaction you can follow beat by beat. Time slows to a quarter when the important thing happens (a chip says so), then snaps back to full speed for the big finish and the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/physics-toybox.html` (58.6 KB)
