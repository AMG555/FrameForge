# Motion graphics style #43: Myth or Fact

- **ID:** `myth-or-fact`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (600 to 800), Anton (stamps)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A clean debunk Short on pale grey: a white statement card with a big quote mark, then a rubber stamp slams down (red MYTH or green FACT) with distressed ink, followed by one line of proof with a check icon.

## How It Explains
Each round reads like a game: the statement card pops in, a short "thinking" pause with a ticking bar invites a guess, then the stamp slams with a shake and the proof line explains. A second round follows with the opposite verdict, then a score for the viewer.

## Demo
Two body myths and facts

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Myth or Fact" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, ROUNDS (statement lines, verdict, proof lines), the round counter and scoreSound(). Keep and reuse the style's helpers (the pale background and title band, the statement card with quote mark, the guess bar, the distressed stamp (red MYTH / green FACT) with slam and shake, the proof line with icon, and the round transitions).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (600 to 800), Anton (stamps).

THE STYLE
- Background: pale cool grey (#eef1f4); the title "MYTH OR FACT?" in Archivo Black with a yellow question mark at the top.
- Statement cards: white, 26 px corners, soft shadow, a large faint quote mark, the claim in Inter 800, and a small round number.
- Stamps: a rotated rounded rectangle with a double border and Anton letters, red (#e03131) for MYTH, green (#2f9e44) for FACT, distressed with knocked-out specks; they slam from 2× size with a shake.
- Proof: one or two short lines in Inter 700 with a round icon (green check for fact, red cross for myth).
- Only real, checkable claims, and proof lines that state what the evidence actually shows.
- Pace: about 5 to 6 seconds per round.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep statements at 46 px or more, the stamp at 100 px or more and proof lines at 30 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Two body myths and facts") unless my content asks for it.

SOUND
- Bed: a light, curious pad.
- Map events to the kit: cards get "pop" and SND.paper; the guess bar gets steady soft "tick"s; MYTH gets "stamp" and a low buzzer; FACT gets "stamp" and a bright two-note ding; proof lines get a soft "pop"; the final score gets an open chord.
- Full mix (no voiceover): a light, curious pad, ticks for the guess bar, a heavy "stamp" with a buzzer (myth) or a ding (fact), and a soft pop for the proof.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Myth or Fact
Family: Shorts Format
Look: A clean debunk Short on pale grey: a white statement card with a big quote mark, then a rubber stamp slams down (red MYTH or green FACT) with distressed ink, followed by one line of proof with a check icon.
How it explains: Each round reads like a game: the statement card pops in, a short "thinking" pause with a ticking bar invites a guess, then the stamp slams with a shake and the proof line explains. A second round follows with the opposite verdict, then a score for the viewer.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Myth or Fact" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The card lands on the first word of the statement, the guess bar runs during the pause, the stamp slams on "myth" or "fact", and the proof reads in as it is said.
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
- Replace the demo's story: TL, ROUNDS (statement lines, verdict, proof lines), the round counter and scoreSound(). Keep and reuse the style's helpers (the pale background and title band, the statement card with quote mark, the guess bar, the distressed stamp (red MYTH / green FACT) with slam and shake, the proof line with icon, and the round transitions).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (600 to 800), Anton (stamps).

THE STYLE
- Background: pale cool grey (#eef1f4); the title "MYTH OR FACT?" in Archivo Black with a yellow question mark at the top.
- Statement cards: white, 26 px corners, soft shadow, a large faint quote mark, the claim in Inter 800, and a small round number.
- Stamps: a rotated rounded rectangle with a double border and Anton letters, red (#e03131) for MYTH, green (#2f9e44) for FACT, distressed with knocked-out specks; they slam from 2× size with a shake.
- Proof: one or two short lines in Inter 700 with a round icon (green check for fact, red cross for myth).
- Only real, checkable claims, and proof lines that state what the evidence actually shows.
- Pace: about 5 to 6 seconds per round.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep statements at 46 px or more, the stamp at 100 px or more and proof lines at 30 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Two body myths and facts") unless my content asks for it.

SOUND
- Bed: a light, curious pad.
- Map events to the kit: cards get "pop" and SND.paper; the guess bar gets steady soft "tick"s; MYTH gets "stamp" and a low buzzer; FACT gets "stamp" and a bright two-note ding; proof lines get a soft "pop"; the final score gets an open chord.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark ticks soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Myth or Fact
Family: Shorts Format
Look: A clean debunk Short on pale grey: a white statement card with a big quote mark, then a rubber stamp slams down (red MYTH or green FACT) with distressed ink, followed by one line of proof with a check icon.
How it explains: Each round reads like a game: the statement card pops in, a short "thinking" pause with a ticking bar invites a guess, then the stamp slams with a shake and the proof line explains. A second round follows with the opposite verdict, then a score for the viewer.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/myth-or-fact.html` (56.5 KB)
