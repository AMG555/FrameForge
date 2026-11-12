# Motion graphics style #22: Paper Craft

- **ID:** `paper-craft`
- **Family:** Illustrated
- **Canvas:** `720x1280`
- **Fonts:** Fredoka (500 to 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Layered cut paper with real drop shadows and a fibre texture: rolling paper hills, a paper sun, flowers and a striped paper bee, all moving at 12 frames a second like stop-motion, with titles on torn white paper strips.

## How It Explains
The scene builds itself layer by layer, then a little character travels through it beat by beat while numbered paper strips slap on to name each step. Everything boils slightly from frame to frame like real paper under a camera, and the takeaway lands on one last strip.

## Demo
How bees make honey

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Paper Craft" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the scene pieces (hills, sky props), the hero character (drawBee) and its PATH, the STEPS strips, the fact chip, the takeaway and scoreSound(). Keep and reuse the style's helpers (the 12 fps stop-motion clock (stop()), the paper boil jitter (boil()), paper() shadows, hill() layers, the fibre texture, tornStrip(), the slide-up build and the Fredoka strips).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (500 to 700).

THE STYLE
- Everything is flat paper drawn in code: solid shapes with a soft drop shadow (offset down, 10 px blur), a faint fibre texture over the frame, no outlines, no gradients except the sky.
- Stop-motion timing: animated positions are sampled on a 12 fps clock (stop(t)), and every layer boils by a pixel or two each step. Never move anything smoothly at 30 fps.
- Palette: sky blue (#b9e2f0), layered greens (#a4d36f to #4b8c3b), sunny yellow (#ffd04d), honey (#f2b33d), pink and white flowers, dark brown text (#3a2a16), honey accent (#e08a00).
- Titles and steps sit on torn white paper strips, slightly rotated, slapped on with a quick overshoot.
- One small hand-made character carries the story (flapping wings, a dotted path behind it).
- Pace: the build takes about 1.5 seconds, then one step every 2 to 2.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep strip titles at 44 px or more, step text at 34 px or more and chips at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How bees make honey") unless my content asks for it.

SOUND
- Music: a gentle marimba melody (k.voice triangle notes with short decay) over a soft pad.
- Map events to the kit: every paper layer or strip landing gets a paper rustle (SND.paper) and a soft tap; the bee gets a buzzing hum (a sawtooth with wobble) while it flies; arriving gets a bloop; the fact chip gets "pop"; the takeaway gets a marimba run.
- Full mix (no voiceover): keep the marimba melody, paper rustles on every slap, and the bee buzz under the motion.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Paper Craft
Family: Illustrated
Look: Layered cut paper with real drop shadows and a fibre texture: rolling paper hills, a paper sun, flowers and a striped paper bee, all moving at 12 frames a second like stop-motion, with titles on torn white paper strips.
How it explains: The scene builds itself layer by layer, then a little character travels through it beat by beat while numbered paper strips slap on to name each step. Everything boils slightly from frame to frame like real paper under a camera, and the takeaway lands on one last strip.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Paper Craft" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each layer or prop lands on the word that names it, the character moves while the action is described, and each step strip slaps on its first word.
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
- Replace the demo's story: TL, the scene pieces (hills, sky props), the hero character (drawBee) and its PATH, the STEPS strips, the fact chip, the takeaway and scoreSound(). Keep and reuse the style's helpers (the 12 fps stop-motion clock (stop()), the paper boil jitter (boil()), paper() shadows, hill() layers, the fibre texture, tornStrip(), the slide-up build and the Fredoka strips).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fredoka (500 to 700).

THE STYLE
- Everything is flat paper drawn in code: solid shapes with a soft drop shadow (offset down, 10 px blur), a faint fibre texture over the frame, no outlines, no gradients except the sky.
- Stop-motion timing: animated positions are sampled on a 12 fps clock (stop(t)), and every layer boils by a pixel or two each step. Never move anything smoothly at 30 fps.
- Palette: sky blue (#b9e2f0), layered greens (#a4d36f to #4b8c3b), sunny yellow (#ffd04d), honey (#f2b33d), pink and white flowers, dark brown text (#3a2a16), honey accent (#e08a00).
- Titles and steps sit on torn white paper strips, slightly rotated, slapped on with a quick overshoot.
- One small hand-made character carries the story (flapping wings, a dotted path behind it).
- Pace: the build takes about 1.5 seconds, then one step every 2 to 2.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep strip titles at 44 px or more, step text at 34 px or more and chips at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How bees make honey") unless my content asks for it.

SOUND
- Music: a gentle marimba melody (k.voice triangle notes with short decay) over a soft pad.
- Map events to the kit: every paper layer or strip landing gets a paper rustle (SND.paper) and a soft tap; the bee gets a buzzing hum (a sawtooth with wobble) while it flies; arriving gets a bloop; the fact chip gets "pop"; the takeaway gets a marimba run.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the buzz low and mark rustles soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Paper Craft
Family: Illustrated
Look: Layered cut paper with real drop shadows and a fibre texture: rolling paper hills, a paper sun, flowers and a striped paper bee, all moving at 12 frames a second like stop-motion, with titles on torn white paper strips.
How it explains: The scene builds itself layer by layer, then a little character travels through it beat by beat while numbered paper strips slap on to name each step. Everything boils slightly from frame to frame like real paper under a camera, and the takeaway lands on one last strip.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/paper-craft.html` (60.7 KB)
