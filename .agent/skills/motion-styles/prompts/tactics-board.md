# Motion graphics style #36: Tactics Board

- **ID:** `tactics-board`
- **Family:** Data
- **Canvas:** `720x1280`
- **Fonts:** Anton, Inter (700 to 900)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A top-down pitch with mown stripes and crisp white lines, red and blue numbered player tokens with soft shadows, dashed run arrows that draw themselves, a yellow ball path with numbered passes, and a running clock chip.

## How It Explains
Players move between real positions as the play unfolds: each run arrow draws just before the run, the ball travels pass by pass with a numbered marker, defenders shift, and the clock counts the seconds. The finish gets a flash and a big word, then the takeaway.

## Demo
How a counter-attack works

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Tactics Board" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the sport (pitch markings in pitch()), PLAYERS (keyframed positions), PASSES (from, to, times), RUNS (arrows), the clock range, the finish word, the takeaway and scoreSound(). Keep and reuse the style's helpers (the striped pitch and line markings, token() players with numbers and shadows, keyframed movement (track), drawing run arrows, the ball travelling pass to pass with numbered markers, the clock chip, the dark title band and the finish flash).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (700 to 900).

THE STYLE
- The pitch is drawn to the sport's real proportions (stripes in two greens, white lines at 2 px), seen straight from above and filling the frame below the title band.
- Players are round tokens (red and blue, white outline, white number, soft shadow). Their positions come from keyframes (track) so movement is smooth and believable.
- Runs are white dashed curves with arrowheads that draw just before the player moves; the ball is a white dot that travels along each pass, leaving a solid yellow (#ffd23f) line with a numbered marker.
- A clock chip counts the real time of the move; the finish gets a white flash and one big Anton word.
- Use a real, typical pattern of play; label anything specific to one real match with its real details.
- Pace: the setup holds about 1.5 seconds, then one pass every 1 to 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, player numbers at 18 px or more and the clock at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How a counter-attack works") unless my content asks for it.

SOUND
- Bed: a low crowd murmur (pink noise, band-passed) that swells as the attack builds.
- Map events to the kit: a whistle (two high sine tones with vibrato) starts the move; each pass gets a ball kick (a short low thump with a noise click); run arrows get a soft "whoosh"; the finish gets a roar (wide noise swell) and "boom".
- Full mix (no voiceover): keep a low crowd bed that swells as the attack builds, a whistle at the start, a kick for every pass and a roar on the finish.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Tactics Board
Family: Data
Look: A top-down pitch with mown stripes and crisp white lines, red and blue numbered player tokens with soft shadows, dashed run arrows that draw themselves, a yellow ball path with numbered passes, and a running clock chip.
How it explains: Players move between real positions as the play unfolds: each run arrow draws just before the run, the ball travels pass by pass with a numbered marker, defenders shift, and the clock counts the seconds. The finish gets a flash and a big word, then the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Tactics Board" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each run arrow draws as the run is described, each pass starts on the word that names it, and the finish lands on the stressed word.
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
- Replace the demo's story: TL, the sport (pitch markings in pitch()), PLAYERS (keyframed positions), PASSES (from, to, times), RUNS (arrows), the clock range, the finish word, the takeaway and scoreSound(). Keep and reuse the style's helpers (the striped pitch and line markings, token() players with numbers and shadows, keyframed movement (track), drawing run arrows, the ball travelling pass to pass with numbered markers, the clock chip, the dark title band and the finish flash).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (700 to 900).

THE STYLE
- The pitch is drawn to the sport's real proportions (stripes in two greens, white lines at 2 px), seen straight from above and filling the frame below the title band.
- Players are round tokens (red and blue, white outline, white number, soft shadow). Their positions come from keyframes (track) so movement is smooth and believable.
- Runs are white dashed curves with arrowheads that draw just before the player moves; the ball is a white dot that travels along each pass, leaving a solid yellow (#ffd23f) line with a numbered marker.
- A clock chip counts the real time of the move; the finish gets a white flash and one big Anton word.
- Use a real, typical pattern of play; label anything specific to one real match with its real details.
- Pace: the setup holds about 1.5 seconds, then one pass every 1 to 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, player numbers at 18 px or more and the clock at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How a counter-attack works") unless my content asks for it.

SOUND
- Bed: a low crowd murmur (pink noise, band-passed) that swells as the attack builds.
- Map events to the kit: a whistle (two high sine tones with vibrato) starts the move; each pass gets a ball kick (a short low thump with a noise click); run arrows get a soft "whoosh"; the finish gets a roar (wide noise swell) and "boom".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep the crowd very low and mark kicks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Tactics Board
Family: Data
Look: A top-down pitch with mown stripes and crisp white lines, red and blue numbered player tokens with soft shadows, dashed run arrows that draw themselves, a yellow ball path with numbered passes, and a running clock chip.
How it explains: Players move between real positions as the play unfolds: each run arrow draws just before the run, the ball travels pass by pass with a numbered marker, defenders shift, and the clock counts the seconds. The finish gets a flash and a big word, then the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/tactics-board.html` (58.6 KB)
