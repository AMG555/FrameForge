# Motion graphics style #20: Synth Grid

- **ID:** `synth-grid`
- **Family:** 3D
- **Canvas:** `720x1280`
- **Fonts:** Anton (skewed, chrome gradient), Permanent Marker, JetBrains Mono (700)
- **Three.js 3D:** Yes
- **Footage Overlay:** No

## Look
A retro neon world: a magenta wireframe landscape scrolling toward you in Three.js under a striped sunset sun, purple sky, chrome-gradient titles with a pink glow and a cyan marker script.

## How It Explains
The grid races toward the camera the whole time. A chrome title slams in, then numbered neon frames slide in one by one for each point, each with a cyan label, before a blinking "press start" style sign-off.

## Demo
The future of gaming: 3 trends

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Synth Grid" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep the Three.js r128 script tag and build every 3D object in code: no models or textures from the web.
- Replace the demo's story: TL, POINTS (the numbered items), the title and sign-off text, the sun colours if needed and scoreSound(). Keep and reuse the style's helpers (makeGL(), the scrolling wireframe terrain (mountains at the sides, flat road in the middle), the striped sun, the sky gradient, chrome() titles, the neon frames, the blinking sign-off, grain() and the scanlines).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton (skewed, chrome gradient), Permanent Marker, JetBrains Mono (700).

THE STYLE
- The ground is one Three.js wireframe plane (magenta #ff3df0) over a solid dark plane, scrolled toward the camera by moving it modulo one grid cell so the loop is seamless. Mountains rise only at the sides; the middle stays a flat road.
- The sky is a 2D gradient (#0b0221 to #3d0b5f to #ff3d81) with a big striped sun (yellow to pink, horizontal cut bands) sitting on the horizon and a soft pink glow.
- Type: Anton skewed 10 degrees with a chrome gradient (white, pale blue, a dark horizon line, lilac) and a pink outer glow; Permanent Marker in cyan (#5ff6ff) with a cyan glow for the second line; JetBrains Mono for numbers.
- Items live in neon frames: dark translucent boxes with a 3 px glowing cyan or pink border, sliding in from the side.
- Scanlines and light grain on top of everything.
- Pace: the title lands within 1 second, one item every 2 seconds, the sign-off blinks for the last 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the chrome title at 80 px or more, item text at 36 px or more and numbers at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The future of gaming: 3 trends") unless my content asks for it.

SOUND
- Music: a synthwave loop (sawtooth bass arpeggio on 16ths, a big gated snare on 2 and 4, a soft kick, a wide saw pad) built with k.voice and k.hiss.
- Map events to the kit: the title gets "slam" and "riser" before it; frames get a laser "zap" (a fast falling square sweep) and a soft "whoosh"; the sign-off gets a chiptune arpeggio.
- Full mix (no voiceover): keep the synthwave beat (bass arpeggio, gated snare, saw pad), at most about 3 effects at once.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Synth Grid
Family: 3D
Look: A retro neon world: a magenta wireframe landscape scrolling toward you in Three.js under a striped sunset sun, purple sky, chrome-gradient titles with a pink glow and a cyan marker script.
How it explains: The grid races toward the camera the whole time. A chrome title slams in, then numbered neon frames slide in one by one for each point, each with a cyan label, before a blinking "press start" style sign-off.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Synth Grid" style (3D) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The title slams on the first stressed word, each neon frame slides in as its point is introduced, and the sign-off blinks on the last word.
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
- Replace the demo's story: TL, POINTS (the numbered items), the title and sign-off text, the sun colours if needed and scoreSound(). Keep and reuse the style's helpers (makeGL(), the scrolling wireframe terrain (mountains at the sides, flat road in the middle), the striped sun, the sky gradient, chrome() titles, the neon frames, the blinking sign-off, grain() and the scanlines).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton (skewed, chrome gradient), Permanent Marker, JetBrains Mono (700).

THE STYLE
- The ground is one Three.js wireframe plane (magenta #ff3df0) over a solid dark plane, scrolled toward the camera by moving it modulo one grid cell so the loop is seamless. Mountains rise only at the sides; the middle stays a flat road.
- The sky is a 2D gradient (#0b0221 to #3d0b5f to #ff3d81) with a big striped sun (yellow to pink, horizontal cut bands) sitting on the horizon and a soft pink glow.
- Type: Anton skewed 10 degrees with a chrome gradient (white, pale blue, a dark horizon line, lilac) and a pink outer glow; Permanent Marker in cyan (#5ff6ff) with a cyan glow for the second line; JetBrains Mono for numbers.
- Items live in neon frames: dark translucent boxes with a 3 px glowing cyan or pink border, sliding in from the side.
- Scanlines and light grain on top of everything.
- Pace: the title lands within 1 second, one item every 2 seconds, the sign-off blinks for the last 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the chrome title at 80 px or more, item text at 36 px or more and numbers at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The future of gaming: 3 trends") unless my content asks for it.

SOUND
- Music: a synthwave loop (sawtooth bass arpeggio on 16ths, a big gated snare on 2 and 4, a soft kick, a wide saw pad) built with k.voice and k.hiss.
- Map events to the kit: the title gets "slam" and "riser" before it; frames get a laser "zap" (a fast falling square sweep) and a soft "whoosh"; the sign-off gets a chiptune arpeggio.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the music low. Mark zaps soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Synth Grid
Family: 3D
Look: A retro neon world: a magenta wireframe landscape scrolling toward you in Three.js under a striped sunset sun, purple sky, chrome-gradient titles with a pink glow and a cyan marker script.
How it explains: The grid races toward the camera the whole time. A chrome title slams in, then numbered neon frames slide in one by one for each point, each with a cyan label, before a blinking "press start" style sign-off.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/synth-grid.html` (58.1 KB)
