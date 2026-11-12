# Motion graphics style #13: Size Lineup

- **ID:** `size-lineup`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Things lined up smallest to biggest on an endless pale floor with a grid, built in Three.js, while the camera glides past and pulls back. Each one gets a dimension line and a dark height tag.

## How It Explains
The camera starts close on the smallest thing, then trucks sideways and pulls back as each bigger one enters, so the scale keeps growing. Height lines draw themselves beside each object, and the final pull-back shows the whole lineup with the giant at the end.

## Demo
How big is a blue whale?

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Size Lineup" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, ITEMS (names, real sizes, shapes, colours, positions), the shapes in init3(), the camera keys in CAMK, the tags in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the endless floor with GridHelper and fog, the camera track (track over CAMK), dimension lines drawn from proj3() of base and top, the dark height chips, wordLine() and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, JetBrains Mono (500 and 700).

THE STYLE
- Every object is built from simple Three.js primitives at its real size in metres (1 unit = 1 m) and stands on the same floor. Simplify shapes (capsules, ellipsoids, boxes) but keep proportions true: never scale anything up "for readability".
- Order is always smallest to biggest, left to right, with even gaps. The camera trucks right and pulls back so each new object enters from the right.
- Floor: pale blue-grey (#e8eef4) with a soft grid and fog so it reads as endless. One soft shadow-casting light.
- Tags: a 2 px dimension line with end ticks beside each object (base to top), a dark navy chip (#14263d) with the size, and a small mono name above it.
- Type: Archivo Black headline at the top in navy with the second line in blue (#2f6bd8). JetBrains Mono for every number.
- Use real, typical sizes and say "up to" when you show a maximum.
- Pace: hold the first object about 2 seconds, then one new object every 2 to 2.5 seconds, and hold the full lineup about 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, height tags at 24 px or more and names at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How big is a blue whale?") unless my content asks for it.

SOUND
- Bed: a light, curious pad (padBed) with soft hats.
- Map events to the kit: soft footsteps (SND.tap) while the camera travels; each new tag gets a pluck that climbs in pitch; dimension lines get a short "tick"; the giant gets a long, low swell with a slow pitch bend and a "boom"; the takeaway gets an open chord.
- Full mix (no voiceover): keep the light pad, soft steps while the camera travels, and a short silence before the giant is revealed.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Size Lineup
Family: 3D
Look: Things lined up smallest to biggest on an endless pale floor with a grid, built in Three.js, while the camera glides past and pulls back. Each one gets a dimension line and a dark height tag.
How it explains: The camera starts close on the smallest thing, then trucks sideways and pulls back as each bigger one enters, so the scale keeps growing. Height lines draw themselves beside each object, and the final pull-back shows the whole lineup with the giant at the end.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Size Lineup" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The camera starts moving to the next object about 0.3 s before it is named, its dimension line draws on its name and its tag lands on the number.
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
- Replace the demo's story: TL, ITEMS (names, real sizes, shapes, colours, positions), the shapes in init3(), the camera keys in CAMK, the tags in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the endless floor with GridHelper and fog, the camera track (track over CAMK), dimension lines drawn from proj3() of base and top, the dark height chips, wordLine() and grain()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, JetBrains Mono (500 and 700).

THE STYLE
- Every object is built from simple Three.js primitives at its real size in metres (1 unit = 1 m) and stands on the same floor. Simplify shapes (capsules, ellipsoids, boxes) but keep proportions true: never scale anything up "for readability".
- Order is always smallest to biggest, left to right, with even gaps. The camera trucks right and pulls back so each new object enters from the right.
- Floor: pale blue-grey (#e8eef4) with a soft grid and fog so it reads as endless. One soft shadow-casting light.
- Tags: a 2 px dimension line with end ticks beside each object (base to top), a dark navy chip (#14263d) with the size, and a small mono name above it.
- Type: Archivo Black headline at the top in navy with the second line in blue (#2f6bd8). JetBrains Mono for every number.
- Use real, typical sizes and say "up to" when you show a maximum.
- Pace: hold the first object about 2 seconds, then one new object every 2 to 2.5 seconds, and hold the full lineup about 3 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, height tags at 24 px or more and names at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How big is a blue whale?") unless my content asks for it.

SOUND
- Bed: a light, curious pad (padBed) with soft hats.
- Map events to the kit: soft footsteps (SND.tap) while the camera travels; each new tag gets a pluck that climbs in pitch; dimension lines get a short "tick"; the giant gets a long, low swell with a slow pitch bend and a "boom"; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark steps and plucks soft: true and keep the low swell for the final reveal.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Size Lineup
Family: 3D
Look: Things lined up smallest to biggest on an endless pale floor with a grid, built in Three.js, while the camera glides past and pulls back. Each one gets a dimension line and a dark height tag.
How it explains: The camera starts close on the smallest thing, then trucks sideways and pulls back as each bigger one enters, so the scale keeps growing. Height lines draw themselves beside each object, and the final pull-back shows the whole lineup with the giant at the end.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/size-lineup.html` (58.7 KB)
