# Motion graphics style #11: Exploded View

- **ID:** `exploded-view`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Space Grotesk (500 and 700), JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A clean studio teardown in Three.js: an object turns slowly on a light grey floor and floats apart into its layers, each part tagged with a numbered mono label on a thin leader line.

## How It Explains
The closed object turns once, then its parts lift away one at a time with a mechanical click, labels drawing out to a neat column on the right. One part glows while the camera holds on it, then everything snaps back together for the takeaway.

## Demo
What's inside a phone

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Exploded View" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, PARTS (names, sizes, colours, details), the build in init3(), the highlight beat, the labels in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the shadow-only floor, the slow turntable rotation, the lift-apart and snap-back motion in pose(), the right-hand label column with leader lines, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (500 and 700).

THE STYLE
- Build the object in Three.js from real proportions: boxes, cylinders and extrusions for each layer, small boxes for chips and parts, real materials (glass is transparent, metal is metallic). Never copy a real brand or logo; invent nothing that pretends to be a real model.
- The studio: light grey background (#e7eaee), a shadow-only floor, soft key light from the upper right. The object turns slowly the whole time.
- Parts lift straight up (or along their assembly axis) one at a time with an ease-out, leaving even gaps, then later snap back in reverse order.
- Labels: a right-hand column of numbered labels (blue number, dark name in JetBrains Mono) joined to each part by a 2 px leader line that draws itself.
- Type: Space Grotesk 700 headline top left in near-black (#14171f) with the second line in blue (#2f6bff).
- Highlight: one part glows (emissive pulse) with a big chip explaining why it matters.
- Pace: closed object for 1.5 to 2 seconds, one part every 0.4 to 0.6 seconds, hold the highlight 2 to 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 60 px or more, part names at 24 px or more and part numbers at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("What's inside a phone") unless my content asks for it.

SOUND
- Bed: a clean, light pad (padBed) with soft hats.
- Map events to the kit: each part lifting gets a short servo whir (a filtered sawtooth sweep) and a "click" when it stops; labels get a soft tick; the highlight gets a hum swell and a chime; the snap-back gets a reversed whir and a thud; the takeaway gets an open chord.
- Full mix (no voiceover): keep the clean pad, at most about 3 sounds at once, and a short gap before the snap-back.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Exploded View
Family: 3D
Look: A clean studio teardown in Three.js: an object turns slowly on a light grey floor and floats apart into its layers, each part tagged with a numbered mono label on a thin leader line.
How it explains: The closed object turns once, then its parts lift away one at a time with a mechanical click, labels drawing out to a neat column on the right. One part glows while the camera holds on it, then everything snaps back together for the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Exploded View" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each part lifts away as it is named, its label draws on the same word, the highlight glows on the stressed word, and the snap-back lands on the first word of the takeaway.
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
- Replace the demo's story: TL, PARTS (names, sizes, colours, details), the build in init3(), the highlight beat, the labels in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the shadow-only floor, the slow turntable rotation, the lift-apart and snap-back motion in pose(), the right-hand label column with leader lines, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (500 and 700).

THE STYLE
- Build the object in Three.js from real proportions: boxes, cylinders and extrusions for each layer, small boxes for chips and parts, real materials (glass is transparent, metal is metallic). Never copy a real brand or logo; invent nothing that pretends to be a real model.
- The studio: light grey background (#e7eaee), a shadow-only floor, soft key light from the upper right. The object turns slowly the whole time.
- Parts lift straight up (or along their assembly axis) one at a time with an ease-out, leaving even gaps, then later snap back in reverse order.
- Labels: a right-hand column of numbered labels (blue number, dark name in JetBrains Mono) joined to each part by a 2 px leader line that draws itself.
- Type: Space Grotesk 700 headline top left in near-black (#14171f) with the second line in blue (#2f6bff).
- Highlight: one part glows (emissive pulse) with a big chip explaining why it matters.
- Pace: closed object for 1.5 to 2 seconds, one part every 0.4 to 0.6 seconds, hold the highlight 2 to 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 60 px or more, part names at 24 px or more and part numbers at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("What's inside a phone") unless my content asks for it.

SOUND
- Bed: a clean, light pad (padBed) with soft hats.
- Map events to the kit: each part lifting gets a short servo whir (a filtered sawtooth sweep) and a "click" when it stops; labels get a soft tick; the highlight gets a hum swell and a chime; the snap-back gets a reversed whir and a thud; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark servo whirs and ticks soft: true and keep the thud for the snap-back only.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Exploded View
Family: 3D
Look: A clean studio teardown in Three.js: an object turns slowly on a light grey floor and floats apart into its layers, each part tagged with a numbered mono label on a thin leader line.
How it explains: The closed object turns once, then its parts lift away one at a time with a mechanical click, labels drawing out to a neat column on the right. One part glows while the camera holds on it, then everything snaps back together for the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/exploded-view.html` (58.2 KB)
