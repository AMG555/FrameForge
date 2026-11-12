# Motion graphics style #19: Deep Layers

- **ID:** `deep-layers`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Anton, JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A cross-section block of the ground in Three.js, with a tiny house and trees on top and stacked layers of soil, clay, rock and glowing hot rock below. A white drill line pushes down while the camera dives with it.

## How It Explains
The camera starts at the surface and descends along the cut face as the drill goes down. A depth counter runs, each layer gets a label as the drill reaches it, the bottom glows orange-hot, and the takeaway puts the depth in context.

## Demo
How deep have we dug?

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Deep Layers" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, LAYERS (names, thickness, colours, the real depth each one starts at), the props on top, the depth curve in depthAt(), the labels and the takeaway in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), the stacked cross-section block, the surface props, the drill line and glowing tip, the descending camera, the depth counter, the side tick ruler, the NOT TO SCALE chip, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, JetBrains Mono (500 and 700).

THE STYLE
- The block is a stack of Three.js boxes, one per layer, each a believable material colour (grass green, soil brown, sand, grey rocks, dark granite, glowing orange heat). Thickness is compressed for the frame, so a "NOT TO SCALE" chip stays on screen, but every label shows the real depth.
- A small surface scene (a house, trees) on top tells you where you are. The drill is a thin white cylinder with a glowing yellow tip that grows downward.
- The camera dives down beside the cut face, always a little ahead of the drill tip.
- Labels: dark mono chips on the left with the layer name and its real depth, joined to the face by ticks on a side ruler.
- Type: Anton for the headline (white with a dark outline, second line yellow) and the depth counter, which glows warmer as it goes deeper.
- Pace: one layer every 1.5 to 2 seconds; hold the bottom for about 2 seconds before the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 64 px or more, the depth counter at 80 px or more and layer labels at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How deep have we dug?") unless my content asks for it.

SOUND
- Bed: a drill hum (filtered sawtooth with a slight wobble) over a low rumble that grows with depth.
- Map events to the kit: each new layer gets a short beep (SND.beep) and a soft "tick"; the counter "tick"s when the shown number changes; reaching the hot layer gets a hiss and a low "boom"; the takeaway gets an open chord.
- Full mix (no voiceover): keep the drill hum and the rumble, a beep for each layer, and a hiss of heat at the bottom.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Deep Layers
Family: 3D
Look: A cross-section block of the ground in Three.js, with a tiny house and trees on top and stacked layers of soil, clay, rock and glowing hot rock below. A white drill line pushes down while the camera dives with it.
How it explains: The camera starts at the surface and descends along the cut face as the drill goes down. A depth counter runs, each layer gets a label as the drill reaches it, the bottom glows orange-hot, and the takeaway puts the depth in context.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Deep Layers" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The drill reaches each layer as it is named and its label lands on that word; the counter locks on the last spoken syllable of the final depth.
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
- Replace the demo's story: TL, LAYERS (names, thickness, colours, the real depth each one starts at), the props on top, the depth curve in depthAt(), the labels and the takeaway in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), the stacked cross-section block, the surface props, the drill line and glowing tip, the descending camera, the depth counter, the side tick ruler, the NOT TO SCALE chip, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, JetBrains Mono (500 and 700).

THE STYLE
- The block is a stack of Three.js boxes, one per layer, each a believable material colour (grass green, soil brown, sand, grey rocks, dark granite, glowing orange heat). Thickness is compressed for the frame, so a "NOT TO SCALE" chip stays on screen, but every label shows the real depth.
- A small surface scene (a house, trees) on top tells you where you are. The drill is a thin white cylinder with a glowing yellow tip that grows downward.
- The camera dives down beside the cut face, always a little ahead of the drill tip.
- Labels: dark mono chips on the left with the layer name and its real depth, joined to the face by ticks on a side ruler.
- Type: Anton for the headline (white with a dark outline, second line yellow) and the depth counter, which glows warmer as it goes deeper.
- Pace: one layer every 1.5 to 2 seconds; hold the bottom for about 2 seconds before the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 64 px or more, the depth counter at 80 px or more and layer labels at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How deep have we dug?") unless my content asks for it.

SOUND
- Bed: a drill hum (filtered sawtooth with a slight wobble) over a low rumble that grows with depth.
- Map events to the kit: each new layer gets a short beep (SND.beep) and a soft "tick"; the counter "tick"s when the shown number changes; reaching the hot layer gets a hiss and a low "boom"; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the drill hum very low and mark beeps soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Deep Layers
Family: 3D
Look: A cross-section block of the ground in Three.js, with a tiny house and trees on top and stacked layers of soil, clay, rock and glowing hot rock below. A white drill line pushes down while the camera dives with it.
How it explains: The camera starts at the surface and descends along the cut face as the drill goes down. A depth counter runs, each layer gets a label as the drill reaches it, the bottom glows orange-hot, and the takeaway puts the depth in context.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/deep-layers.html` (59.3 KB)
