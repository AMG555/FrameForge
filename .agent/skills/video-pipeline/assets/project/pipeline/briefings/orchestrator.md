# pipeline/briefings/orchestrator.md
# Loaded by the orchestrator agent. Read this fully before spawning subagents.

## Your role

You are the **orchestrator**. You own the full production timeline and the final output.
You spawn scene-author and diagram-author subagents, integrate their output, and run
the verification loop.

## Model effort settings (Opus 5.5 / Claude Code)

Use the right effort level at each stage — wrong effort wastes cost or quality:

| Stage | effort | Reason |
|-------|--------|--------|
| Beat sheet + storyboard authorship | `xhigh` | New creative work — maximum reasoning |
| First-time scene code authorship | `xhigh` | New composition, determinism matters |
| Storyboard gate review / patch | `medium` | Analytical, not creative |
| Strip-range patch (fix failing frames) | `medium` | Targeted surgical fix |
| Encode-only / mux-only runs | `medium` | No creative decisions |
| Research / scripting (Path 3) | `xhigh` for first draft, `medium` for revisions |

`tool_choice` must always be `auto` — forced tool use is not supported in Opus 5.5.

## Order of operations

```
1. Brief → storyboard (STORYBOARD.md) — STOP, await human approval
2. Storyboard passes all 4 gates (storyboard-validator.mjs)
3. TTS first: generate audio, get word-level timestamps (transcribe.py)
4. Assign chapters to scene-author / diagram-author subagents
5. Collect scenes — each must include a storyboard still
6. Run look.mjs (preflight DOM check)
7. Run render.mjs sheet (one sheet per shot)
8. Review sheets, request patches from the responsible subagent
9. Run render.mjs full (full encode, all workers)
    → After full render, out/sfx-events.json is auto-generated from window.__events()
10. Run mix_audio_pro.py (professional signal chain):
    uv run scripts/mix_audio_pro.py --room broadcast --platform youtube
    (--sfx-events flag reads out/sfx-events.json automatically if present)
11. Run verify.py (7-gate QC)
12. If QC fails: identify the responsible chapter, re-assign to a fresh subagent
13. Mux audio: render.mjs mux --audio=out/audio_mix_pro.m4a
14. Final verify.py pass
```

## Subagent rules

- Each subagent receives a briefing from `pipeline/briefings/<role>.md`.
- **Subagents may not edit shared helpers.** If a subagent proposes an edit to
  `reel/engine.js` or `scripts/render.mjs`, reject it and ask for a chapter-local
  workaround.
- Run verification with subagents: 2 subagents at a time, each scanning 10 frames
  (every 5 frames of the rendered sequence).
- Chapter seams are the weakest point. Always run a strip over the last 0.5s of
  one chapter and the first 0.5s of the next to catch missing anticipation frames.

## Spend gate

If `video_job.py` is running this production, it enforces `--max-usd`. You must call
`estimate_cost()` before the visuals phase. If the estimate would exceed the cap,
reduce the chapter count or shorten scenes before proceeding.

## Quality gate pass criteria

`verify.py` checks:
1. Output file exists and is non-empty
2. Duration within 2% of spec
3. Resolution matches spec
4. No corrupt frames (mean pixel value > 1, < 254)
5. Audio track present in muxed file
6. BT.709 colour tags present
7. `-faststart` moov atom at file head

All 7 must pass before the job is marked `done`.
