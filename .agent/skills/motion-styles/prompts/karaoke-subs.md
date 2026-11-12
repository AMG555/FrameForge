# Motion graphics style #49: Karaoke Subs

- **ID:** `karaoke-subs`
- **Family:** Edit Overlay
- **Canvas:** `720x1280`
- **Fonts:** Inter (800)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
Clean, readable subtitles for any talking video: a rounded dark glass box in the lower third holding two lines, where the word being spoken sits on a bright green pill, spoken words stay white and upcoming words wait at half opacity.

## How It Explains
The subtitle box shows one phrase (up to two lines) at a time; the green pill glides from word to word exactly as each is spoken, and the box swaps to the next phrase with a soft fade and lift. Nothing else moves, so it suits any edit.

## Demo
A morning-routine talking clip

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Karaoke Subs" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: PHRASES (each phrase as words with start times, from your word-level SRT) and the pill colour; load your clip with Load footage. Keep and reuse the style's helpers (footage(), the rounded glass box with blur-look fill, two-line layout with automatic wrapping, the gliding highlight pill (it slides between word boxes), spoken/upcoming opacities and the phrase swap).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (800).

THE STYLE
- Built for your footage and your word timings: paste a word-level SRT and every word gets its own start time.
- The box: dark glass (#0e1014 at 74%), 22 px corners, centred in the lower third, sized to its text with 28 px padding.
- Words: Inter 800 at 40 px or more. Spoken words white, upcoming words white at 45%, the current word dark (#0b1a10) on a green pill (#3ddc84) that slides and resizes between words with a quick ease.
- One phrase at a time, at most two lines of about 22 characters; phrases swap with a 0.2 s fade and a 10 px lift.
- Accessibility first: high contrast, no effects that hurt readability, exact timing.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep subtitle words at 40 px or more, never more than two lines, and keep the box above the bottom 15% (phone UI). Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A morning-routine talking clip") unless my content asks for it.

SOUND
- No music: the clip's own audio leads.
- Optional: a barely audible "tick" at the start of each phrase; nothing on individual words.
- Full mix (no voiceover): none needed; the clip's own audio is the soundtrack. A very faint tick per phrase is optional.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Karaoke Subs
Family: Edit Overlay
Look: Clean, readable subtitles for any talking video: a rounded dark glass box in the lower third holding two lines, where the word being spoken sits on a bright green pill, spoken words stay white and upcoming words wait at half opacity.
How it explains: The subtitle box shows one phrase (up to two lines) at a time; the green pill glides from word to word exactly as each is spoken, and the box swaps to the next phrase with a soft fade and lift. Nothing else moves, so it suits any edit.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Karaoke Subs" style (Edit Overlay) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. The pill reaches each word at its start time from the SRT, within 0.03 s; a new phrase appears 0.1 s before its first word.
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
- Replace the demo's story: PHRASES (each phrase as words with start times, from your word-level SRT) and the pill colour; load your clip with Load footage. Keep and reuse the style's helpers (footage(), the rounded glass box with blur-look fill, two-line layout with automatic wrapping, the gliding highlight pill (it slides between word boxes), spoken/upcoming opacities and the phrase swap).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (800).

THE STYLE
- Built for your footage and your word timings: paste a word-level SRT and every word gets its own start time.
- The box: dark glass (#0e1014 at 74%), 22 px corners, centred in the lower third, sized to its text with 28 px padding.
- Words: Inter 800 at 40 px or more. Spoken words white, upcoming words white at 45%, the current word dark (#0b1a10) on a green pill (#3ddc84) that slides and resizes between words with a quick ease.
- One phrase at a time, at most two lines of about 22 characters; phrases swap with a 0.2 s fade and a 10 px lift.
- Accessibility first: high contrast, no effects that hurt readability, exact timing.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep subtitle words at 40 px or more, never more than two lines, and keep the box above the bottom 15% (phone UI). Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A morning-routine talking clip") unless my content asks for it.

SOUND
- No music: the clip's own audio leads.
- Optional: a barely audible "tick" at the start of each phrase; nothing on individual words.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep everything silent or near-silent.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Karaoke Subs
Family: Edit Overlay
Look: Clean, readable subtitles for any talking video: a rounded dark glass box in the lower third holding two lines, where the word being spoken sits on a bright green pill, spoken words stay white and upcoming words wait at half opacity.
How it explains: The subtitle box shows one phrase (up to two lines) at a time; the green pill glides from word to word exactly as each is spoken, and the box swaps to the next phrase with a soft fade and lift. Nothing else moves, so it suits any edit.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/karaoke-subs.html` (54.0 KB)
