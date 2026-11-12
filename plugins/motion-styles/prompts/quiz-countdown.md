# Motion graphics style #38: Quiz Countdown

- **ID:** `quiz-countdown`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (700 to 900), JetBrains Mono (700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A loud trivia Short on a bright orange striped background: a white question card, four answer pills with letter badges, a white timer ring that drains around a big countdown number, then a green reveal with confetti.

## How It Explains
The question card pops in, the four answers slide in one by one, the ring drains while the number counts down with a tick each second, then the right answer flashes green with confetti while the others fade. A one-line fact explains the answer and the next question is teased.

## Demo
Which planet has the most moons?

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Quiz Countdown" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, Q (the question, four answers, the correct index, the fact line), the question number, the next-question tease and scoreSound(). Keep and reuse the style's helpers (the striped background, the timer ring and countdown number, the question card, the answer pills with letter badges, the staggered slide-in, the reveal (green pill, check, dimmed wrong answers), the confetti burst and the comment prompt).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 to 900), JetBrains Mono (700).

THE STYLE
- Background: saturated orange (#ff7a1a) with wide diagonal lighter stripes that drift slowly.
- Question card: white, 24 px corners, a soft orange shadow, a mono "QUESTION n / 10" label in orange above the question in Inter 800.
- Answers: four white pills with an orange letter badge (A to D), sliding in from the right one after another.
- Timer: a thick white ring that drains clockwise around a big Archivo Black number counting down; the last 3 seconds pulse.
- Reveal: the right pill turns green (#2fb36b) with a check, the others drop to 40% opacity, confetti bursts from the right pill, and a one-line fact appears below.
- Use real, current facts and say "as of" with the year when numbers change.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the question at 46 px or more, answers at 38 px or more and the countdown at 80 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Which planet has the most moons?") unless my content asks for it.

SOUND
- Bed: an upbeat game-show pad with hats and a light kick.
- Map events to the kit: the card gets "pop" and SND.paper; answers get "whoosh" plus a tick; each countdown second gets a "tick" (louder at 3, 2, 1); zero gets a buzzer (a low square tone); the reveal gets a bright arpeggio and "sparkle"; the fact gets a soft "pop".
- Full mix (no voiceover): an upbeat game-show pad, a tick per second that gets louder near zero, a buzzer at zero and a fanfare on the reveal.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Quiz Countdown
Family: Shorts Format
Look: A loud trivia Short on a bright orange striped background: a white question card, four answer pills with letter badges, a white timer ring that drains around a big countdown number, then a green reveal with confetti.
How it explains: The question card pops in, the four answers slide in one by one, the ring drains while the number counts down with a tick each second, then the right answer flashes green with confetti while the others fade. A one-line fact explains the answer and the next question is teased.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Quiz Countdown" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The question card lands on the first word of the question, each answer slides in as it is read, the countdown starts after the last answer, and the reveal lands on the answer word.
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
- Replace the demo's story: TL, Q (the question, four answers, the correct index, the fact line), the question number, the next-question tease and scoreSound(). Keep and reuse the style's helpers (the striped background, the timer ring and countdown number, the question card, the answer pills with letter badges, the staggered slide-in, the reveal (green pill, check, dimmed wrong answers), the confetti burst and the comment prompt).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (700 to 900), JetBrains Mono (700).

THE STYLE
- Background: saturated orange (#ff7a1a) with wide diagonal lighter stripes that drift slowly.
- Question card: white, 24 px corners, a soft orange shadow, a mono "QUESTION n / 10" label in orange above the question in Inter 800.
- Answers: four white pills with an orange letter badge (A to D), sliding in from the right one after another.
- Timer: a thick white ring that drains clockwise around a big Archivo Black number counting down; the last 3 seconds pulse.
- Reveal: the right pill turns green (#2fb36b) with a check, the others drop to 40% opacity, confetti bursts from the right pill, and a one-line fact appears below.
- Use real, current facts and say "as of" with the year when numbers change.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the question at 46 px or more, answers at 38 px or more and the countdown at 80 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Which planet has the most moons?") unless my content asks for it.

SOUND
- Bed: an upbeat game-show pad with hats and a light kick.
- Map events to the kit: the card gets "pop" and SND.paper; answers get "whoosh" plus a tick; each countdown second gets a "tick" (louder at 3, 2, 1); zero gets a buzzer (a low square tone); the reveal gets a bright arpeggio and "sparkle"; the fact gets a soft "pop".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep ticks soft: true but audible.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Quiz Countdown
Family: Shorts Format
Look: A loud trivia Short on a bright orange striped background: a white question card, four answer pills with letter badges, a white timer ring that drains around a big countdown number, then a green reveal with confetti.
How it explains: The question card pops in, the four answers slide in one by one, the ring drains while the number counts down with a tick each second, then the right answer flashes green with confetti while the others fade. A one-line fact explains the answer and the next question is teased.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/quiz-countdown.html` (57.3 KB)
