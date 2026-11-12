# Motion graphics style #12: Low-Poly Atlas

- **ID:** `low-poly-atlas`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Playfair Display (700 and 900, italic), JetBrains Mono (500 and 700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
Faceted low-poly terrain in warm sunset light, built in Three.js: flat-shaded hills, sand coasts and blue water, with roads, routes and campaign arrows drawing themselves across the land.

## How It Explains
The camera drifts over the land while a route draws itself from a city, a red campaign arrow marches along it, more routes branch out, and a counter adds up the distance. Serif headlines and mono date chips give it the feel of a history book.

## Demo
Why Rome built roads

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Low-Poly Atlas" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, hgt() (the shape of the land), ROADS (from and to, in order), the city props, the arrow timing, the labels and counter in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the flat-shaded vertex-coloured terrain built from hgt(), the water plane, growing tubes with setDrawRange(), the arrow that follows a curve, the drifting camera, proj3() labels, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Playfair Display (700 and 900, italic), JetBrains Mono (500 and 700).

THE STYLE
- The land is one flat-shaded plane displaced by hgt(x, z) and coloured per face by height (sand, grass, forest, rock, snow). Shape the land for the topic (coasts, a peninsula, a river valley) but keep it stylised, never a traced real map.
- Light: low warm sunset key (#ffcf99) from one side, warm fog, peach sky (#f2b07a). Water is a single slightly transparent blue plane.
- Routes are tubes along Catmull-Rom curves that hug the terrain and grow with setDrawRange. Campaign arrows are red (#c4302b) extrusions that follow a route.
- Type: Playfair Display 900 headline at the top over a warm fade, the second line italic. JetBrains Mono for dates and place chips (dark brown #2a1a10 on cream).
- Use real dates, places and distances, and say "about" for estimates.
- Camera: one slow drift and orbit over the land, no cuts; let the routes do the storytelling.
- Pace: the title holds about 2 seconds, each route takes 1.5 to 2.5 seconds to draw, and the takeaway holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 64 px or more, place names at 22 px or more and the counter at 80 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why Rome built roads") unless my content asks for it.

SOUND
- Bed: low, slow drums (deep thumps with a short noise tail) and a warm pad; horn-like chords (filtered sawtooth) for the title and the end.
- Map events to the kit: a route drawing gets a soft scratching quill (SND.scratch); the marching arrow gets steady soft steps; chips get a soft tick; the counter "tick"s when the shown number changes; the final line gets the horn chord.
- Full mix (no voiceover): keep the low drums and the horn chords, at most about 3 sounds at once, and a short gap before the counter locks.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Low-Poly Atlas
Family: 3D
Look: Faceted low-poly terrain in warm sunset light, built in Three.js: flat-shaded hills, sand coasts and blue water, with roads, routes and campaign arrows drawing themselves across the land.
How it explains: The camera drifts over the land while a route draws itself from a city, a red campaign arrow marches along it, more routes branch out, and a counter adds up the distance. Serif headlines and mono date chips give it the feel of a history book.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Low-Poly Atlas" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. A route starts drawing as it is mentioned and reaches its end on the destination word, the arrow moves while the march is described, a date chip lands on the date, and the counter locks on its last spoken syllable.
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
- Replace the demo's story: TL, hgt() (the shape of the land), ROADS (from and to, in order), the city props, the arrow timing, the labels and counter in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), lights3(), the flat-shaded vertex-coloured terrain built from hgt(), the water plane, growing tubes with setDrawRange(), the arrow that follows a curve, the drifting camera, proj3() labels, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Playfair Display (700 and 900, italic), JetBrains Mono (500 and 700).

THE STYLE
- The land is one flat-shaded plane displaced by hgt(x, z) and coloured per face by height (sand, grass, forest, rock, snow). Shape the land for the topic (coasts, a peninsula, a river valley) but keep it stylised, never a traced real map.
- Light: low warm sunset key (#ffcf99) from one side, warm fog, peach sky (#f2b07a). Water is a single slightly transparent blue plane.
- Routes are tubes along Catmull-Rom curves that hug the terrain and grow with setDrawRange. Campaign arrows are red (#c4302b) extrusions that follow a route.
- Type: Playfair Display 900 headline at the top over a warm fade, the second line italic. JetBrains Mono for dates and place chips (dark brown #2a1a10 on cream).
- Use real dates, places and distances, and say "about" for estimates.
- Camera: one slow drift and orbit over the land, no cuts; let the routes do the storytelling.
- Pace: the title holds about 2 seconds, each route takes 1.5 to 2.5 seconds to draw, and the takeaway holds about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep headlines at 64 px or more, place names at 22 px or more and the counter at 80 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why Rome built roads") unless my content asks for it.

SOUND
- Bed: low, slow drums (deep thumps with a short noise tail) and a warm pad; horn-like chords (filtered sawtooth) for the title and the end.
- Map events to the kit: a route drawing gets a soft scratching quill (SND.scratch); the marching arrow gets steady soft steps; chips get a soft tick; the counter "tick"s when the shown number changes; the final line gets the horn chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the drums low, mark ticks and steps soft: true, and keep the horn for the title and the last line.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Low-Poly Atlas
Family: 3D
Look: Faceted low-poly terrain in warm sunset light, built in Three.js: flat-shaded hills, sand coasts and blue water, with roads, routes and campaign arrows drawing themselves across the land.
How it explains: The camera drifts over the land while a route draws itself from a city, a red campaign arrow marches along it, more routes branch out, and a counter adds up the distance. Serif headlines and mono date chips give it the feel of a history book.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/low-poly-atlas.html` (60.9 KB)
