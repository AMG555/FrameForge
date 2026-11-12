# Motion graphics style #44: Recipe Steps

- **ID:** `recipe-steps`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Inter (700 to 900), JetBrains Mono (700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A top-down cooking Short on a warm wooden table: food and tools drawn in code from above (bowl, pan, plate), ingredient chips that drop in, a dark step card with a big step number, and a timer ring that drains for each step.

## How It Explains
The ingredients drop onto the table first, then each step swaps the scene from above: the whisk spins in the bowl, the egg spreads in the pan, the omelette folds onto the plate. The step card and its timer track progress, and the finished dish gets a steam curl and a serve line.

## Demo
A 3-minute omelette

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Recipe Steps" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, INGREDIENTS (chips and their icons), STEPS (title, seconds, and the scene painter for each), the dish name and scoreSound(). Keep and reuse the style's helpers (the wood table, ingredient chips with drop-in, the top-down scene painters (bowl, pan, plate), the per-step scene swap, the dark step card with step count and a draining timer ring, steam curls and the serve line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (700 to 900), JetBrains Mono (700).

THE STYLE
- Everything is seen from directly above on a warm wood table (#b97a46 with plank lines and grain). Bowls, pans, plates and food are simple flat shapes with soft shadows, drawn in code.
- Ingredient chips are white pills with a small icon, dropping in from above with a bounce, along the top.
- Each step swaps the centre prop with a quick slide, and the food changes state inside it (whisking, spreading, folding).
- The step card is dark (#1d1a17 at 92%) at the bottom: an orange (#ffb347) "STEP n / N" label, the step in Inter 900, and a timer ring that drains with the real time left.
- Real quantities and times; say "about" when it depends on the stove.
- Pace: ingredients in 1.5 seconds, then 3 to 4 seconds per step, the finished dish held about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep step titles at 46 px or more, ingredient chips at 26 px or more and the timer at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A 3-minute omelette") unless my content asks for it.

SOUND
- Bed: a cosy, warm pad with light hats.
- Map events to the kit: ingredient chips get SND.tap; steps get a soft "whoosh"; whisking gets SND.scratch loops; the pan gets a sizzle (high-passed noise); each step end gets a timer ding (SND.chime); the dish gets a bell and an open chord.
- Full mix (no voiceover): a cosy kitchen pad, soft taps for chips, a whisk scratch, a sizzle under the pan step, a timer ding per step and a final bell.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Recipe Steps
Family: Shorts Format
Look: A top-down cooking Short on a warm wooden table: food and tools drawn in code from above (bowl, pan, plate), ingredient chips that drop in, a dark step card with a big step number, and a timer ring that drains for each step.
How it explains: The ingredients drop onto the table first, then each step swaps the scene from above: the whisk spins in the bowl, the egg spreads in the pan, the omelette folds onto the plate. The step card and its timer track progress, and the finished dish gets a steam curl and a serve line.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Recipe Steps" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each ingredient drops as it is named, each step card and scene arrive on the first word of the step, the timer runs while the step is described, and the finished dish lands on "serve".
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
- Replace the demo's story: TL, INGREDIENTS (chips and their icons), STEPS (title, seconds, and the scene painter for each), the dish name and scoreSound(). Keep and reuse the style's helpers (the wood table, ingredient chips with drop-in, the top-down scene painters (bowl, pan, plate), the per-step scene swap, the dark step card with step count and a draining timer ring, steam curls and the serve line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (700 to 900), JetBrains Mono (700).

THE STYLE
- Everything is seen from directly above on a warm wood table (#b97a46 with plank lines and grain). Bowls, pans, plates and food are simple flat shapes with soft shadows, drawn in code.
- Ingredient chips are white pills with a small icon, dropping in from above with a bounce, along the top.
- Each step swaps the centre prop with a quick slide, and the food changes state inside it (whisking, spreading, folding).
- The step card is dark (#1d1a17 at 92%) at the bottom: an orange (#ffb347) "STEP n / N" label, the step in Inter 900, and a timer ring that drains with the real time left.
- Real quantities and times; say "about" when it depends on the stove.
- Pace: ingredients in 1.5 seconds, then 3 to 4 seconds per step, the finished dish held about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep step titles at 46 px or more, ingredient chips at 26 px or more and the timer at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A 3-minute omelette") unless my content asks for it.

SOUND
- Bed: a cosy, warm pad with light hats.
- Map events to the kit: ingredient chips get SND.tap; steps get a soft "whoosh"; whisking gets SND.scratch loops; the pan gets a sizzle (high-passed noise); each step end gets a timer ding (SND.chime); the dish gets a bell and an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the sizzle very low and mark taps soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Recipe Steps
Family: Shorts Format
Look: A top-down cooking Short on a warm wooden table: food and tools drawn in code from above (bowl, pan, plate), ingredient chips that drop in, a dark step card with a big step number, and a timer ring that drains for each step.
How it explains: The ingredients drop onto the table first, then each step swaps the scene from above: the whisk spins in the bowl, the egg spreads in the pan, the omelette folds onto the plate. The step card and its timer track progress, and the finished dish gets a steam curl and a serve line.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/recipe-steps.html` (60.1 KB)
