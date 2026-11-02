# Contributing to FrameForge

Thank you for considering a contribution. These guidelines keep the codebase
consistent and make reviews fast.

---

## Quick Start

```bash
git clone https://github.com/AMG555/frameforge
cd frameforge
cp .kiro/config/production-secrets.env.template .env
# Fill in at minimum: GROQ_API_KEY

npm install
npm run doctor          # verify system deps
npm test                # run all checks
```

---

## Branch Workflow

1. **Fork** the repo and clone your fork.
2. Create a branch from `main`:
   ```bash
   git checkout -b add-new-provider
   ```
3. Make your changes (keep each commit focused on one thing).
4. Run validation before pushing:
   ```bash
   node scripts/deep-validate.js
   ```
5. Push and open a Pull Request against `main`.

---

## Commit Message Style

**No conventional-commit prefixes.** Write plain imperative sentences:

```
✅  Add ElevenLabs v3 streaming TTS support
✅  Fix font detection path on Windows ARM
✅  Update docs for SearXNG self-hosted setup
❌  feat: add elevenlabs v3
❌  fix: font detection
❌  docs: update searxng
```

Keep the subject line under 72 characters. Add a blank line and a body if the
change needs more explanation.

---

## Code Standards

| Rule | Detail |
|:--- |:--- |
| **No shell string injection** | Always `spawnSync(cmd, [args, array])` — never template strings in shell |
| **No hardcoded secrets** | All credentials via `.env` — never committed |
| **Cross-platform paths** | Use `path.join()`, not string concatenation |
| **Error handling** | External I/O (HTTP, FFmpeg, DB) must have try/catch or `.catch()` |
| **No suppressed type errors** | Fix TypeScript/JSDoc errors, never cast with `as any` |
| **FFmpeg flags** | Always include `-nostdin` in FFmpeg spawnSync calls |
| **LUFS** | Maintain -14 LUFS ±1.5, true peak ≤ -0.5 dBTP |

---

## Adding a New Provider

1. Add a class in [`src/pipeline/providers.js`](src/pipeline/providers.js)
   implementing `chat()`, `synthesize()`, or `generate()` as appropriate.
2. Export it from the factory function (`createLLMProvider` / `createTTSProvider` /
   `createImageProvider`).
3. Add the env var to [`.kiro/config/production-secrets.env.template`](.kiro/config/production-secrets.env.template).
4. Document it in [`AGENT.md`](AGENT.md) Section 4 and in [`README.md`](README.md).
5. Run `node scripts/deep-validate.js` — all checks must pass.

---

## Adding a New MCP Tool

1. Add the tool definition to both:
   - `src/mcp-server/server.js` (HTTP MCP)
   - `src/mcp-server/stdio.js` (stdio MCP)
2. Add a one-line description to `cloudflare-mcp/src/index.js` tool list.
3. Document the tool in [`AGENT.md`](AGENT.md) Section 6.

---

## Pull Request Checklist

- [ ] `node scripts/deep-validate.js` passes with no new failures
- [ ] New env vars added to `.kiro/config/production-secrets.env.template`
- [ ] `AGENT.md` updated with any architectural change
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] No secrets or credentials in any committed file
- [ ] Cross-platform: tested or reasonably portable (Win/Mac/Linux)

---

## Reporting a Bug

Open a GitHub Issue with:
- FrameForge version (`node -e "console.log(require('./package.json').version)"`)
- OS and Node.js version
- Minimal reproduction steps
- Actual vs expected output

For security vulnerabilities, see [SECURITY.md](SECURITY.md).
