# Motion graphics style #14: Data City

- **ID:** `data-city`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Space Grotesk (500 and 700), JetBrains Mono (700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A 3D bar chart that grows like a city skyline at night, built in Three.js: navy towers with lit windows, glowing cyan-to-magenta roofs, a grid floor fading into fog, and values floating above each tower.

## How It Explains
Towers rise one by one with their values counting up while the camera slowly circles the skyline. The tallest gets a light beam and a callout, then the camera rises over the city for the takeaway number.

## Demo
Hours online per day, 2018 to 2024 (example data)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Data City" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, DATA (labels and values), the colour ramp, the highlight index, the headline, callout and takeaway text in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), the grid floor and fog, towers built from DATA with window strips and emissive roofs, the rise-and-count timing, the orbiting camera, the beam, proj3() value labels, the glow pass, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (700).

THE STYLE
- Data first: tower heights are exactly proportional to the values (one scale, baseline at zero). Label every tower on the floor and print its value above it. If the data is illustrative, keep an "EXAMPLE DATA" chip on screen.
- Towers: navy boxes (#1c2a6e) with thin lit window strips on the front and a glowing roof whose colour runs from cyan (#33e1ff) to magenta (#ff4fd8) across the series.
- Night city: deep navy background (#080d22), a blue grid floor, fog so the far edge fades, and a soft screen-blended glow above each roof.
- Camera: a slow orbit around the skyline, then a rise above it for the takeaway. No cuts.
- Type: Space Grotesk 700 headline top left in white with the second line in cyan; JetBrains Mono for values and labels.
- Highlight: a translucent beam rises from the key tower, with a white callout card.
- Pace: one tower every 0.3 to 0.5 seconds, hold the full skyline about 2 seconds, then the highlight and the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 56 px or more, values at 26 px or more and axis labels at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Hours online per day, 2018 to 2024 (example data)") unless my content asks for it.

SOUND
- Bed: a dark synth pad with a pulsing bass on the beat (padBed with kick) and light hats.
- Map events to the kit: each tower rising gets a pluck whose pitch follows its height; values "tick" while counting; the beam gets "riser" and a bright swell; the callout gets "pop"; the takeaway gets "shimmer".
- Full mix (no voiceover): keep the pulsing bass pad, at most about 3 sounds at once, and a short gap before the highlight.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Data City
Family: 3D
Look: A 3D bar chart that grows like a city skyline at night, built in Three.js: navy towers with lit windows, glowing cyan-to-magenta roofs, a grid floor fading into fog, and values floating above each tower.
How it explains: Towers rise one by one with their values counting up while the camera slowly circles the skyline. The tallest gets a light beam and a callout, then the camera rises over the city for the takeaway number.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Data City" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each tower starts rising as its label is said and its value locks on the number; the beam lands on the stressed word of the highlight.
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
- Replace the demo's story: TL, DATA (labels and values), the colour ramp, the highlight index, the headline, callout and takeaway text in overlay() and scoreSound(). Keep and reuse the style's helpers (makeGL(), the grid floor and fog, towers built from DATA with window strips and emissive roofs, the rise-and-count timing, the orbiting camera, the beam, proj3() value labels, the glow pass, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (700).

THE STYLE
- Data first: tower heights are exactly proportional to the values (one scale, baseline at zero). Label every tower on the floor and print its value above it. If the data is illustrative, keep an "EXAMPLE DATA" chip on screen.
- Towers: navy boxes (#1c2a6e) with thin lit window strips on the front and a glowing roof whose colour runs from cyan (#33e1ff) to magenta (#ff4fd8) across the series.
- Night city: deep navy background (#080d22), a blue grid floor, fog so the far edge fades, and a soft screen-blended glow above each roof.
- Camera: a slow orbit around the skyline, then a rise above it for the takeaway. No cuts.
- Type: Space Grotesk 700 headline top left in white with the second line in cyan; JetBrains Mono for values and labels.
- Highlight: a translucent beam rises from the key tower, with a white callout card.
- Pace: one tower every 0.3 to 0.5 seconds, hold the full skyline about 2 seconds, then the highlight and the takeaway.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 56 px or more, values at 26 px or more and axis labels at 20 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Hours online per day, 2018 to 2024 (example data)") unless my content asks for it.

SOUND
- Bed: a dark synth pad with a pulsing bass on the beat (padBed with kick) and light hats.
- Map events to the kit: each tower rising gets a pluck whose pitch follows its height; values "tick" while counting; the beam gets "riser" and a bright swell; the callout gets "pop"; the takeaway gets "shimmer".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark plucks and ticks soft: true and keep the swell for the highlight.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Data City
Family: 3D
Look: A 3D bar chart that grows like a city skyline at night, built in Three.js: navy towers with lit windows, glowing cyan-to-magenta roofs, a grid floor fading into fog, and values floating above each tower.
How it explains: Towers rise one by one with their values counting up while the camera slowly circles the skyline. The tallest gets a light beam and a callout, then the camera rises over the city for the takeaway number.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/data-city.html` (58.4 KB)
