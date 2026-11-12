# Motion graphics style #42: Versus Split

- **ID:** `versus-split`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Anton, Inter (700 to 900)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A head-to-head Short: the screen splits diagonally into coral and blue halves that slam in from the sides, a black VS badge with a yellow ring, two characters drawn in code, and stat bars that race toward each other row by row with a winner crown.

## How It Explains
Both sides slide in and collide, the VS badge slams, then each stat row runs: the two bars race out from the centre, the numbers count, and a small crown pops on the winner. A running score keeps track, and the final verdict slams at the end.

## Demo
Cat vs dog

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Versus Split" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the two SIDES (names, colours, the character painters), STATS (label, values, units, who wins), the verdict and scoreSound(). Keep and reuse the style's helpers (the diagonal split with slam-in, the VS badge, the character painters, the racing stat bars with counters, the winner crown, the running score and the verdict slam).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (700 to 900).

THE STYLE
- Two halves split by a diagonal: coral (#ff6b4a) on the left, blue (#2b6cff) on the right. They slam in from the sides and hold.
- Each side gets a simple character drawn in code (shapes only, a clear silhouette and face) and its name in big white Anton.
- A black VS badge with a yellow (#ffd23f) ring sits on the seam and slams in after the halves.
- Stats sit in a dark translucent panel: the label in Inter 900 caps, two bars growing outward from the centre in each side's colour, values counting at the ends, and a yellow crown over the winner.
- Use real, typical values and footnote anything that only applies to one breed, model or case.
- Pace: halves in about 1 second, one stat row every 1.5 to 2 seconds, verdict held about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the names at 64 px or more, stat labels at 24 px or more and values at 28 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Cat vs dog") unless my content asks for it.

SOUND
- Bed: a punchy fight-night beat (kick and snare on padBed).
- Map events to the kit: halves get "slam" and "whoosh"; the badge gets "boom"; each row gets a soft "whoosh" and counter ticks; each crown gets a bright ding (SND.chime); the verdict gets "slam" and a crowd cheer (a wide noise swell).
- Full mix (no voiceover): a fight-night beat, a "slam" for the halves, a whoosh per row, a ding for each crown and a crowd cheer for the verdict.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Versus Split
Family: Shorts Format
Look: A head-to-head Short: the screen splits diagonally into coral and blue halves that slam in from the sides, a black VS badge with a yellow ring, two characters drawn in code, and stat bars that race toward each other row by row with a winner crown.
How it explains: Both sides slide in and collide, the VS badge slams, then each stat row runs: the two bars race out from the centre, the numbers count, and a small crown pops on the winner. A running score keeps track, and the final verdict slams at the end.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Versus Split" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The halves slam in on the two names, each stat row starts as its label is read, the crown lands on the winner, and the verdict slams on the last word.
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
- Replace the demo's story: TL, the two SIDES (names, colours, the character painters), STATS (label, values, units, who wins), the verdict and scoreSound(). Keep and reuse the style's helpers (the diagonal split with slam-in, the VS badge, the character painters, the racing stat bars with counters, the winner crown, the running score and the verdict slam).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (700 to 900).

THE STYLE
- Two halves split by a diagonal: coral (#ff6b4a) on the left, blue (#2b6cff) on the right. They slam in from the sides and hold.
- Each side gets a simple character drawn in code (shapes only, a clear silhouette and face) and its name in big white Anton.
- A black VS badge with a yellow (#ffd23f) ring sits on the seam and slams in after the halves.
- Stats sit in a dark translucent panel: the label in Inter 900 caps, two bars growing outward from the centre in each side's colour, values counting at the ends, and a yellow crown over the winner.
- Use real, typical values and footnote anything that only applies to one breed, model or case.
- Pace: halves in about 1 second, one stat row every 1.5 to 2 seconds, verdict held about 2 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the names at 64 px or more, stat labels at 24 px or more and values at 28 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Cat vs dog") unless my content asks for it.

SOUND
- Bed: a punchy fight-night beat (kick and snare on padBed).
- Map events to the kit: halves get "slam" and "whoosh"; the badge gets "boom"; each row gets a soft "whoosh" and counter ticks; each crown gets a bright ding (SND.chime); the verdict gets "slam" and a crowd cheer (a wide noise swell).
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark whooshes soft: true and keep the cheer short.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Versus Split
Family: Shorts Format
Look: A head-to-head Short: the screen splits diagonally into coral and blue halves that slam in from the sides, a black VS badge with a yellow ring, two characters drawn in code, and stat bars that race toward each other row by row with a winner crown.
How it explains: Both sides slide in and collide, the VS badge slams, then each stat row runs: the two bars race out from the centre, the numbers count, and a small crown pops on the winner. A running score keeps track, and the final verdict slams at the end.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/versus-split.html` (57.5 KB)
