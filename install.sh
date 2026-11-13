#!/usr/bin/env bash
# Install the video-pipeline skill into your Claude/Bob skills folder.
#
#   ./install.sh             copy into ~/.claude/skills  (every project)
#   ./install.sh --project   copy into ./.claude/skills  (this project only)
#   ./install.sh --link      symlink instead of copy (edits to repo are live)
#   ./install.sh --bob       copy into ~/.bob/skills  (IBM Bob global)
#   ./install.sh --deps      also run ./setup-deps.sh to install ffmpeg, whisper & tools
#
# An existing skill with the same name is moved aside to <name>.bak.<ts>.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/plugins/video-pipeline/skills"
DEST="$HOME/.claude/skills"
MODE=copy
RUN_DEPS=false

for a in "$@"; do
  case "$a" in
    --link)    MODE=link ;;
    --project) DEST="$PWD/.claude/skills" ;;
    --bob)     DEST="$HOME/.bob/skills" ;;
    --deps)    RUN_DEPS=true ;;
    -h|--help) sed -n 2,12p "$0"; exit 0 ;;
    *) echo "unknown option: $a"; exit 1 ;;
  esac
done

mkdir -p "$DEST"

for dir in "$SRC"/*; do
  name=$(basename "$dir")
  target="$DEST/$name"
  if [ -e "$target" ] || [ -L "$target" ]; then
    mv "$target" "$target.bak.$(date +%Y%m%d%H%M%S)"
    echo "  moved existing $name aside"
  fi
  if [ "$MODE" = link ]; then
    ln -s "$dir" "$target"
  else
    cp -R "$dir" "$target"
  fi
  echo "  installed $name → $target ($MODE)"
done

if [ "$RUN_DEPS" = true ]; then
  echo
  echo "Running dependency provisioner..."
  bash "$HERE/setup-deps.sh"
fi

echo
echo "Dependencies (must be available in PATH):"
for t in ffmpeg ffprobe node npm; do
  printf "  %-10s %s\n" "$t" "$(command -v "$t" 2>/dev/null || echo 'MISSING — run ./setup-deps.sh')"
done
# edge-tts for free TTS
if command -v edge-tts >/dev/null 2>&1; then
  echo "  edge-tts   $(command -v edge-tts) (free TTS, no key)"
else
  echo "  edge-tts   not found — run ./setup-deps.sh"
fi

echo
echo "To automatically install missing tools (FFmpeg, Whisper, PyAV 15.1.0, Chromium), run:"
echo "  ./setup-deps.sh"

echo
echo "Next steps:"
echo "  1. cp docs/env.template .env"
echo "  2. Edit .env with your API keys (run 'npm run setup' for interactive wizard)"
echo "  3. Deploy Cloudflare Remote MCP (recommended): cd cloudflare-mcp && wrangler deploy"
echo "     OR start local HTTP MCP: node src/mcp-server/server.js"
echo "  4. Register the MCP endpoint in your IDE:"
echo "     Codex / opencode / Cursor / IBM Bob / Claude Code / Windsurf — see README.md"
echo "  5. Restart your IDE to load the skill."
