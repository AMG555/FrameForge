# Motion graphics style #17: Globe Arcs

- **ID:** `globe-arcs`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Space Grotesk (500 and 700), JetBrains Mono (700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A dark navy globe made of glowing cyan dots in Three.js, turning slowly in a starfield, with warm amber route arcs that draw themselves between pins and a soft blue atmosphere glow.

## How It Explains
The globe turns into view, a pin drops at the start, then each route arcs up off the surface and lands on its destination while a small dot travels along it. Labels pop at the ends and a counter adds up the distance before the takeaway.

## Demo
Where your coffee travels

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Globe Arcs" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, the land mask in landAt(), ROUTES (lat/lon pairs and names), the travelling dot, labels, counter, headline and takeaway text and scoreSound(). Keep and reuse the style's helpers (makeGL(), the dotted globe built from landAt(), ll() lat/lon placement, arcs as growing tubes (setDrawRange) on great-circle curves, pins with glow, the atmosphere pass, the starfield, proj3() labels, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (700).

THE STYLE
- The globe is a dark sphere plus thousands of small cyan points placed where land is. For a real-world topic, make landAt(lat, lon) follow real continents (simple polygons or a coarse mask is fine) so routes start and end in the right places.
- Routes are amber (#ffb547) tubes on great-circle arcs that lift off the surface (higher for longer routes) and grow with setDrawRange. Pins are small glowing spheres.
- Space: near-black navy (#040913), a fixed starfield, and a soft blue atmosphere ring painted in 2D behind the labels.
- Type: Space Grotesk 700 headline in white with the second line amber; JetBrains Mono for place chips (amber fill, dark text) and distances.
- Use real places, real distances (say "about") and real times.
- Pace: the globe turns into position in about 1.5 seconds, then one route every 1.5 to 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, place labels at 22 px or more and the counter at 60 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Where your coffee travels") unless my content asks for it.

SOUND
- Bed: an airy, slow pad with a soft low drone.
- Map events to the kit: pins get a soft sonar ping (a sine with long verb); each arc gets a rising airy "whoosh"; the travelling dot gets a faint tick trail; the counter "tick"s when the shown number changes; the takeaway gets "shimmer".
- Full mix (no voiceover): keep the airy pad, at most about 3 sounds at once, sonar pings for pins.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Globe Arcs
Family: 3D
Look: A dark navy globe made of glowing cyan dots in Three.js, turning slowly in a starfield, with warm amber route arcs that draw themselves between pins and a soft blue atmosphere glow.
How it explains: The globe turns into view, a pin drops at the start, then each route arcs up off the surface and lands on its destination while a small dot travels along it. Labels pop at the ends and a counter adds up the distance before the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Globe Arcs" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. A route starts drawing as its start is named and lands on its destination word, its pin glows on the same word, and the counter locks on the last spoken syllable of the distance.
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
- Replace the demo's story: TL, the land mask in landAt(), ROUTES (lat/lon pairs and names), the travelling dot, labels, counter, headline and takeaway text and scoreSound(). Keep and reuse the style's helpers (makeGL(), the dotted globe built from landAt(), ll() lat/lon placement, arcs as growing tubes (setDrawRange) on great-circle curves, pins with glow, the atmosphere pass, the starfield, proj3() labels, chip() and wordLine()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Space Grotesk (500 and 700), JetBrains Mono (700).

THE STYLE
- The globe is a dark sphere plus thousands of small cyan points placed where land is. For a real-world topic, make landAt(lat, lon) follow real continents (simple polygons or a coarse mask is fine) so routes start and end in the right places.
- Routes are amber (#ffb547) tubes on great-circle arcs that lift off the surface (higher for longer routes) and grow with setDrawRange. Pins are small glowing spheres.
- Space: near-black navy (#040913), a fixed starfield, and a soft blue atmosphere ring painted in 2D behind the labels.
- Type: Space Grotesk 700 headline in white with the second line amber; JetBrains Mono for place chips (amber fill, dark text) and distances.
- Use real places, real distances (say "about") and real times.
- Pace: the globe turns into position in about 1.5 seconds, then one route every 1.5 to 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, place labels at 22 px or more and the counter at 60 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Where your coffee travels") unless my content asks for it.

SOUND
- Bed: an airy, slow pad with a soft low drone.
- Map events to the kit: pins get a soft sonar ping (a sine with long verb); each arc gets a rising airy "whoosh"; the travelling dot gets a faint tick trail; the counter "tick"s when the shown number changes; the takeaway gets "shimmer".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark pings and ticks soft: true and keep whooshes low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Globe Arcs
Family: 3D
Look: A dark navy globe made of glowing cyan dots in Three.js, turning slowly in a starfield, with warm amber route arcs that draw themselves between pins and a soft blue atmosphere glow.
How it explains: The globe turns into view, a pin drops at the start, then each route arcs up off the surface and lands on its destination while a small dot travels along it. Labels pop at the ends and a counter adds up the distance before the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/globe-arcs.html` (60.2 KB)
