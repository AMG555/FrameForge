# Motion graphics style #03: Clean Tech

- **ID:** `clean-tech`
- **Family:** Kinetic Type
- **Canvas:** `1280x720`
- **Fonts:** Inter Tight (500 to 800), JetBrains Mono (500 and 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A calm, bright product-explainer look: cool off-white with a drifting dot grid, crisp Inter Tight words that rise into place, white UI cards with soft shadows, one electric blue accent, mono labels and a green check for anything finished.

## How It Explains
Short statements rise word by word and the key word gets a blue pill. Ideas become small working diagrams: a prompt card that types and sends, nodes that pop in, a dot that travels a loop, task rows that tick off, a counter that climbs, a document that fills in. Clean push and zoom-through cuts move between ideas.

## Demo
How AI agents get work done

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Clean Tech" style (Kinetic Type) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged.
- Replace the demo's story: TL, CUTS, BUMPS, the counter curve (stepCount), LOOP and ARCS, promptCard(), node(), the scene functions, SCENES and scoreSound(). Keep and reuse the style's helpers (the ui-kit helpers (rr, track, rise, riseLine, pillBehind, typed, softCard, checkMark, composite, padBed), background(), cam() and the vignette in explainer()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter Tight (500 to 800), JetBrains Mono (500 and 700).

THE STYLE
- Surface: cool off-white (#f5f6f8) with a slowly drifting dot grid, a faint blue glow top right and a faint green glow bottom left, and a light vignette. Keep background() and the vignette on every frame.
- Type: Inter Tight 800 for statements, centered or left aligned, never all caps. Inter Tight 500 to 700 for card text. JetBrains Mono in caps with letter spacing for small labels (THE SHIFT, TASKS, STEPS TAKEN). Ink #0d0f14, muted grey for secondary text, electric blue #2f5bff as the only accent, green #18b46b only for done and checked.
- How things appear: each word rises from behind a mask with an expo ease (rise, riseLine). Cards slide up and fade in, nodes pop in with a small overshoot, text in input cards is typed with a blinking caret.
- Emphasis: a blue pill grows behind the one key word and the word turns white (pillBehind). Small blue glows on whatever is active. A green check pops in for anything finished.
- Diagrams: build ideas from small UI pieces drawn in code: white rounded cards (softCard), mono labels, progress bars, a dashed path with a travelling dot, a counter. Use invented, generic names for any companies or products.
- Camera: a gentle push-in over each scene and a small bump when a pill lands (cam with BUMPS).
- Scene changes: clean horizontal pushes for a new idea and a zoom-through into a detail (composite with CUTS). No glitches or flashes.
- Pace: the hook lands in under 2 seconds, one new element every 0.3 to 1 second, and the takeaway holds about 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep statements at 78 px or more, card text at 26 px or more, mono labels at 18 px or more, and key numbers at 120 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How AI agents get work done") unless my content asks for it.

SOUND
- Bed: a soft synth pad (padBed) with light hats and a gentle kick under the body, dropping out for the hook and the ending.
- Map events to the kit: rising words get a tiny glassy tick (rise1); blue pills get a clean swipe with a bell note; cards and nodes get "pop"; typing gets "keys" and sending gets "send"; scene pushes get "whoosh"; a zoom-through gets a short "riser" then a whoosh; finished tasks and checks get a two-note chime; counters "tick" only when the shown number changes.
- Full mix (no voiceover): keep the soft pad with light hats, at most about 3 sounds at once, and a short gap before the takeaway pill.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Clean Tech
Family: Kinetic Type
Look: A calm, bright product-explainer look: cool off-white with a drifting dot grid, crisp Inter Tight words that rise into place, white UI cards with soft shadows, one electric blue accent, mono labels and a green check for anything finished.
How it explains: Short statements rise word by word and the key word gets a blue pill. Ideas become small working diagrams: a prompt card that types and sends, nodes that pop in, a dot that travels a loop, task rows that tick off, a counter that climbs, a document that fills in. Clean push and zoom-through cuts move between ideas.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Clean Tech" style (Kinetic Type) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each word rises at the start of its spoken word, within 0.03 s, and the blue pill lands on the stressed word. Show 2 to 6 key words per sentence, not a full transcript.
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
- Replace the demo's story: TL, CUTS, BUMPS, the counter curve (stepCount), LOOP and ARCS, promptCard(), node(), the scene functions, SCENES and scoreSound(). Keep and reuse the style's helpers (the ui-kit helpers (rr, track, rise, riseLine, pillBehind, typed, softCard, checkMark, composite, padBed), background(), cam() and the vignette in explainer()).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter Tight (500 to 800), JetBrains Mono (500 and 700).

THE STYLE
- Surface: cool off-white (#f5f6f8) with a slowly drifting dot grid, a faint blue glow top right and a faint green glow bottom left, and a light vignette. Keep background() and the vignette on every frame.
- Type: Inter Tight 800 for statements, centered or left aligned, never all caps. Inter Tight 500 to 700 for card text. JetBrains Mono in caps with letter spacing for small labels (THE SHIFT, TASKS, STEPS TAKEN). Ink #0d0f14, muted grey for secondary text, electric blue #2f5bff as the only accent, green #18b46b only for done and checked.
- How things appear: each word rises from behind a mask with an expo ease (rise, riseLine). Cards slide up and fade in, nodes pop in with a small overshoot, text in input cards is typed with a blinking caret.
- Emphasis: a blue pill grows behind the one key word and the word turns white (pillBehind). Small blue glows on whatever is active. A green check pops in for anything finished.
- Diagrams: build ideas from small UI pieces drawn in code: white rounded cards (softCard), mono labels, progress bars, a dashed path with a travelling dot, a counter. Use invented, generic names for any companies or products.
- Camera: a gentle push-in over each scene and a small bump when a pill lands (cam with BUMPS).
- Scene changes: clean horizontal pushes for a new idea and a zoom-through into a detail (composite with CUTS). No glitches or flashes.
- Pace: the hook lands in under 2 seconds, one new element every 0.3 to 1 second, and the takeaway holds about 1.5 seconds.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 1280x720 keep statements at 78 px or more, card text at 26 px or more, mono labels at 18 px or more, and key numbers at 120 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("How AI agents get work done") unless my content asks for it.

SOUND
- Bed: a soft synth pad (padBed) with light hats and a gentle kick under the body, dropping out for the hook and the ending.
- Map events to the kit: rising words get a tiny glassy tick (rise1); blue pills get a clean swipe with a bell note; cards and nodes get "pop"; typing gets "keys" and sending gets "send"; scene pushes get "whoosh"; a zoom-through gets a short "riser" then a whoosh; finished tasks and checks get a two-note chime; counters "tick" only when the shown number changes.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the pad low and plays anything marked soft at about 55%. Mark word ticks, pops and row ticks soft: true, keep swipes for the 2 or 3 key pills, and never put a riser over a spoken sentence.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Clean Tech
Family: Kinetic Type
Look: A calm, bright product-explainer look: cool off-white with a drifting dot grid, crisp Inter Tight words that rise into place, white UI cards with soft shadows, one electric blue accent, mono labels and a green check for anything finished.
How it explains: Short statements rise word by word and the key word gets a blue pill. Ideas become small working diagrams: a prompt card that types and sends, nodes that pop in, a dot that travels a loop, task rows that tick off, a counter that climbs, a document that fills in. Clean push and zoom-through cuts move between ideas.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/clean-tech.html` (46.1 KB)
