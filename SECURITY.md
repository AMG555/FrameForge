# Security Policy

## Supported Versions

| Version | Supported |
|:--- |:---: |
| 2.x (current) | ✅ |
| 1.x | ✅ security fixes only |
| < 1.0 | ❌ |

---

## Reporting a Vulnerability

**Please do not open a public GitHub Issue for security vulnerabilities.**

Report security issues by emailing **amgt503@gmail.com** with:

1. A description of the vulnerability and its potential impact.
2. Steps to reproduce (minimal proof of concept if possible).
3. Affected versions.
4. Any suggested mitigation.

You will receive an acknowledgement within **48 hours** and a resolution
timeline within **7 days**. We will credit you in the release notes unless you
prefer to remain anonymous.

---

## Security Model

### Secrets handling
- All credentials are loaded exclusively from environment variables (`.env`).
- No secrets are committed to git — the `.gitignore` excludes `.env` and all
  `*secrets*` files.
- `src/utils/log-redaction.js` masks known credential patterns (API keys,
  tokens, connection strings, Bearer tokens) from all log output.

### Authentication
- The Cloudflare Workers MCP endpoint requires a `Bearer` token
  (`MCP_AUTH_TOKEN`) on every request.
- The internal render API (`server-render-free.js`) requires
  `INTERNAL_API_TOKEN` on all non-health routes.
- Tokens are compared with `crypto.timingSafeEqual` to prevent timing attacks.

### Shell injection prevention
- All external process calls use `spawnSync(cmd, [args, as, array])` — never
  template string interpolation into shell commands.

### Network
- FFmpeg calls use `-nostdin` to prevent interactive prompts from blocking.
- All outbound HTTP calls (Pollinations, search APIs, webhook endpoints) use
  Node.js `https` with explicit timeouts and no silent redirects beyond 5 hops.

### Cloudflare Workers
- The CF Workers MCP proxy does not store any credentials. `WORKER_API_URL`,
  `MCP_AUTH_TOKEN`, and `INTERNAL_API_TOKEN` are set as Wrangler secrets
  (encrypted at rest by Cloudflare).

---

## Known Limitations

- The LLM fallback in `FactChecker._querySources()` produces synthesized
  sources when no `SEARCH_API_KEY` is set. These are not real citations and
  should not be presented as authoritative without a real search provider.
- Pollinations.ai image requests are unauthenticated — do not include
  private or sensitive content in image prompts.
- `PUBLISH_WEBHOOK_URL` and `REVIEW_NOTIFY_URL` receivers are trusted
  endpoints; ensure they are authenticated on your side before deploying
  to production.
