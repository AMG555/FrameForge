# Motion graphics style #41: Chat Story

- **ID:** `chat-story`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Inter (500 to 800), JetBrains Mono (700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A story told through an invented messaging app: a clean header with a gradient avatar and an online dot, teal bubbles for "me" and white bubbles for them, typing dots before every reply, timestamps, read receipts, and a fictional-story tag.

## How It Explains
Messages pop in one by one, each reply preceded by a typing indicator for suspense, and the thread scrolls up as it fills. The punchline arrives after the longest pause, then a reaction emoji pops onto it.

## Demo
Who ate my leftover pizza? (a fictional chat)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Chat Story" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, MSGS (who, text, time), the contact name and initial, the reaction, the tag text and scoreSound(). Keep and reuse the style's helpers (the invented app chrome (header, avatar, input bar), bubble layout with tails and wrapping, the typing indicator before each incoming message, the auto-scroll, timestamps, read receipt, the pop-in motion and the reaction).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (500 to 800), JetBrains Mono (700).

THE STYLE
- This is an invented chat app, not a copy of a real one: our own header layout, teal (#1fb5a5) outgoing bubbles, white incoming bubbles with a soft shadow, a light grey-blue background (#e9edf2).
- Always keep a small "FICTIONAL STORY" tag on screen, and never show real names, numbers or screenshots of real conversations.
- Bubbles wrap at about 70% of the width, with a small tail corner, Inter 500 text and a pop-in (scale from 0.6 with a back ease).
- Before every incoming message, the typing dots animate for 0.6 to 1.2 seconds. The thread scrolls up smoothly when it fills.
- Pace: one message every 0.8 to 1.5 seconds; the punchline gets the longest pause.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep message text at 30 px or more, the contact name at 32 px or more and timestamps at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Who ate my leftover pizza? (a fictional chat)") unless my content asks for it.

SOUND
- Bed: none, or a very quiet pad; the message sounds are the music.
- Map events to the kit: outgoing messages get "send"; incoming get "ping"; typing dots get soft keyboard clicks ("keys", soft); the reaction gets "pop" and a short comic sting (two falling notes).
- Full mix (no voiceover): a soft send swoosh for "me", a receive ping for them, quiet typing clicks during the dots, and a comic sting on the punchline.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Chat Story
Family: Shorts Format
Look: A story told through an invented messaging app: a clean header with a gradient avatar and an online dot, teal bubbles for "me" and white bubbles for them, typing dots before every reply, timestamps, read receipts, and a fictional-story tag.
How it explains: Messages pop in one by one, each reply preceded by a typing indicator for suspense, and the thread scrolls up as it fills. The punchline arrives after the longest pause, then a reaction emoji pops onto it.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Chat Story" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each bubble pops on the first word of its line, typing dots run during the pause before a reply, and the reaction lands on the laugh or the punchline.
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
- Replace the demo's story: TL, MSGS (who, text, time), the contact name and initial, the reaction, the tag text and scoreSound(). Keep and reuse the style's helpers (the invented app chrome (header, avatar, input bar), bubble layout with tails and wrapping, the typing indicator before each incoming message, the auto-scroll, timestamps, read receipt, the pop-in motion and the reaction).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (500 to 800), JetBrains Mono (700).

THE STYLE
- This is an invented chat app, not a copy of a real one: our own header layout, teal (#1fb5a5) outgoing bubbles, white incoming bubbles with a soft shadow, a light grey-blue background (#e9edf2).
- Always keep a small "FICTIONAL STORY" tag on screen, and never show real names, numbers or screenshots of real conversations.
- Bubbles wrap at about 70% of the width, with a small tail corner, Inter 500 text and a pop-in (scale from 0.6 with a back ease).
- Before every incoming message, the typing dots animate for 0.6 to 1.2 seconds. The thread scrolls up smoothly when it fills.
- Pace: one message every 0.8 to 1.5 seconds; the punchline gets the longest pause.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep message text at 30 px or more, the contact name at 32 px or more and timestamps at 18 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Who ate my leftover pizza? (a fictional chat)") unless my content asks for it.

SOUND
- Bed: none, or a very quiet pad; the message sounds are the music.
- Map events to the kit: outgoing messages get "send"; incoming get "ping"; typing dots get soft keyboard clicks ("keys", soft); the reaction gets "pop" and a short comic sting (two falling notes).
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark pings and typing soft: true.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Chat Story
Family: Shorts Format
Look: A story told through an invented messaging app: a clean header with a gradient avatar and an online dot, teal bubbles for "me" and white bubbles for them, typing dots before every reply, timestamps, read receipts, and a fictional-story tag.
How it explains: Messages pop in one by one, each reply preceded by a typing indicator for suspense, and the thread scrolls up as it fills. The punchline arrives after the longest pause, then a reaction emoji pops onto it.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/chat-story.html` (57.3 KB)
