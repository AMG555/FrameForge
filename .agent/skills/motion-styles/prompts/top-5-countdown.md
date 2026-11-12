# Motion graphics style #39: Top 5 Countdown

- **ID:** `top-5-countdown`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Anton, Inter (800), JetBrains Mono (700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A countdown Short on deep navy: a huge outlined rank number slams in beside an illustrated card drawn in code, with the name in tall Anton caps, a mono detail line, and a ladder of rank dots on the side that tracks where you are.

## How It Explains
Each rank gets its own beat: a whip cut, the big number slams with a punch zoom, the card slides up with its illustration and the name, the detail line counts up, and the ladder dot moves. Number one gets a bigger hit and a glow.

## Demo
The 3 highest mountains on Earth

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Top 5 Countdown" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, RANKS (number, name, detail, value and the illustration painter), the headline, the takeaway and scoreSound(). Keep and reuse the style's helpers (the navy background with a warm glow, the outlined rank number with its echo fill, the rank ladder, the card with a code-drawn illustration, the value counter, the whip cuts between ranks and the bigger hit for number one).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (800), JetBrains Mono (700).

THE STYLE
- Background: deep navy (#0e1630) with a soft warm glow behind the number; orange accent (#ff8a3d) for the ladder and labels.
- The rank number is huge Anton with a 3 px white outline and a faint orange echo offset behind it; it slams in with a punch zoom.
- The card is a rounded picture drawn in code for the item (here: mountain ridges with snow caps on a sky gradient), sliding up under the number.
- Names in tall Anton caps; one mono detail line with the real figure and place; the figure counts up.
- A vertical ladder of dots (5 to 1) on the right shows the current rank in orange.
- Use real, sourced rankings; one rank every 3 to 4 seconds, number one held longest.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the rank number at 200 px or more, the name at 60 px or more and the detail line at 24 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The 3 highest mountains on Earth") unless my content asks for it.

SOUND
- Bed: a driving, low pulse (padBed with kick) with hats.
- Map events to the kit: each new rank gets a "riser" and a "whoosh" into a "slam"; the card gets "pop"; the value counter "tick"s; the ladder move gets a soft tick; number one gets "boom" and "shimmer".
- Full mix (no voiceover): a driving pulse, a riser into each rank, "slam" on each number and a "boom" for number one.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Top 5 Countdown
Family: Shorts Format
Look: A countdown Short on deep navy: a huge outlined rank number slams in beside an illustrated card drawn in code, with the name in tall Anton caps, a mono detail line, and a ladder of rank dots on the side that tracks where you are.
How it explains: Each rank gets its own beat: a whip cut, the big number slams with a punch zoom, the card slides up with its illustration and the name, the detail line counts up, and the ladder dot moves. Number one gets a bigger hit and a glow.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Top 5 Countdown" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each rank number slams on its spoken number, the name lands on the name, and the value locks on the last syllable of the figure.
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
- Replace the demo's story: TL, RANKS (number, name, detail, value and the illustration painter), the headline, the takeaway and scoreSound(). Keep and reuse the style's helpers (the navy background with a warm glow, the outlined rank number with its echo fill, the rank ladder, the card with a code-drawn illustration, the value counter, the whip cuts between ranks and the bigger hit for number one).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Anton, Inter (800), JetBrains Mono (700).

THE STYLE
- Background: deep navy (#0e1630) with a soft warm glow behind the number; orange accent (#ff8a3d) for the ladder and labels.
- The rank number is huge Anton with a 3 px white outline and a faint orange echo offset behind it; it slams in with a punch zoom.
- The card is a rounded picture drawn in code for the item (here: mountain ridges with snow caps on a sky gradient), sliding up under the number.
- Names in tall Anton caps; one mono detail line with the real figure and place; the figure counts up.
- A vertical ladder of dots (5 to 1) on the right shows the current rank in orange.
- Use real, sourced rankings; one rank every 3 to 4 seconds, number one held longest.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the rank number at 200 px or more, the name at 60 px or more and the detail line at 24 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("The 3 highest mountains on Earth") unless my content asks for it.

SOUND
- Bed: a driving, low pulse (padBed with kick) with hats.
- Map events to the kit: each new rank gets a "riser" and a "whoosh" into a "slam"; the card gets "pop"; the value counter "tick"s; the ladder move gets a soft tick; number one gets "boom" and "shimmer".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark ticks soft: true and keep the boom for number one only.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Top 5 Countdown
Family: Shorts Format
Look: A countdown Short on deep navy: a huge outlined rank number slams in beside an illustrated card drawn in code, with the name in tall Anton caps, a mono detail line, and a ladder of rank dots on the side that tracks where you are.
How it explains: Each rank gets its own beat: a whip cut, the big number slams with a punch zoom, the card slides up with its illustration and the name, the detail line counts up, and the ladder dot moves. Number one gets a bigger hit and a glow.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/top-5-countdown.html` (56.3 KB)
