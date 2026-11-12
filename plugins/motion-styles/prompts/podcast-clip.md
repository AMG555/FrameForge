# Motion graphics style #47: Podcast Clip

- **ID:** `podcast-clip`
- **Family:** Shorts Format
- **Canvas:** `720x1280`
- **Fonts:** Inter (800 and 900), JetBrains Mono (800)
- **Three.js 3D:** No
- **Footage Overlay:** Yes

## Look
A vertical podcast clip: two stacked rounded speaker panels on black (host on top, guest below), a green ring on whoever is talking, bold captions in the seam with the key words in yellow, an episode tag and a live waveform at the bottom.

## How It Explains
Captions appear two to four words at a time in the seam between the panels, the active-speaker ring jumps to whoever is talking with a slight zoom on their panel, the waveform reacts to the speech, and a progress line runs along the bottom so viewers know how long is left.

## Demo
A clip from an invented show, "The Side Project Show"

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Podcast Clip" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover, Load footage) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Keep window.loadFootage(url) and the Load footage button working so I can drop in my own clip and see the overlay on it; until then the stand-in presenter shows where I sit in the frame.
- Replace the demo's story: TL, LINES (speaker, words with times, which words are yellow), the show name and episode, and scoreSound(); load your recording with Load footage (it fills both panels, cropped). Keep and reuse the style's helpers (footage() in two rounded panels with a slight zoom on the active speaker, the green active ring, the seam captions with yellow key words and a thick black outline, the episode tag, the reactive waveform and the progress line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (800 and 900), JetBrains Mono (800).

THE STYLE
- Built for your footage: both panels use footage() (your recording when loaded, cropped and zoomed differently per speaker; a stand-in until then). Keep faces clear of captions.
- Black background (#0b0b0d); panels have 26 px corners; the active panel gets a 5 px green ring (#36d67b) and a 4% zoom.
- Captions: Inter 900 white with a thick black stroke, 2 to 4 words at a time, key words in yellow (#ffd43b) and slightly bigger, popping in on their word.
- Small black-glass name tags in the panel corners, an episode tag in green top left, the show name in white caps.
- A waveform of rounded bars at the bottom reacts to who is talking, and a thin progress line runs across the bottom.
- Pace: caption groups change every 0.6 to 1.2 seconds, following the speech exactly.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep captions at 44 px or more, name tags at 20 px or more and the episode tag at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A clip from an invented show, "The Side Project Show"") unless my content asks for it.

SOUND
- Bed: a very low lo-fi pad so the voices sit on top.
- Map events to the kit: caption groups get a very soft "pop"; speaker changes get a soft tick; the end card gets a short chime.
- Full mix (no voiceover): a low lo-fi bed, a soft pop for each caption group and a tiny tick when the speaker changes; the real audio is your recording.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Podcast Clip
Family: Shorts Format
Look: A vertical podcast clip: two stacked rounded speaker panels on black (host on top, guest below), a green ring on whoever is talking, bold captions in the seam with the key words in yellow, an episode tag and a live waveform at the bottom.
How it explains: Captions appear two to four words at a time in the seam between the panels, the active-speaker ring jumps to whoever is talking with a slight zoom on their panel, the waveform reacts to the speech, and a progress line runs along the bottom so viewers know how long is left.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Podcast Clip" style (Shorts Format) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Each caption group appears on its first spoken word, yellow words land on their stress, and the active ring switches on the first word of each speaker.
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
- Replace the demo's story: TL, LINES (speaker, words with times, which words are yellow), the show name and episode, and scoreSound(); load your recording with Load footage (it fills both panels, cropped). Keep and reuse the style's helpers (footage() in two rounded panels with a slight zoom on the active speaker, the green active ring, the seam captions with yellow key words and a thick black outline, the episode tag, the reactive waveform and the progress line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Inter (800 and 900), JetBrains Mono (800).

THE STYLE
- Built for your footage: both panels use footage() (your recording when loaded, cropped and zoomed differently per speaker; a stand-in until then). Keep faces clear of captions.
- Black background (#0b0b0d); panels have 26 px corners; the active panel gets a 5 px green ring (#36d67b) and a 4% zoom.
- Captions: Inter 900 white with a thick black stroke, 2 to 4 words at a time, key words in yellow (#ffd43b) and slightly bigger, popping in on their word.
- Small black-glass name tags in the panel corners, an episode tag in green top left, the show name in white caps.
- A waveform of rounded bars at the bottom reacts to who is talking, and a thin progress line runs across the bottom.
- Pace: caption groups change every 0.6 to 1.2 seconds, following the speech exactly.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep captions at 44 px or more, name tags at 20 px or more and the episode tag at 22 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("A clip from an invented show, "The Side Project Show"") unless my content asks for it.

SOUND
- Bed: a very low lo-fi pad so the voices sit on top.
- Map events to the kit: caption groups get a very soft "pop"; speaker changes get a soft tick; the end card gets a short chime.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Keep everything soft: the voices carry the clip.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Podcast Clip
Family: Shorts Format
Look: A vertical podcast clip: two stacked rounded speaker panels on black (host on top, guest below), a green ring on whoever is talking, bold captions in the seam with the key words in yellow, an episode tag and a live waveform at the bottom.
How it explains: Captions appear two to four words at a time in the seam between the panels, the active-speaker ring jumps to whoever is talking with a slight zoom on their panel, the waveform reacts to the speech, and a progress line runs along the bottom so viewers know how long is left.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/podcast-clip.html` (55.5 KB)
