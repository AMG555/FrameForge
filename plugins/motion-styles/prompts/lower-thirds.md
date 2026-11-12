# Motion graphics style #51: Lower Thirds

- **ID:** `lower-thirds`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Instrument Serif, Inter (500 to 900)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
A consistent identity kit for interviews and long videos: a name tag with an amber accent bar and dark glass panel, a serif chapter card with a progress row, a social handle bar, and a red subscribe nudge with a bell that rings.

## How It Explains
Each element has one clean entrance and exit: the name tag wipes out of its accent bar, the chapter title rises in with a tracked label and progress dots, the subscribe pill pops with a bell wiggle and a cursor click, and everything clears for the next part.

## Demo
An interview intro with a guest name, a chapter and a subscribe nudge

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Lower Thirds" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, the name and role, CHAPTERS (number, title), the handle, the accent colour and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage(), the accent-bar wipe name tag, the chapter card with label, serif title and progress dots, the handle bar, the subscribe pill with bell wiggle and cursor click, and the shared timings (in 0.5 s, hold, out 0.3 s)).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif, Inter (500 to 900).

THE STYLE
- Built for your footage: graphics live in the bottom-left and the top, away from faces, inside title-safe margins (40 px).
- One accent colour (amber #ffb347 here) used only for the bar, labels and progress; everything else white on dark glass (rgba 12,14,18,0.78).
- Name tag: a 8 px accent bar wipes up first, then the panel wipes out to the right; name in Inter 900, role in Inter 500.
- Chapter card: a small tracked label ("CHAPTER 2") in the accent, the title in Instrument Serif rising in, and a row of progress dashes with the current one filled.
- Subscribe nudge: a red pill (#e5322d) with a bell icon that wiggles, a cursor that taps it, and the pill flips to "SUBSCRIBED".
- Every element: 0.5 s in, holds while relevant, 0.3 s out.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep names at 40 px or more, roles at 24 px or more, chapter titles at 64 px or more, and keep everything inside the title-safe area. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("An interview intro with a guest name, a chapter and a subscribe nudge") unless my content asks for it.

SOUND
- No music (your audio leads); effects only.
- Map events to the kit: each entrance gets a soft "whoosh"; the chapter card gets a soft "pop" and a tick per progress dash; the bell gets two quick high pings ("ping"); the cursor tap gets "click".
- Full mix (no voiceover): soft swooshes for each entrance, a bell for the subscribe nudge, a click for the cursor.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Lower Thirds
Family: Edit Overlay
Look: A consistent identity kit for interviews and long videos: a name tag with an amber accent bar and dark glass panel, a serif chapter card with a progress row, a social handle bar, and a red subscribe nudge with a bell that rings.
How it explains: Each element has one clean entrance and exit: the name tag wipes out of its accent bar, the chapter title rises in with a tracked label and progress dots, the subscribe pill pops with a bell wiggle and a cursor click, and everything clears for the next part.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Lower Thirds" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The name tag lands as the person starts speaking, the chapter card lands on the first word of the new section, and the subscribe nudge appears in a natural pause.
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
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, the name and role, CHAPTERS (number, title), the handle, the accent colour and scoreSound(); load your clip with Load footage. Keep and reuse the style's helpers (footage(), the accent-bar wipe name tag, the chapter card with label, serif title and progress dots, the handle bar, the subscribe pill with bell wiggle and cursor click, and the shared timings (in 0.5 s, hold, out 0.3 s)).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Instrument Serif, Inter (500 to 900).

THE STYLE
- Built for your footage: graphics live in the bottom-left and the top, away from faces, inside title-safe margins (40 px).
- One accent colour (amber #ffb347 here) used only for the bar, labels and progress; everything else white on dark glass (rgba 12,14,18,0.78).
- Name tag: a 8 px accent bar wipes up first, then the panel wipes out to the right; name in Inter 900, role in Inter 500.
- Chapter card: a small tracked label ("CHAPTER 2") in the accent, the title in Instrument Serif rising in, and a row of progress dashes with the current one filled.
- Subscribe nudge: a red pill (#e5322d) with a bell icon that wiggles, a cursor that taps it, and the pill flips to "SUBSCRIBED".
- Every element: 0.5 s in, holds while relevant, 0.3 s out.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep names at 40 px or more, roles at 24 px or more, chapter titles at 64 px or more, and keep everything inside the title-safe area. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("An interview intro with a guest name, a chapter and a subscribe nudge") unless my content asks for it.

SOUND
- No music (your audio leads); effects only.
- Map events to the kit: each entrance gets a soft "whoosh"; the chapter card gets a soft "pop" and a tick per progress dash; the bell gets two quick high pings ("ping"); the cursor tap gets "click".
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark every sound soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Lower Thirds
Family: Edit Overlay
Look: A consistent identity kit for interviews and long videos: a name tag with an amber accent bar and dark glass panel, a serif chapter card with a progress row, a social handle bar, and a red subscribe nudge with a bell that rings.
How it explains: Each element has one clean entrance and exit: the name tag wipes out of its accent bar, the chapter title rises in with a tracked label and progress dots, the subscribe pill pops with a bell wiggle and a cursor click, and everything clears for the next part.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/lower-thirds.html` (56.0 KB)
