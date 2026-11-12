# Motion graphics style #37: Market Tape

- **ID:** `market-tape`
- **Family:** Data
- **Canvas:** `720x1280`
- **Fonts:** Archivo Black, Inter (500 and 800), JetBrains Mono (500 and 700)
- **Three.js 3D:** No
- **Footage Overlay:** No

## Look
A trading-screen explainer on near-black: a scrolling ticker strip of invented symbols, candlesticks that print one by one with a price tag riding the last close, green and red numbers, and a red flash when it breaks.

## How It Explains
Candles print one by one in an uptrend while the price tag climbs, then the trend breaks: red candles drop, the screen flashes and shakes, and a percentage chip counts the fall. A simple loop diagram explains why, and the takeaway closes with an education-only note.

## Demo
Why prices crash (example data, not advice)

---

## Ready-to-Copy Prompt (Standard)

```markdown
I want an animated video in the "Market Tape" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

BUILD DIRECTLY
Skip the storyboard and build the full animation now. Afterwards, list any facts or numbers you assumed.

WHAT TO BUILD
One self-contained HTML file (an artifact if you can), built on the reference file below:
- Keep the page, the player (play/pause, scrub, time, sound toggle, loop, Load voiceover) and the CM and SFX blocks unchanged. Also keep the shared library helpers block (track, txt, chip, slam, rise, wordLine, hd, footage, composite, cam, punch, makeGL and the sound helpers) unchanged.
- Keep the canvas at 720x1280 (9:16, for Shorts, Reels and TikTok).
- Replace the demo's story: TL, PRICES (or your own example series), the ticker symbols (invented), the event label, the LOOP diagram text, the takeaway and scoreSound(). Keep and reuse the style's helpers (the dark trading grid, the scrolling ticker strip, candles that print one by one with wicks, the price tag riding the last close, the red flash and shake on the break, the counting percentage chip, the four-step loop diagram, and the EXAMPLE DATA · NOT ADVICE line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (500 and 800), JetBrains Mono (500 and 700).

THE STYLE
- Never give financial advice: keep "EXAMPLE DATA · EDUCATION, NOT ADVICE" on screen, use invented tickers, and label any real figures with their source and date.
- Background: near-black (#0b0f14) with faint horizontal grid lines; a ticker strip at the top scrolling invented symbols with green (#2ee59d) ups and red (#ff5a5f) downs.
- Candles are drawn to one price scale: body from open to close, thin wick from low to high, green up and red down, printing one by one left to right. A pill tag rides the latest close.
- The break: a short red flash over the frame, a small shake, and a red percentage chip that counts down.
- Explain with a simple four-node loop (rounded boxes, curved arrows) whose steps light up in turn.
- Type: Archivo Black headline (white, then red for the key word), Inter for explanation, JetBrains Mono for prices and the ticker.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, prices and percentages at 26 px or more and the loop labels at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why prices crash (example data, not advice)") unless my content asks for it.

SOUND
- Bed: a tense, low synth pulse (padBed with kick) that drops out at the break.
- Map events to the kit: each candle gets a soft "tick" (higher for green, lower for red); the break gets a two-tone alarm, "boom" and a falling tone; the counter "tick"s as it changes; each loop step gets a soft pluck; the takeaway gets a low swell.
- Full mix (no voiceover): a tense synth pulse, a soft tick for every candle, an alarm and a bass drop on the break, and a heartbeat-like pulse under the loop.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Market Tape
Family: Data
Look: A trading-screen explainer on near-black: a scrolling ticker strip of invented symbols, candlesticks that print one by one with a price tag riding the last close, green and red numbers, and a red flash when it breaks.
How it explains: Candles print one by one in an uptrend while the price tag climbs, then the trend breaks: red candles drop, the screen flashes and shakes, and a percentage chip counts the fall. A simple loop diagram explains why, and the takeaway closes with an education-only note.

```

---

## Voiceover & Storyboard Prompt

