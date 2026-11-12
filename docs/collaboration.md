# FrameForge — Collaboration, Architecture & Engineering Guide

This guide covers developer collaboration, system architecture, security invariants, upstream technique synchronization, and automated quality assurance for contributors and engineering partners.

---

## 🏗️ Architecture & Topology

FrameForge runs as a modular execution engine with three deployment options:

```
YOUR AI AGENT (Claude Code / OpenCode / Cursor / Windsurf / Python / Swarms)
         │
         │  Stdio JSON-RPC (Local - Default)  OR  HTTPS (Cloudflare Remote MCP)
         ▼
[FrameForge MCP Engine]   (34 Tools: Creation, Editing, Audio, Ingestion)
         │
         ├─ src/mcp-server/      MCP protocol handlers (stdio & HTTP)
         ├─ src/workflows/       research → script → assets → render → publish
         ├─ src/pipeline/        state machine, retry policies, artifact retention
         ├─ src/video-renderer/  Playwright canvas compositor + FFmpeg encoder
         ├─ src/video-editor/    autonomous cutting, trimming, grading, J/L cuts
         ├─ src/audio-mixer/     two-pass EBU R128 mastering, ducking, 13-type SFX
         └─ src/quality-gate/    7-gate automated broadcast verification
```

### Deployment Models
1. **Local Stdio (Recommended):** `npx -y @amg555/frameforge-mcp` — zero-port, spawns directly from IDE or agent CLI.
2. **Local HTTP Server:** `npm start` — runs on port 3210 for shared local network access.
3. **Cloudflare Remote Worker:** Proxies MCP requests to a headless worker, saving context tokens for thin clients. See [`docs/deployment.md`](deployment.md).

---

## 🔄 Upstream Frontier Skills Synchronization

FrameForge continuously tracks and syncs techniques from 9 upstream frontier video repositories:
* **HyperFrames:** Motion craft, beat-grid alignment, and GSAP ease curves.
* **OneTake:** 39-move continuous zero-cut camera choreography.
* **ClaudeAnimationBase:** 12fps organic boil and deterministic math formulas.
* **Remotion Spring Physics:** Settling time calculations and multi-segment keyframing.
* **Earshot:** Broadcast DSP chain, room acoustics, and 13-type procedural sound synthesis.
* **LemoOpuscar:** Video directing method, J/L split cuts, and TREATMENT.md planning.

### Upstream MCP Tools
* `sync_upstream_skills`: Fetches new commits from reference repos and updates local manifest.
* `check_upstream_updates`: Offline check of sync status and pending technique updates.

---

## 🛡️ Enterprise Security Invariants

All contributors must adhere to these non-negotiable security requirements:

| Invariant | Implementation |
|---|---|
| **Timing-Safe Auth** | `crypto.timingSafeEqual` for all token comparisons across all HTTP servers. |
| **SSRF Prevention** | `_assertSafeWebhookUrl()` blocks RFC-1918 private subnets, loopbacks, and link-local ranges. |
| **Path Traversal Protection** | `productionId`, `audioPath`, and download paths are strictly validated before file I/O. |
| **Command Injection Guard** | Arguments to FFmpeg and Playwright are passed as strict arrays via `spawnSync`, never shell strings. Animation timestamps are allowlisted to `/^[0-9]+([.:][0-9]+)*$/`. |
| **Credential Redaction** | 14+ regex patterns in `src/utils/log-redaction.js` strip secrets and API keys from all logs. |
| **Body Size Limit** | All HTTP servers enforce a 4 MB maximum body limit (HTTP 413). |

---

## 🚦 7-Gate Broadcast Quality Control (QC)

Every video generated or edited by FrameForge must pass automated quality gates before release:

1. **Resolution:** Strict 1920×1080 (16:9) or 1080×1920 (9:16) pixel raster.
2. **Video Stream:** H.264 High Profile, YUV420p, strict BT.709 color matrix.
3. **Loudness Compliance:** EBU R128 integrated loudness of **−14 LUFS ± 1.5 LU**.
4. **True Peak Ceiling:** Maximum true peak ≤ **−0.5 dBTP** to prevent clipping on mobile speakers.
5. **Black Frame Detection:** Rejects any black sequence > 0.5 seconds.
6. **Frozen Frame Detection:** Rejects any motion stall > 0.5 seconds.
7. **Container Integrity:** Validates MP4 box structures, moov atom placement, and stream durations.

---

## 🧪 Testing & Validation Standards

Before submitting any Pull Request:

```bash
# 1. Run full test suite (661 tests, 138 suites)
npm test

# 2. Run structural gate validator (113 invariant checks)
npm run validate

# 3. System diagnostics
npm run doctor
```

### Contributor Code Standards
* **No shell string injection:** Always `spawnSync(cmd, [args])`. Never template strings in shell commands.
* **No hardcoded secrets:** All keys via `.env` or system environment.
* **Cross-platform paths:** Always use `path.join()`, never hardcoded `/` or `\\`.
* **LUFS discipline:** All rendered audio must pass EBU R128 limits.

For pull request submission details, see [CONTRIBUTING.md](../CONTRIBUTING.md).

