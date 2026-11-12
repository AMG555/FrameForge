# Motion graphics style #08: Clay Diorama

- **ID:** `clay-diorama`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Fredoka (500 to 700), JetBrains Mono (700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A soft clay miniature world on a round base, built in Three.js: chunky rounded shapes, warm studio light, a slow orbiting camera and a tilt-shift blur, with cream Fredoka cards explaining each beat.

## How It Explains
The diorama pops up piece by piece, then the camera orbits while the idea plays out on the little world (pressure builds, the volcano wobbles, lava bursts out and blobs splat across the grass). Each beat gets one rounded card with a big word, a gauge or a counter, and the camera pulls back for the takeaway.

## Demo
How a volcano erupts

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Clay Diorama" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, BLOBS, the clay world in init3() (the base, the props and their colours), pose(t), the cards in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), M3/P3/put, proj3(), the round base and grass disc, the orbiting camera in pose(), tiltShift(), card(), pop/slam/wordLine/chip and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (500 to 700), JetBrains Mono (700).

THE STYLE
- Everything 3D is real Three.js geometry built once in init3() and posed from t in pose(t): no images, no models from the web. Every object is a simple rounded primitive (cylinders, cones, spheres, capsules) in matte clay colours with soft shadows.
- The world sits on one round base with a grass or sand disc, like a tabletop miniature. Keep it in the middle third of the frame and keep the tilt-shift blur at the top and bottom on every frame.
- Palette: warm peach background (#f5d5c0), clay browns, soft greens (#94c56a, #5aa65a), cream cards (#fffaf5), dark brown text (#5b3424) and one hot accent (#e2561e) for the key word. Invent colours for new props in the same matte, slightly desaturated range.
- Type: Fredoka 600 to 700 on cream cards with 44 px corners and a soft brown shadow. One card per beat, popping in with a back ease. JetBrains Mono only for small chips and units.
- Motion is toy-like: things pop up with overshoot, wobble with squash and stretch before a big moment, fly on real ballistic arcs and splat flat when they land. The camera orbits slowly the whole time and pulls back for the takeaway.
- Numbers count up inside a chip or a gauge bar on a card. Draw every subject accurately for the topic (a real heart has four chambers, a real bridge has supports) while keeping the clay simplicity.
- Pace: the hook card lands in under 1 second, one new thing every 0.5 to 1.5 seconds, the takeaway card holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep card headlines at 54 px or more, card text at 30 px or more, mono labels at 22 px or more, and keep the diorama filling the middle third of the frame. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How a volcano erupts") unless my content asks for it.

SOUND
- Bed: a bright, simple pad (padBed) with light hats, and a soft kick only during the action.
- Map events to the kit: props popping up get SND.bloop with rising pitch; cards get SND.paper plus "pop"; building tension gets a brown-noise rumble that grows; the big moment gets "riser" into "boom" and "slam"; landings get SND.thud; counters "tick" only when the shown number changes; the takeaway gets an open major chord (SND.chord).
- Full mix (no voiceover): keep the bright pad, at most about 3 sounds at once, and leave a short gap before the biggest moment.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Clay Diorama
Family: 3D
Look: A soft clay miniature world on a round base, built in Three.js: chunky rounded shapes, warm studio light, a slow orbiting camera and a tilt-shift blur, with cream Fredoka cards explaining each beat.
How it explains: The diorama pops up piece by piece, then the camera orbits while the idea plays out on the little world (pressure builds, the volcano wobbles, lava bursts out and blobs splat across the grass). Each beat gets one rounded card with a big word, a gauge or a counter, and the camera pulls back for the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Clay Diorama" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each prop pops in as it is named, a card lands on the first word of its beat, a counter starts as its number is spoken and locks on its last syllable, and the big event (the eruption, the crash, the reveal) lands on its stressed word.
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
- Replace the demo's story: TL, BLOBS, the clay world in init3() (the base, the props and their colours), pose(t), the cards in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), M3/P3/put, proj3(), the round base and grass disc, the orbiting camera in pose(), tiltShift(), card(), pop/slam/wordLine/chip and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (500 to 700), JetBrains Mono (700).

THE STYLE
- Everything 3D is real Three.js geometry built once in init3() and posed from t in pose(t): no images, no models from the web. Every object is a simple rounded primitive (cylinders, cones, spheres, capsules) in matte clay colours with soft shadows.
- The world sits on one round base with a grass or sand disc, like a tabletop miniature. Keep it in the middle third of the frame and keep the tilt-shift blur at the top and bottom on every frame.
- Palette: warm peach background (#f5d5c0), clay browns, soft greens (#94c56a, #5aa65a), cream cards (#fffaf5), dark brown text (#5b3424) and one hot accent (#e2561e) for the key word. Invent colours for new props in the same matte, slightly desaturated range.
- Type: Fredoka 600 to 700 on cream cards with 44 px corners and a soft brown shadow. One card per beat, popping in with a back ease. JetBrains Mono only for small chips and units.
- Motion is toy-like: things pop up with overshoot, wobble with squash and stretch before a big moment, fly on real ballistic arcs and splat flat when they land. The camera orbits slowly the whole time and pulls back for the takeaway.
- Numbers count up inside a chip or a gauge bar on a card. Draw every subject accurately for the topic (a real heart has four chambers, a real bridge has supports) while keeping the clay simplicity.
- Pace: the hook card lands in under 1 second, one new thing every 0.5 to 1.5 seconds, the takeaway card holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep card headlines at 54 px or more, card text at 30 px or more, mono labels at 22 px or more, and keep the diorama filling the middle third of the frame. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How a volcano erupts") unless my content asks for it.

SOUND
- Bed: a bright, simple pad (padBed) with light hats, and a soft kick only during the action.
- Map events to the kit: props popping up get SND.bloop with rising pitch; cards get SND.paper plus "pop"; building tension gets a brown-noise rumble that grows; the big moment gets "riser" into "boom" and "slam"; landings get SND.thud; counters "tick" only when the shown number changes; the takeaway gets an open major chord (SND.chord).
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the pad low and plays anything marked soft at about 55%. Mark bloops, ticks and thuds soft: true, keep the boom for the single biggest moment, and never put a riser over a spoken sentence.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Clay Diorama
Family: 3D
Look: A soft clay miniature world on a round base, built in Three.js: chunky rounded shapes, warm studio light, a slow orbiting camera and a tilt-shift blur, with cream Fredoka cards explaining each beat.
How it explains: The diorama pops up piece by piece, then the camera orbits while the idea plays out on the little world (pressure builds, the volcano wobbles, lava bursts out and blobs splat across the grass). Each beat gets one rounded card with a big word, a gauge or a counter, and the camera pulls back for the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/clay-diorama.html` (64.9 KB)