```markdown
I want an animated video in the "Market Tape" style (Data) from the Motion Graphics Style Library. Below is a complete, working reference animation in this style: its core helpers (CM), a synthesized sound kit (SFX), the style's scenes, its sound score and the player page. Treat that file as the ground truth for how this style looks, moves and sounds, and rebuild it around my content.

MY CONTENT
[No topic yet. Ask me for my topic or script before building anything.]

VOICEOVER TIMING
[No timing pasted yet. Before building, ask me for a word-level SRT or word timestamps of my voiceover. If I only have the audio file, offer to transcribe it into word timings.]

How to use the timing:
- Turn it into a list of words with start and end times in seconds. If the timing is per line only, spread each line's words across its span in proportion to their length.
- Set the duration to the last word's end plus about 1.2 seconds.
- Build the timeline (TL) from these times. Candles print while the rise is described, the break lands on the stressed word ("crash", "dropped"), the percentage locks on the spoken number, and each loop step lights up as it is named.
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
- Replace the demo's story: TL, PRICES (or your own example series), the ticker symbols (invented), the event label, the LOOP diagram text, the takeaway and scoreSound(). Keep and reuse the style's helpers (the dark trading grid, the scrolling ticker strip, candles that print one by one with wicks, the price tag riding the last close, the red flash and shake on the break, the counting percentage chip, the four-step loop diagram, and the EXAMPLE DATA · NOT ADVICE line).
- Aim for 15 to 40 seconds unless my content needs more, and set the duration in TL.D.
- Keep window.seek(t), window.DURATION, window.scoreSound and window.SFX exposed, so the video can be rendered frame by frame.
- Load the style's fonts before the first draw, as the reference does: Archivo Black, Inter (500 and 800), JetBrains Mono (500 and 700).

THE STYLE
- Never give financial advice: keep "EXAMPLE DATA · EDUCATION, NOT ADVICE" on screen, use invented tickers, and label any real figures with their source and date.
- Background: near-black (#0b0f14) with faint horizontal grid lines; a ticker strip at the top scrolling invented symbols with green (#2ee59d) ups and red (#ff5a5f) downs.
- Candles are drawn to one price scale: body from open to close, thin wick from low to high, green up and red down, printing one by one left to right. A pill tag rides the latest close.
- The break: a short red flash over the frame, a small shake, and a red percentage chip that counts down.
- Explain with a simple four-node loop (rounded boxes, curved arrows) whose steps light up in turn.
- Type: Archivo Black headline (white, then red for the key word), Inter for explanation, JetBrains Mono for prices and the ticker.

RULES THAT KEEP IT IN STYLE
- Change the story, the words and the props; do not change the medium. Draw every subject accurately for my topic and double-check any facts and numbers you show.
- Every frame is a pure function of t. Use CM.rng(seed) and CM.noise1(seed) for all randomness, never Math.random. Caching static layers is fine.
- It will be watched on phones: at 720x1280 keep the headline at 60 px or more, prices and percentages at 26 px or more and the loop labels at 26 px or more. Fill the frame.
- Keep each frame fast, well under 50 ms.
- Give my topic its own demo content; do not reuse the reference's story ("Why prices crash (example data, not advice)") unless my content asks for it.

SOUND
- Bed: a tense, low synth pulse (padBed with kick) that drops out at the break.
- Map events to the kit: each candle gets a soft "tick" (higher for green, lower for red); the break gets a two-tone alarm, "boom" and a falling tone; the counter "tick"s as it changes; each loop step gets a soft pluck; the takeaway gets a low swell.
- Voiceover mix: the player calls SFX.live with { voiceover: true } once narration is loaded. Mark ticks soft: true and keep the alarm short.
- Sync is everything: the sound score reads the same TL times as the picture.

IF YOU CAN RUN CODE
Render an MP4: open the file in headless Chrome, call window.seek(i / 30) for every frame, capture the canvas and pipe the frames into ffmpeg. Render the effects with SFX.render(window.scoreSound, window.DURATION, 48000, { voiceover: false }), which returns interleaved stereo floats, and mux them in. With a voiceover, render the effects with { voiceover: true } and mix them under my audio file.

STYLE CARD
Name: Market Tape
Family: Data
Look: A trading-screen explainer on near-black: a scrolling ticker strip of invented symbols, candlesticks that print one by one with a price tag riding the last close, green and red numbers, and a red flash when it breaks.
How it explains: Candles print one by one in an uptrend while the price tag climbs, then the trend breaks: red candles drop, the screen flashes and shakes, and a percentage chip counts the fall. A simple loop diagram explains why, and the takeaway closes with an education-only note.

```

---

## Reference Source Code Location
File: `plugins/motion-styles/sources/market-tape.html` (58.1 KB)
