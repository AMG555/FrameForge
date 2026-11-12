# Motion graphics style #62: Neon Line

- **ID:** `neon-line`
- **Family:** Character Story
- **Canvas:** `720x1280`
- **Fonts:** Caveat (700, as neon script), JetBrains Mono (500)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Characters drawn as single continuous glowing neon lines on a deep night-blue wall: one pink, one cyan, with a soft bloom, a flicker when they switch on, neon-script captions, and small glowing props (phones, clocks, a skyline) in the same line style.

## How It Explains
Each character draws itself in one stroke as if a neon tube is lighting up. Props and connections draw between them (a dashed glowing call line, clocks with different times), they move toward each other as a counter falls, and their two lines meet and merge into one shape for the ending.

## Demo
A long-distance love story (original)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Neon Line" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the character paths (FIG_A and FIG_B: one continuous polyline each), their colours, the props (phones, clocks, skyline), the counter, the captions and the merge shape, and scoreSound(). Keep and reuse the style's helpers (the night-blue wall with faint brick lines, the neon renderer (a wide soft glow pass, a bright core and a white centre), the one-stroke draw-on, the switch-on flicker, the dashed call line, the walking motion, the line merge into a heart and the Caveat neon captions).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Caveat (700, as neon script), JetBrains Mono (500).

THE STYLE
- Background: a deep night-blue wall (#070b1a) with faint brick lines and a dark vignette, like a real neon sign mounted on a wall.
- Every figure is one continuous polyline (a single neon tube), drawn on by path length; render it three times: a wide blurred glow in its colour, a bright core, and a thin white centre.
- Only two or three neon colours: pink (#ff4fa3), cyan (#36e1ff) and a warm yellow (#ffd36b) for small details.
- Lines switch on with a short flicker (two or three off-on blinks) and buzz faintly.
- Captions in Caveat as neon script in the same glow treatment; small data (distances, times) in JetBrains Mono.
- Pace: each figure takes 1 to 1.5 seconds to draw; one new prop or beat every 2 seconds; hold the final merged shape about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep captions at 56 px or more and characters at least 30% of the frame height; line cores at 5 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A long-distance love story (original)") unless my content asks for it.

SOUND
- Bed: a slow, warm synth pad (padBed) with a soft pulse.
- Map events to the kit: neon switch-ons get a click and a short buzz (a low square hum with a fast tremolo); the call line gets a soft ring ("ping"); the falling counter gets soft ticks; the merge gets "shimmer" and a gentle chord.
- Full mix (no voiceover): a warm, slow synth pad, a neon buzz and click when each line switches on, a soft ring for the call, and a gentle chord for the merge.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Neon Line
Family: Character Story
Look: Characters drawn as single continuous glowing neon lines on a deep night-blue wall: one pink, one cyan, with a soft bloom, a flicker when they switch on, neon-script captions, and small glowing props (phones, clocks, a skyline) in the same line style.
How it explains: Each character draws itself in one stroke as if a neon tube is lighting up. Props and connections draw between them (a dashed glowing call line, clocks with different times), they move toward each other as a counter falls, and their two lines meet and merge into one shape for the ending.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Neon Line" style (Character Story) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each figure draws on while it is introduced, the call line connects on "call" or "talk", the counter falls while the distance shrinks in the narration, and the merge lands on the last line.
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
- Replace the demo's story: TL, the character paths (FIG_A and FIG_B: one continuous polyline each), their colours, the props (phones, clocks, skyline), the counter, the captions and the merge shape, and scoreSound(). Keep and reuse the style's helpers (the night-blue wall with faint brick lines, the neon renderer (a wide soft glow pass, a bright core and a white centre), the one-stroke draw-on, the switch-on flicker, the dashed call line, the walking motion, the line merge into a heart and the Caveat neon captions).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Caveat (700, as neon script), JetBrains Mono (500).

THE STYLE
- Background: a deep night-blue wall (#070b1a) with faint brick lines and a dark vignette, like a real neon sign mounted on a wall.
- Every figure is one continuous polyline (a single neon tube), drawn on by path length; render it three times: a wide blurred glow in its colour, a bright core, and a thin white centre.
- Only two or three neon colours: pink (#ff4fa3), cyan (#36e1ff) and a warm yellow (#ffd36b) for small details.
- Lines switch on with a short flicker (two or three off-on blinks) and buzz faintly.
- Captions in Caveat as neon script in the same glow treatment; small data (distances, times) in JetBrains Mono.
- Pace: each figure takes 1 to 1.5 seconds to draw; one new prop or beat every 2 seconds; hold the final merged shape about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep captions at 56 px or more and characters at least 30% of the frame height; line cores at 5 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A long-distance love story (original)") unless my content asks for it.

SOUND
- Bed: a slow, warm synth pad (padBed) with a soft pulse.
- Map events to the kit: neon switch-ons get a click and a short buzz (a low square hum with a fast tremolo); the call line gets a soft ring ("ping"); the falling counter gets soft ticks; the merge gets "shimmer" and a gentle chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the buzz very low.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Neon Line
Family: Character Story
Look: Characters drawn as single continuous glowing neon lines on a deep night-blue wall: one pink, one cyan, with a soft bloom, a flicker when they switch on, neon-script captions, and small glowing props (phones, clocks, a skyline) in the same line style.
How it explains: Each character draws itself in one stroke as if a neon tube is lighting up. Props and connections draw between them (a dashed glowing call line, clocks with different times), they move toward each other as a counter falls, and their two lines meet and merge into one shape for the ending.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/neon-line.html` (57.9 KB)
