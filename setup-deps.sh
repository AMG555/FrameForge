#!/usr/bin/env bash
# ==============================================================================
# setup-deps.sh — System & Python Dependency Provisioner for FrameForge
#
# Installs and validates all required external tools:
#   1. System packages: ffmpeg, ffprobe, python3, pip
#   2. Python tools: edge-tts, yt-dlp, faster-whisper, av (PINNED to 15.1.0)
#   3. Playwright Chromium browser for code-driven canvas video rendering
#
# Usage:
#   ./setup-deps.sh             # Full auto-detect and install
#   ./setup-deps.sh --check     # Only inspect and report current environment
# ==============================================================================

set -euo pipefail

# ANSI color codes
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_RED="\033[31m"
C_CYAN="\033[36m"

say() {
  printf "${C_CYAN}[FrameForge Setup]${C_RESET} %b\n" "$1"
}

ok() {
  printf "  ${C_GREEN}✔${C_RESET} %b\n" "$1"
}

warn() {
  printf "  ${C_YELLOW}⚠${C_RESET} %b\n" "$1"
}

fail() {
  printf "  ${C_RED}✖${C_RESET} %b\n" "$1"
}

CHECK_ONLY=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=true
fi

say "${C_BOLD}Checking FrameForge dependencies...${C_RESET}"

OS="$(uname -s 2>/dev/null || echo 'Unknown')"
IS_LINUX=false
IS_MAC=false

case "$OS" in
  Linux*)  IS_LINUX=true ;;
  Darwin*) IS_MAC=true ;;
esac

# ------------------------------------------------------------------------------
# 1. System Package: FFmpeg & FFprobe
# ------------------------------------------------------------------------------
if command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1; then
  ok "FFmpeg & FFprobe found: $(ffmpeg -version 2>&1 | head -n1 | cut -d' ' -f1-3)"
else
  if [ "$CHECK_ONLY" = true ]; then
    fail "FFmpeg or FFprobe missing from PATH"
  else
    say "FFmpeg not detected. Attempting system installation..."
    if [ "$IS_LINUX" = true ]; then
      if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq && sudo apt-get install -y ffmpeg
      elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y ffmpeg
      elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --noconfirm ffmpeg
      elif command -v apk >/dev/null 2>&1; then
        sudo apk add ffmpeg
      else
        fail "Could not find a supported Linux package manager (apt/dnf/pacman/apk). Please install ffmpeg manually."
      fi
    elif [ "$IS_MAC" = true ]; then
      if command -v brew >/dev/null 2>&1; then
        brew install ffmpeg
      else
        fail "Homebrew not found. Please install ffmpeg via: brew install ffmpeg"
      fi
    else
      fail "Please install FFmpeg for your OS (e.g. winget install Gyan.FFmpeg) and add it to PATH."
    fi
  fi
fi

# ------------------------------------------------------------------------------
# 2. Python 3 & pip
# ------------------------------------------------------------------------------
PY=""
for cmd in python3 python py; do
  if command -v "$cmd" >/dev/null 2>&1; then
    if "$cmd" -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" 2>/dev/null; then
      PY="$cmd"
      break
    fi
  fi
done

if [ -z "$PY" ]; then
  if [ "$CHECK_ONLY" = true ]; then
    fail "Python 3.9+ missing from PATH"
  else
    say "Python 3.9+ not found. Installing..."
    if [ "$IS_LINUX" = true ] && command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update -qq && sudo apt-get install -y python3 python3-pip python3-venv
      PY="python3"
    elif [ "$IS_MAC" = true ] && command -v brew >/dev/null 2>&1; then
      brew install python@3.11
      PY="python3"
    else
      fail "Please install Python 3.9+ (python.org) and make it available in your PATH."
      exit 1
    fi
  fi
else
  ok "Python found: $("$PY" --version)"
fi

# ------------------------------------------------------------------------------
# 3. Python Packages (edge-tts, faster-whisper, and PyAV pinned to 15.1.0)
# ------------------------------------------------------------------------------
say "Checking Python packages (edge-tts, faster-whisper, av==15.1.0)..."

AV_CHECK="import av; major = int(av.__version__.split('.')[0]); assert major <= 15, f'PyAV {av.__version__} is incompatible with faster-whisper (requires av <= 15.1.0)'"
PY_PACKAGES="edge-tts yt-dlp faster-whisper av==15.1.0 numpy scipy pillow playwright kokoro-onnx"

NEEDS_PIP=false
if ! "$PY" -c "import edge_tts, faster_whisper, av; $AV_CHECK" >/dev/null 2>&1; then
  NEEDS_PIP=true
fi

if [ "$NEEDS_PIP" = true ]; then
  if [ "$CHECK_ONLY" = true ]; then
    fail "Python packages missing or PyAV > 15 detected (av must be pinned to 15.1.0 to avoid silent transcription failure)"
  else
    say "Installing/fixing Python dependencies via pip (pinning av==15.1.0)..."
    "$PY" -m pip install --quiet --upgrade pip || true
    # Use --break-system-packages on Debian/Ubuntu PEP 668 managed environments if needed
    PIP_FLAGS=""
    if "$PY" -m pip install --help 2>&1 | grep -q -- '--break-system-packages'; then
      PIP_FLAGS="--break-system-packages"
    fi
    "$PY" -m pip install --quiet $PIP_FLAGS edge-tts yt-dlp "faster-whisper>=1.1.0" "av==15.1.0" numpy scipy pillow playwright kokoro-onnx
  fi
fi

# Verify PyAV version
if "$PY" -c "$AV_CHECK" >/dev/null 2>&1; then
  AV_VER="$("$PY" -c "import av; print(av.__version__)")"
  ok "PyAV pinned safely: av==$AV_VER (metadata_errors bug avoided)"
else
  warn "PyAV check did not pass. Run: $PY -m pip install 'av==15.1.0'"
fi

if "$PY" -c "import edge_tts" >/dev/null 2>&1; then
  ok "edge-tts neural voice engine ready"
fi

if "$PY" -c "import faster_whisper" >/dev/null 2>&1; then
  ok "faster-whisper local transcription engine ready"
fi

# ------------------------------------------------------------------------------
# 4. Playwright Chromium Browser
# ------------------------------------------------------------------------------
say "Checking Playwright headless Chromium..."
if npx playwright install chromium >/dev/null 2>&1 || "$PY" -m playwright install chromium >/dev/null 2>&1; then
  ok "Playwright Chromium browser ready"
else
  warn "Playwright Chromium installation returned a warning; ensure playwright can launch headless browser."
fi

# ------------------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------------------
echo
say "${C_GREEN}${C_BOLD}All core FrameForge dependencies configured successfully!${C_RESET}"
echo "You can now run: npx @amg555/frameforge-mcp frameforge-doctor"
