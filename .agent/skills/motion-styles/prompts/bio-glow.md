# Motion graphics style #09: Bio Glow

- **ID:** `bio-glow`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Space Grotesk (500 and 700), JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Inside the body, built in Three.js: glossy red cells drift down a glowing red vessel toward the camera, with fog for depth, a warm bloom, and clean white labels on thin leader lines.

## How It Explains
The camera travels down the vessel the whole time. One hero cell swims up close and gets a label, small blue oxygen bubbles fly in and stick to it, a big glowing counter climbs, and a bumpy white defender cell rolls through before the takeaway.

## Demo
Your blood in 60 seconds

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Bio Glow" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, CELLS, the hero and guest objects in init3() (the red cell, oxygen, the white cell), pose(t), the labels and counters in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the inside-out vessel tube, the travelling camera and flowing cells in pose(), proj3() for labels, leader(), chip(), wordLine(), vignette() and the red bloom).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (500 and 700).

THE STYLE
- Everything is Three.js geometry posed from t: a big inside-out cylinder for the vessel, tori for red cells, a displaced icosahedron for white cells, small emissive spheres for molecules. No images or models.
- The camera always moves forward down the vessel and sways gently; cells flow past at different speeds and fade into the fog behind. Keep the fog and the dark red background so depth reads on a phone.
- Palette: deep blood red background (#3a070b), glossy cell red (#c91d2c), warm salmon accent (#ff8f7d) for the second headline line, cool blue (#7fd3ff) only for oxygen or anything "fresh", off-white for defenders.
- Type: Space Grotesk 700 for headlines at the top, white then salmon. JetBrains Mono for labels in frosted chips with a 1.5 px white outline, joined to their object by a thin leader line that draws itself.
- One hero object per beat comes close to the camera; everything else stays as moving background. Labels always name a real structure with a real size or job.
- Numbers: one big glowing counter at the bottom with a small mono caption under it. Use real, checked figures for the body.
- Pace: the hook lands in under 1 second, the hero arrives by second 3, one new label every 1 to 2 seconds, and the takeaway holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 56 px or more, labels at 22 px or more, and the big counter at 80 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Your blood in 60 seconds") unless my content asks for it.

SOUND
- Bed: a slow heartbeat (two low thumps per beat) under a dark, filtered pad, plus a soft flowing hiss.
- Map events to the kit: labels get a soft tick; molecules sticking get small glassy pings that climb; the hero arrival gets a slow "whoosh"; counters "tick" only when the shown number changes; a new kind of cell gets a low swell; the takeaway gets "shimmer".
- Full mix (no voiceover): keep the heartbeat and the dark pad, at most about 3 sounds at once, and drop the heartbeat for one beat before the counter locks.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Bio Glow
Family: 3D
Look: Inside the body, built in Three.js: glossy red cells drift down a glowing red vessel toward the camera, with fog for depth, a warm bloom, and clean white labels on thin leader lines.
How it explains: The camera travels down the vessel the whole time. One hero cell swims up close and gets a label, small blue oxygen bubbles fly in and stick to it, a big glowing counter climbs, and a bumpy white defender cell rolls through before the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Bio Glow" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The hero object swims into its close-up as it is named, each label draws its leader line on the word it names, small things arrive on the word that introduces them, and the counter locks on the last syllable of its number.
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
- Replace the demo's story: TL, CELLS, the hero and guest objects in init3() (the red cell, oxygen, the white cell), pose(t), the labels and counters in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the inside-out vessel tube, the travelling camera and flowing cells in pose(), proj3() for labels, leader(), chip(), wordLine(), vignette() and the red bloom).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (500 and 700).

THE STYLE
- Everything is Three.js geometry posed from t: a big inside-out cylinder for the vessel, tori for red cells, a displaced icosahedron for white cells, small emissive spheres for molecules. No images or models.
- The camera always moves forward down the vessel and sways gently; cells flow past at different speeds and fade into the fog behind. Keep the fog and the dark red background so depth reads on a phone.
- Palette: deep blood red background (#3a070b), glossy cell red (#c91d2c), warm salmon accent (#ff8f7d) for the second headline line, cool blue (#7fd3ff) only for oxygen or anything "fresh", off-white for defenders.
- Type: Space Grotesk 700 for headlines at the top, white then salmon. JetBrains Mono for labels in frosted chips with a 1.5 px white outline, joined to their object by a thin leader line that draws itself.
- One hero object per beat comes close to the camera; everything else stays as moving background. Labels always name a real structure with a real size or job.
- Numbers: one big glowing counter at the bottom with a small mono caption under it. Use real, checked figures for the body.
- Pace: the hook lands in under 1 second, the hero arrives by second 3, one new label every 1 to 2 seconds, and the takeaway holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 56 px or more, labels at 22 px or more, and the big counter at 80 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Your blood in 60 seconds") unless my content asks for it.

SOUND
- Bed: a slow heartbeat (two low thumps per beat) under a dark, filtered pad, plus a soft flowing hiss.
- Map events to the kit: labels get a soft tick; molecules sticking get small glassy pings that climb; the hero arrival gets a slow "whoosh"; counters "tick" only when the shown number changes; a new kind of cell gets a low swell; the takeaway gets "shimmer".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the heartbeat very low, mark pings and ticks soft: true, and keep the shimmer for the takeaway only.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Bio Glow
Family: 3D
Look: Inside the body, built in Three.js: glossy red cells drift down a glowing red vessel toward the camera, with fog for depth, a warm bloom, and clean white labels on thin leader lines.
How it explains: The camera travels down the vessel the whole time. One hero cell swims up close and gets a label, small blue oxygen bubbles fly in and stick to it, a big glowing counter climbs, and a bumpy white defender cell rolls through before the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/bio-glow.html` (61.2 KB)
