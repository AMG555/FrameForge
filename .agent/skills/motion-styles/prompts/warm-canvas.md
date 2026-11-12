# Motion graphics style #06: Warm Canvas

- **ID:** `warm-canvas`
- **Family:** Talking Head
- **Canvas:** `1280x720`
- **Fonts:** Fraunces (500 to 700) and Inter (500 to 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A calm, editorial creator edit built around your own footage: full-frame talking head with a few clean serif captions, then a warm off-white canvas with a soft swoosh where white cards explain the idea while you shrink into a rounded picture-in-picture. Fraunces headlines in ink and sky blue, quiet Inter UI text, pastel chips.

## How It Explains
Two modes and nothing else. On the A-roll, one or two captions fade up word by word with the key words in blue and small side chips slide in. On the canvas, a title chip lands, then one idea per beat: two cards with a dashed arrow, a comparison table whose numbers count up, a planner window where the bad blocks get flagged and removed, and three takeaway pills. Chapter cards push in vertically.

## Demo
Can AI really plan my week?

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Warm Canvas" style (Talking Head) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, CUTS, PUNCH (the jump-cut zooms inside the A-roll), the chapter card titles, the caption words, the side chips, the scene functions, SCENES and scoreSound(). Keep and reuse the style's helpers (the palette C, SERIF and SANS, PIP and COLX, toneText(), shadowCard(), tag(), enter(), fadeOut(), the icon set, canvasBG(), the A-roll stand-in and fullARoll(), caption(), titleChip(), sideChip(), chapterCard(), the card, table and planner drawing patterns, the vertical push compositor, and the Load A-roll button with window.loadARoll()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fraunces (500 to 700) and Inter (500 to 700).

THE STYLE
- Built for my own footage (A-roll): the speaker is the star and the graphics only explain. Keep the "Load A-roll" button and window.loadARoll(url) working so I can drop in my clip and see it in sync; until then the defocused stand-in shows where I sit in frame. If I give you my recording, time everything to it.
- Two modes only. Mode 1: full-frame A-roll with at most one centered caption (white Fraunces 600 with a soft shadow, key words in sky blue #4f9cf0) and small white side chips with an icon and a two-line label. Mode 2: the warm canvas (#f7f5f4 with one big soft swoosh #ebe6e2), the speaker in a rounded 272x384 picture-in-picture at the right with a thin blue ring, and the content centered in the left column (COLX).
- Type: Fraunces 600 for headlines, captions and card titles, tracked -2%, in two tones (ink #111111 plus sky blue for the key phrase). Inter 500 to 600 for UI labels, tags and small text in #2b2826 and #8f8a87. Title case for headlines.
- Cards: white, radius 20, a very soft warm shadow, pastel tinted tags (blue, purple, green, yellow tints) and simple code-drawn icons. Never more than one window or two cards on the canvas at once.
- One idea per beat: a title chip at the top of the column, then the explanation (cards with a dashed arrow, a table, a mock app window, or three takeaway pills). Each beat clears before the next arrives.
- Motion is gentle: fades with a small rise (enter), soft counters, cards that slide together, never a bounce or a shake. Chapter cards (a blue number tile, a two-tone title and a progress dash row) push in and out vertically. Everything else is a clean cut.
- Show me 2 to 4 beats on the canvas between A-roll moments, and come back to the full-frame A-roll for the personal lines.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep headlines and chapter titles at 52 px or more, captions at 60 px or more, card titles at 28 px or more, and UI labels at 14 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Can AI really plan my week?") unless my content asks for it.

SOUND
- Quiet and tactile, built to sit under a real voice: soft paper slides (pink noise through a rising bandpass) for chips, cards and title chips, low wooden taps for list items, pills and table rows, a light keyboard patter for counters, a breathy swell for each vertical push, and one quiet pad under the canvas section.
- No chimes, bells, pings, sparkles or risers, and no music beat. Never more than 2 sounds at once.
- Full mix (no voiceover): no music bed beyond the one quiet pad under the canvas, at most 2 sounds at once, and plenty of air between them.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Warm Canvas
Family: Talking Head
Look: A calm, editorial creator edit built around your own footage: full-frame talking head with a few clean serif captions, then a warm off-white canvas with a soft swoosh where white cards explain the idea while you shrink into a rounded picture-in-picture. Fraunces headlines in ink and sky blue, quiet Inter UI text, pastel chips.
How it explains: Two modes and nothing else. On the A-roll, one or two captions fade up word by word with the key words in blue and small side chips slide in. On the canvas, a title chip lands, then one idea per beat: two cards with a dashed arrow, a comparison table whose numbers count up, a planner window where the bad blocks get flagged and removed, and three takeaway pills. Chapter cards push in vertically.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Warm Canvas" style (Talking Head) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each caption word fades up as it is spoken, key words in blue on their stressed syllable; a card, chip or pill lands as its idea is named; a counter locks on its last spoken syllable; the PiP shrink and the canvas arrive on the first word of a new idea, and the A-roll returns as the speaker gets personal again.
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
- Replace the demo's story: TL, CUTS, PUNCH (the jump-cut zooms inside the A-roll), the chapter card titles, the caption words, the side chips, the scene functions, SCENES and scoreSound(). Keep and reuse the style's helpers (the palette C, SERIF and SANS, PIP and COLX, toneText(), shadowCard(), tag(), enter(), fadeOut(), the icon set, canvasBG(), the A-roll stand-in and fullARoll(), caption(), titleChip(), sideChip(), chapterCard(), the card, table and planner drawing patterns, the vertical push compositor, and the Load A-roll button with window.loadARoll()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Fraunces (500 to 700) and Inter (500 to 700).

THE STYLE
- Built for my own footage (A-roll): the speaker is the star and the graphics only explain. Keep the "Load A-roll" button and window.loadARoll(url) working so I can drop in my clip and see it in sync; until then the defocused stand-in shows where I sit in frame. If I give you my recording, time everything to it.
- Two modes only. Mode 1: full-frame A-roll with at most one centered caption (white Fraunces 600 with a soft shadow, key words in sky blue #4f9cf0) and small white side chips with an icon and a two-line label. Mode 2: the warm canvas (#f7f5f4 with one big soft swoosh #ebe6e2), the speaker in a rounded 272x384 picture-in-picture at the right with a thin blue ring, and the content centered in the left column (COLX).
- Type: Fraunces 600 for headlines, captions and card titles, tracked -2%, in two tones (ink #111111 plus sky blue for the key phrase). Inter 500 to 600 for UI labels, tags and small text in #2b2826 and #8f8a87. Title case for headlines.
- Cards: white, radius 20, a very soft warm shadow, pastel tinted tags (blue, purple, green, yellow tints) and simple code-drawn icons. Never more than one window or two cards on the canvas at once.
- One idea per beat: a title chip at the top of the column, then the explanation (cards with a dashed arrow, a table, a mock app window, or three takeaway pills). Each beat clears before the next arrives.
- Motion is gentle: fades with a small rise (enter), soft counters, cards that slide together, never a bounce or a shake. Chapter cards (a blue number tile, a two-tone title and a progress dash row) push in and out vertically. Everything else is a clean cut.
- Show me 2 to 4 beats on the canvas between A-roll moments, and come back to the full-frame A-roll for the personal lines.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep headlines and chapter titles at 52 px or more, captions at 60 px or more, card titles at 28 px or more, and UI labels at 14 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Can AI really plan my week?") unless my content asks for it.

SOUND
- Quiet and tactile, built to sit under a real voice: soft paper slides (pink noise through a rising bandpass) for chips, cards and title chips, low wooden taps for list items, pills and table rows, a light keyboard patter for counters, a breathy swell for each vertical push, and one quiet pad under the canvas section.
- No chimes, bells, pings, sparkles or risers, and no music beat. Never more than 2 sounds at once.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the pad low and plays anything marked soft at about 55%. Mark slides, taps and keys soft: true, keep the swells for the vertical pushes only, and never put a sound on top of a stressed word.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Warm Canvas
Family: Talking Head
Look: A calm, editorial creator edit built around your own footage: full-frame talking head with a few clean serif captions, then a warm off-white canvas with a soft swoosh where white cards explain the idea while you shrink into a rounded picture-in-picture. Fraunces headlines in ink and sky blue, quiet Inter UI text, pastel chips.
How it explains: Two modes and nothing else. On the A-roll, one or two captions fade up word by word with the key words in blue and small side chips slide in. On the canvas, a title chip lands, then one idea per beat: two cards with a dashed arrow, a comparison table whose numbers count up, a planner window where the bad blocks get flagged and removed, and three takeaway pills. Chapter cards push in vertically.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/warm-canvas.html` (64.4 KB)
