# Motion graphics style #27: Parchment Map

- **ID:** `parchment-map`
- **Family:** Illustrated
- **Canvas:** `720x1280`
- **Fonts:** Playfair Display (700 and 900, italic), Special Elite
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
An aged ink map on stained parchment: hand-inked coastlines with a second faint outline, a graticule, burnt edges, a compass rose, a little sailing ship and a red dashed route that draws itself as the camera follows it across the map.

## How It Explains
The camera pans across a wide map, following the ship as the red route draws behind it. At each key place a typewriter date stamp drops in, and a counter or final stamp sums up the journey before the takeaway.

## Demo
The first trip around the world, 1519 to 1522

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Parchment Map" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the land outlines in LAND (if the area changes), ROUTE (lon/lat waypoints with arrival times), STAMPS, the title, the counter and takeaway and scoreSound(). Keep and reuse the style's helpers (the pre-rendered parchment map layer (stains, graticule, double-inked coasts), the lon/lat to map projection, the camera that follows the ship, the dashed red route with arrowhead, the ship, the compass rose, the burnt-edge vignette and the Special Elite stamps).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Playfair Display (700 and 900, italic), Special Elite.

THE STYLE
- The map is a pre-rendered parchment layer: warm paper (#efdcb2 to #dfc28a) with brown stains, a faint graticule every 30 degrees, and coastlines inked twice in sepia (#5a3a1c) with a pale fill. Keep geography roughly real for real places.
- Project lon/lat to the map with one scale; route waypoints carry their real coordinates and their arrival time, so the ship always moves at story speed.
- The route is a red (#a3261c) dashed line that grows behind the ship, with an arrowhead at the front. The ship is a small inked hull with two sails that bobs on the waves.
- The camera pans across the map following the ship; the title and stamps stay fixed on screen.
- Type: Playfair Display 900 for the title (second line italic), Special Elite typewriter text for date stamps on cream labels with a red border.
- Burnt edges (a dark brown vignette) and paper grain on top of everything.
- Pace: one stamp every 2 to 3 seconds of travel; hold the final stamp about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 64 px or more, stamps at 26 px or more and the counter at 60 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The first trip around the world, 1519 to 1522") unless my content asks for it.

SOUND
- Bed: a slow, low sea swell (brown noise with a slow filter sweep) and a warm, sparse pad.
- Map events to the kit: the drawing route gets a soft quill scratch (SND.scratch); each stamp gets a stamp thud ("stamp" at low gain) and a soft bell; storms or deaths get a low swell; the takeaway gets an open chord.
- Full mix (no voiceover): keep the slow sea swell, the quill scratch while the route draws, a creak or bell at each stamp, and a warm chord at the end.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Parchment Map
Family: Illustrated
Look: An aged ink map on stained parchment: hand-inked coastlines with a second faint outline, a graticule, burnt edges, a compass rose, a little sailing ship and a red dashed route that draws itself as the camera follows it across the map.
How it explains: The camera pans across a wide map, following the ship as the red route draws behind it. At each key place a typewriter date stamp drops in, and a counter or final stamp sums up the journey before the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Parchment Map" style (Illustrated) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The ship reaches each place as it is named, the date stamp drops on the date, and the final stamp lands on the last spoken number.
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
- Replace the demo's story: TL, the land outlines in LAND (if the area changes), ROUTE (lon/lat waypoints with arrival times), STAMPS, the title, the counter and takeaway and scoreSound(). Keep and reuse the style's helpers (the pre-rendered parchment map layer (stains, graticule, double-inked coasts), the lon/lat to map projection, the camera that follows the ship, the dashed red route with arrowhead, the ship, the compass rose, the burnt-edge vignette and the Special Elite stamps).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Playfair Display (700 and 900, italic), Special Elite.

THE STYLE
- The map is a pre-rendered parchment layer: warm paper (#efdcb2 to #dfc28a) with brown stains, a faint graticule every 30 degrees, and coastlines inked twice in sepia (#5a3a1c) with a pale fill. Keep geography roughly real for real places.
- Project lon/lat to the map with one scale; route waypoints carry their real coordinates and their arrival time, so the ship always moves at story speed.
- The route is a red (#a3261c) dashed line that grows behind the ship, with an arrowhead at the front. The ship is a small inked hull with two sails that bobs on the waves.
- The camera pans across the map following the ship; the title and stamps stay fixed on screen.
- Type: Playfair Display 900 for the title (second line italic), Special Elite typewriter text for date stamps on cream labels with a red border.
- Burnt edges (a dark brown vignette) and paper grain on top of everything.
- Pace: one stamp every 2 to 3 seconds of travel; hold the final stamp about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 64 px or more, stamps at 26 px or more and the counter at 60 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The first trip around the world, 1519 to 1522") unless my content asks for it.

SOUND
- Bed: a slow, low sea swell (brown noise with a slow filter sweep) and a warm, sparse pad.
- Map events to the kit: the drawing route gets a soft quill scratch (SND.scratch); each stamp gets a stamp thud ("stamp" at low gain) and a soft bell; storms or deaths get a low swell; the takeaway gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the sea swell very low and mark scratches soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Parchment Map
Family: Illustrated
Look: An aged ink map on stained parchment: hand-inked coastlines with a second faint outline, a graticule, burnt edges, a compass rose, a little sailing ship and a red dashed route that draws itself as the camera follows it across the map.
How it explains: The camera pans across a wide map, following the ship as the red route draws behind it. At each key place a typewriter date stamp drops in, and a counter or final stamp sums up the journey before the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/parchment-map.html` (62.5 KB)
