# Motion graphics style #32: Pixel Quest

- **ID:** `pixel-quest`
- **Family:** Retro
- **Canvas:** `720x1280`
- **Fonts:** Press Start 2P
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
Chunky pixel art drawn on a 180 by 320 grid and scaled up 4×: a side-scrolling level with a little hero, sky bands, pixel clouds, brick platforms and gems, under a retro HUD (hearts, XP bar, level number) with a dialog box for every tip.

## How It Explains
The hero walks through the level while the camera scrolls with them. Each tip is a quest that pops up in a dialog box with typewriter text; the hero jumps gaps, grabs gems (the score climbs), and the level-up flash fills the XP bar for the payoff.

## Demo
Level up your sleep

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Pixel Quest" style (Retro) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, the LEVEL layout (gaps, platforms, gems), the hero sprite colours, QUESTS (dialog text and when they appear), the level-up text and scoreSound(). Keep and reuse the style's helpers (the low-res world canvas (180×320) scaled 4× with smoothing off, the walking/jumping hero sprite, the scrolling camera, pixel hearts, the XP bar and LVL counter, the typewriter dialog box, the level-up flash and the Press Start 2P lettering).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Press Start 2P.

THE STYLE
- All world art is drawn at 180×320 on its own canvas with whole-pixel rectangles, then scaled 4× with image smoothing off. No anti-aliased shapes in the world layer.
- Original sprites only: a small hero with a cap and two walking frames, gems (not coins), brick platforms and flags. Never copy a real game character, item or level.
- Palette: limited and bright: sky bands (#5fcde4 to #a6e6f0), greens (#3f9b4f, #5ac85a), brown dirt (#8b5a2b), brick orange (#c86b2b), gem yellow (#ffd23f), hero red cap (#e63946) and blue overalls (#1d4ed8).
- HUD on top in screen pixels: pixel hearts, an XP bar, a LVL number and a score, all in Press Start 2P with a black outline.
- Dialog box: black with a white 3 px border at the bottom, text typed at about 30 characters a second with a blinking ▼.
- Pace: the hero never stops walking; one quest every 2.5 seconds; the level-up near the end.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep dialog text at 20 px or more, HUD text at 24 px or more and titles at 44 px or more (all in Press Start 2P). Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Level up your sleep") unless my content asks for it.

SOUND
- Music: a chiptune loop: a square-wave lead melody, a triangle bass on the beat, and short noise hats.
- Map events to the kit: jumps get a rising square sweep; gems get a two-note bleep (SND.beep); dialog text gets tiny blips per few characters; level-up gets a fast rising arpeggio; the title blinks with a soft blip.
- Full mix (no voiceover): keep the chiptune loop (square lead, triangle bass, noise hats), with jump, gem and level-up sounds on top.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Pixel Quest
Family: Retro
Look: Chunky pixel art drawn on a 180 by 320 grid and scaled up 4×: a side-scrolling level with a little hero, sky bands, pixel clouds, brick platforms and gems, under a retro HUD (hearts, XP bar, level number) with a dialog box for every tip.
How it explains: The hero walks through the level while the camera scrolls with them. Each tip is a quest that pops up in a dialog box with typewriter text; the hero jumps gaps, grabs gems (the score climbs), and the level-up flash fills the XP bar for the payoff.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Pixel Quest" style (Retro) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each quest box opens on the first word of its tip and types while it is read, gems ping as they are counted, and the level-up flash lands on the payoff word.
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
- Replace the demo's story: TL, the LEVEL layout (gaps, platforms, gems), the hero sprite colours, QUESTS (dialog text and when they appear), the level-up text and scoreSound(). Keep and reuse the style's helpers (the low-res world canvas (180×320) scaled 4× with smoothing off, the walking/jumping hero sprite, the scrolling camera, pixel hearts, the XP bar and LVL counter, the typewriter dialog box, the level-up flash and the Press Start 2P lettering).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Press Start 2P.

THE STYLE
- All world art is drawn at 180×320 on its own canvas with whole-pixel rectangles, then scaled 4× with image smoothing off. No anti-aliased shapes in the world layer.
- Original sprites only: a small hero with a cap and two walking frames, gems (not coins), brick platforms and flags. Never copy a real game character, item or level.
- Palette: limited and bright: sky bands (#5fcde4 to #a6e6f0), greens (#3f9b4f, #5ac85a), brown dirt (#8b5a2b), brick orange (#c86b2b), gem yellow (#ffd23f), hero red cap (#e63946) and blue overalls (#1d4ed8).
- HUD on top in screen pixels: pixel hearts, an XP bar, a LVL number and a score, all in Press Start 2P with a black outline.
- Dialog box: black with a white 3 px border at the bottom, text typed at about 30 characters a second with a blinking ▼.
- Pace: the hero never stops walking; one quest every 2.5 seconds; the level-up near the end.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep dialog text at 20 px or more, HUD text at 24 px or more and titles at 44 px or more (all in Press Start 2P). Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Level up your sleep") unless my content asks for it.

SOUND
- Music: a chiptune loop: a square-wave lead melody, a triangle bass on the beat, and short noise hats.
- Map events to the kit: jumps get a rising square sweep; gems get a two-note bleep (SND.beep); dialog text gets tiny blips per few characters; level-up gets a fast rising arpeggio; the title blinks with a soft blip.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded, which keeps the loop low. Mark gem pings and text blips soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Pixel Quest
Family: Retro
Look: Chunky pixel art drawn on a 180 by 320 grid and scaled up 4×: a side-scrolling level with a little hero, sky bands, pixel clouds, brick platforms and gems, under a retro HUD (hearts, XP bar, level number) with a dialog box for every tip.
How it explains: The hero walks through the level while the camera scrolls with them. Each tip is a quest that pops up in a dialog box with typewriter text; the hero jumps gaps, grabs gems (the score climbs), and the level-up flash fills the XP bar for the payoff.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/pixel-quest.html` (59.5 KB)
