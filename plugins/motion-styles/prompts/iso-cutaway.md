# Motion graphics style #16: Iso Cutaway

- **ID:** `iso-cutaway`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Bricolage Grotesque (600 and 800), JetBrains Mono (700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
An isometric cutaway building in Three.js with an orthographic camera: floors like a doll house, warm wall colours, tiny people, and a sky that goes from night blue to morning warm as a clock chip runs.

## How It Explains
A clock chip ticks through the day while each floor lights up in turn: tiny people move between spots, machines glow, small props appear, and a dark time-stamped label points at the floor that is busy. The takeaway lands once the day is done.

## Demo
A day inside a bakery

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Iso Cutaway" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, FLOORS (wall colours, props, people and their paths), the clock range, the labels, the headline and takeaway and scoreSound(). Keep and reuse the style's helpers (makeGL(), the orthographic iso camera, the floor slab and two back walls per storey, tiny capsule people that walk between waypoints, the night-to-day sky and light ramp, the clock chip, the dark labels on leader lines, wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Bricolage Grotesque (600 and 800), JetBrains Mono (700).

THE STYLE
- One building, seen in true isometric with an OrthographicCamera, built from boxes: a slab per floor, two back walls per floor in a distinct warm colour, props from boxes, cylinders and spheres, people as tiny capsules with round heads.
- Time is the story: a clock chip at the top runs through the day, the sky colour and light warm from night blue (#1d2a4a) to morning cream (#fde8d2), and each floor gets its moment.
- Only the active floor is fully lit; the others sit slightly darker. People walk between waypoints with an ease and a small bob.
- Labels: dark brown chips (#3b2416) with a mono time and verb, on leader lines from the floor to the right edge.
- Type: Bricolage Grotesque 800 headline in dark brown with the second line in the accent (#d9542b).
- Pace: one floor beat every 2.5 to 3 seconds, clock ticks every half hour of story time.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, labels at 22 px or more and the clock at 40 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A day inside a bakery") unless my content asks for it.

SOUND
- Bed: a cosy, warm pad (padBed) and a steady soft clock tick.
- Map events to the kit: each floor lighting up gets a soft "whoosh" and a pluck; machines get a low hum; people stepping get soft taps; the shop opening gets a two-note bell (SND.chime); the takeaway gets an open chord.
- Full mix (no voiceover): keep the cosy pad and the clock ticks, at most about 3 sounds at once.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Iso Cutaway
Family: 3D
Look: An isometric cutaway building in Three.js with an orthographic camera: floors like a doll house, warm wall colours, tiny people, and a sky that goes from night blue to morning warm as a clock chip runs.
How it explains: A clock chip ticks through the day while each floor lights up in turn: tiny people move between spots, machines glow, small props appear, and a dark time-stamped label points at the floor that is busy. The takeaway lands once the day is done.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Iso Cutaway" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The clock jumps to each time as it is said, the floor it names lights up on the same word, and its label lands on the time.
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
- Replace the demo's story: TL, FLOORS (wall colours, props, people and their paths), the clock range, the labels, the headline and takeaway and scoreSound(). Keep and reuse the style's helpers (makeGL(), the orthographic iso camera, the floor slab and two back walls per storey, tiny capsule people that walk between waypoints, the night-to-day sky and light ramp, the clock chip, the dark labels on leader lines, wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Bricolage Grotesque (600 and 800), JetBrains Mono (700).

THE STYLE
- One building, seen in true isometric with an OrthographicCamera, built from boxes: a slab per floor, two back walls per floor in a distinct warm colour, props from boxes, cylinders and spheres, people as tiny capsules with round heads.
- Time is the story: a clock chip at the top runs through the day, the sky colour and light warm from night blue (#1d2a4a) to morning cream (#fde8d2), and each floor gets its moment.
- Only the active floor is fully lit; the others sit slightly darker. People walk between waypoints with an ease and a small bob.
- Labels: dark brown chips (#3b2416) with a mono time and verb, on leader lines from the floor to the right edge.
- Type: Bricolage Grotesque 800 headline in dark brown with the second line in the accent (#d9542b).
- Pace: one floor beat every 2.5 to 3 seconds, clock ticks every half hour of story time.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, labels at 22 px or more and the clock at 40 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A day inside a bakery") unless my content asks for it.

SOUND
- Bed: a cosy, warm pad (padBed) and a steady soft clock tick.
- Map events to the kit: each floor lighting up gets a soft "whoosh" and a pluck; machines get a low hum; people stepping get soft taps; the shop opening gets a two-note bell (SND.chime); the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the clock ticks soft: true and very low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Iso Cutaway
Family: 3D
Look: An isometric cutaway building in Three.js with an orthographic camera: floors like a doll house, warm wall colours, tiny people, and a sky that goes from night blue to morning warm as a clock chip runs.
How it explains: A clock chip ticks through the day while each floor lights up in turn: tiny people move between spots, machines glow, small props appear, and a dark time-stamped label points at the floor that is busy. The takeaway lands once the day is done.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/iso-cutaway.html` (60.0 KB)
