# Motion graphics style #02: Chalk Talk

- **ID:** `chalk-talk`
- **Family:** Hand-Drawn
- **Canvas:** `1280x720`
- **Fonts:** Cabin Sketch (700), Kalam (400 and 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A teacher at a long green slate: grainy chalk strokes that skip over the board’s tooth, colored chalk for emphasis, dust falling from the stick as it writes, faint ghosts of old lessons, a wooden frame and a dusty chalk tray.

## How It Explains
One continuous lesson along the board: a visible chalk stick writes every word and draws every line, the camera tracks to the next stretch of slate, numbers are re-chalked as they count, pink chalk rings the key moments, and a felt eraser wipes a section clean for the takeaway.

## Demo
Get 1% better every day

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Chalk Talk" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, CAM, the counter curve (cntStep, cntVal, cntText), ITEMS, drawCounter(), WIPE and its timing, and scoreSound(). Keep and reuse the style's helpers (board(), tooth(), noise2, chalkLine, chalkText, layoutText, resample, quad, ellipse, wipeMask, the frame and tray, the chalk stick, the eraser, dust() and the compositor).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Cabin Sketch (700), Kalam (400 and 700).

THE STYLE
- Surface: one long slate (BW wide, 720 tall) baked once with mottled green, faint chalk ghosts of old lessons and old eraser smears. The tooth pattern is punched out of the chalk layer every frame so strokes break like real chalk. Keep the wooden frame, the tray with chalk pieces, the classroom light falloff and the fine grain.
- Writing: everything appears by being chalked on in order. Letters arrive one at a time with a little jitter; lines are drawn along their path with small skips. The chalk stick follows the tip whenever something is being written, and dust falls from it.
- Type: Cabin Sketch for titles and the big takeaway, Kalam for equations, labels and notes. White chalk for content, yellow for the main idea and curves, pink for emphasis and key numbers, blue for side notes. Exponents and small marks use the dy offset on text parts.
- Camera: one board, one continuous shot. The camera tracks along the slate to a fresh stretch for each new idea (CAM keys) and leans in gently on the key moment. No cuts.
- Emphasis: pink rings around the key number or point, yellow underlines and brackets, chalk arrows that lead the eye along the board.
- Numbers: re-chalked as they count (a fresh scrawl about 10 times a second), then ringed when they land.
- Scene change: the felt eraser wipes a section back and forth, leaving a faint haze, and the next idea is written in the cleared space.
- Diagrams: draw real charts to scale for the topic, with axes, labels and curves computed from the actual function.
- Pace: something is always being written. Allow 0.4 to 1.2 seconds per line and hold the takeaway about 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep headings at 90 px or more, chalked writing at 56 px or more, labels at 36 px or more, and key numbers at 72 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Get 1% better every day") unless my content asks for it.

SOUND
- Bed: quiet room tone only, no music. A double knock on the board can open the lesson.
- Chalk: every word gets its own scratch (grainy band-passed noise bursts with a tap where the stick lands), timed by character position across its write window. Lines get one long scratch; rings and underlines a little louder. Use the score helpers tap, scratch, write and pluck, built on k.hiss and k.voice.
- Counter: a short scratch each time the shown number changes. Eraser: a felt swish for each pass, panned with the eraser.
- Big moments: soft plucked notes, two for a landed number and a rising arpeggio for the takeaway. Keep it gentle; this is a lesson, not a trailer.
- Full mix (no voiceover): room tone, chalk and eraser sounds, and soft plucks on the big moments. No music.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Chalk Talk
Family: Hand-Drawn
Look: A teacher at a long green slate: grainy chalk strokes that skip over the board’s tooth, colored chalk for emphasis, dust falling from the stick as it writes, faint ghosts of old lessons, a wooden frame and a dusty chalk tray.
How it explains: One continuous lesson along the board: a visible chalk stick writes every word and draws every line, the camera tracks to the next stretch of slate, numbers are re-chalked as they count, pink chalk rings the key moments, and a felt eraser wipes a section clean for the takeaway.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Chalk Talk" style (Hand-Drawn) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each line of chalk starts being written as its first word is spoken and finishes by the end of that phrase; a short label can land on a single word. Write the key phrase on the board, not the whole transcript.
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
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, CAM, the counter curve (cntStep, cntVal, cntText), ITEMS, drawCounter(), WIPE and its timing, and scoreSound(). Keep and reuse the style's helpers (board(), tooth(), noise2, chalkLine, chalkText, layoutText, resample, quad, ellipse, wipeMask, the frame and tray, the chalk stick, the eraser, dust() and the compositor).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Cabin Sketch (700), Kalam (400 and 700).

THE STYLE
- Surface: one long slate (BW wide, 720 tall) baked once with mottled green, faint chalk ghosts of old lessons and old eraser smears. The tooth pattern is punched out of the chalk layer every frame so strokes break like real chalk. Keep the wooden frame, the tray with chalk pieces, the classroom light falloff and the fine grain.
- Writing: everything appears by being chalked on in order. Letters arrive one at a time with a little jitter; lines are drawn along their path with small skips. The chalk stick follows the tip whenever something is being written, and dust falls from it.
- Type: Cabin Sketch for titles and the big takeaway, Kalam for equations, labels and notes. White chalk for content, yellow for the main idea and curves, pink for emphasis and key numbers, blue for side notes. Exponents and small marks use the dy offset on text parts.
- Camera: one board, one continuous shot. The camera tracks along the slate to a fresh stretch for each new idea (CAM keys) and leans in gently on the key moment. No cuts.
- Emphasis: pink rings around the key number or point, yellow underlines and brackets, chalk arrows that lead the eye along the board.
- Numbers: re-chalked as they count (a fresh scrawl about 10 times a second), then ringed when they land.
- Scene change: the felt eraser wipes a section back and forth, leaving a faint haze, and the next idea is written in the cleared space.
- Diagrams: draw real charts to scale for the topic, with axes, labels and curves computed from the actual function.
- Pace: something is always being written. Allow 0.4 to 1.2 seconds per line and hold the takeaway about 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep headings at 90 px or more, chalked writing at 56 px or more, labels at 36 px or more, and key numbers at 72 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Get 1% better every day") unless my content asks for it.

SOUND
- Bed: quiet room tone only, no music. A double knock on the board can open the lesson.
- Chalk: every word gets its own scratch (grainy band-passed noise bursts with a tap where the stick lands), timed by character position across its write window. Lines get one long scratch; rings and underlines a little louder. Use the score helpers tap, scratch, write and pluck, built on k.hiss and k.voice.
- Counter: a short scratch each time the shown number changes. Eraser: a felt swish for each pass, panned with the eraser.
- Big moments: soft plucked notes, two for a landed number and a rising arpeggio for the takeaway. Keep it gentle; this is a lesson, not a trailer.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark chalk scratches and taps soft: true so they sit under the voice, keep the room tone very low, and keep plucks for the 2 or 3 biggest moments only.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Chalk Talk
Family: Hand-Drawn
Look: A teacher at a long green slate: grainy chalk strokes that skip over the board’s tooth, colored chalk for emphasis, dust falling from the stick as it writes, faint ghosts of old lessons, a wooden frame and a dusty chalk tray.
How it explains: One continuous lesson along the board: a visible chalk stick writes every word and draws every line, the camera tracks to the next stretch of slate, numbers are re-chalked as they count, pink chalk rings the key moments, and a felt eraser wipes a section clean for the takeaway.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/chalk-talk.html` (47.1 KB)
