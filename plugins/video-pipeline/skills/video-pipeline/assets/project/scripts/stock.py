#!/usr/bin/env python3
"""
scripts/stock.py — Stock footage and image downloader for FrameForge HTML renderer

Downloads royalty-free stock media from Pexels (free API) for use as b-roll
or background footage in HTML compositor projects.

Usage:
  uv run scripts/stock.py video "ancient cooking fire"
  uv run scripts/stock.py video "city skyline timelapse" --portrait
  uv run scripts/stock.py image "forest foggy morning"
  uv run scripts/stock.py image "code screen dark" --count 3
  python scripts/stock.py video "space nebula"

  # Limit to specific resolution
  uv run scripts/stock.py video "ocean waves" --hd

Output:
  assets/stock_<query_slug>_1.mp4  (video)
  assets/stock_<query_slug>_1.jpg  (image)

Requirements:
  pip install requests  (usually pre-installed with uv)
  PEXELS_API_KEY in .env or PEXELS_API_KEY env var
    → Free key: https://www.pexels.com/api/  (no credit card required)

If no API key is present, falls back to Pollinations AI image generation
(always free, no account) for images, and skips video download with a warning.
"""

import sys
import os
import re
import argparse
import json
import urllib.request
import urllib.parse
import urllib.error


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:40]


def load_env(root):
    """Load PEXELS_API_KEY from .env in the FrameForge root."""
    env_file = os.path.join(root, ".env")
    if not os.path.exists(env_file):
        return
    with open(env_file, encoding="utf-8") as f:
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            eq = stripped.find("=")
            if eq < 1:
                continue
            key = stripped[:eq].strip()
            val = stripped[eq + 1:].strip().strip("\"'")
            if key and val and key not in os.environ:
                os.environ[key] = val


def pexels_search_video(query, orientation="landscape", count=1, hd=False):
    """Search Pexels for videos. Returns list of download URLs."""
    api_key = os.environ.get("PEXELS_API_KEY", "")
    if not api_key:
        return []

    params = urllib.parse.urlencode({
        "query":       query,
        "orientation": orientation,
        "size":        "large" if hd else "medium",
        "per_page":    count,
    })
    url = f"https://api.pexels.com/videos/search?{params}"
    req = urllib.request.Request(url, headers={"Authorization": api_key})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"[stock] Pexels API error: {e}", file=sys.stderr)
        return []

    results = []
    for video in data.get("videos", [])[:count]:
        files = video.get("video_files", [])
        # Pick the best quality file that isn't too huge (prefer 1080p or 720p)
        ranked = sorted(
            [f for f in files if f.get("file_type") == "video/mp4"],
            key=lambda f: abs(f.get("height", 0) - (1080 if hd else 720)),
        )
        if ranked:
            results.append(ranked[0]["link"])
    return results


def pexels_search_image(query, orientation="landscape", count=1, hd=False):
    """Search Pexels for images. Returns list of download URLs."""
    api_key = os.environ.get("PEXELS_API_KEY", "")
    if not api_key:
        return []

    params = urllib.parse.urlencode({
        "query":       query,
        "orientation": orientation,
        "size":        "large" if hd else "medium",
        "per_page":    count,
    })
    url = f"https://api.pexels.com/v1/search?{params}"
    req = urllib.request.Request(url, headers={"Authorization": api_key})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"[stock] Pexels API error: {e}", file=sys.stderr)
        return []

    return [
        photo.get("src", {}).get("large2x" if hd else "large", "")
        for photo in data.get("photos", [])[:count]
        if photo.get("src")
    ]


def pollinations_image(query, width=1920, height=1080):
    """Generate an image via Pollinations (free fallback, no API key needed)."""
    encoded = urllib.parse.quote(query[:500])
    return f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&model=flux&nologo=true"


def download_file(url, dest_path, label=""):
    """Download a URL to dest_path with progress reporting."""
    print(f"[stock] Downloading{' ' + label if label else ''}: {url[:80]}…")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FrameForge/2.3"})
        with urllib.request.urlopen(req, timeout=60) as resp, open(dest_path, "wb") as f:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    pct = downloaded / total * 100
                    sys.stdout.write(f"\r  {pct:.0f}% ({downloaded // 1024} KB)")
                    sys.stdout.flush()
        sys.stdout.write("\n")
        return True
    except Exception as e:
        print(f"\n[stock] Download failed: {e}", file=sys.stderr)
        if os.path.exists(dest_path):
            os.unlink(dest_path)
        return False


def main():
    parser = argparse.ArgumentParser(description="Download stock media for FrameForge HTML renderer")
    parser.add_argument("media_type",  choices=["video", "image"], help="video or image")
    parser.add_argument("query",       help="Search query, e.g. 'ancient cooking fire'")
    parser.add_argument("--portrait",  action="store_true", help="Portrait orientation (9:16)")
    parser.add_argument("--count",     type=int, default=1, help="Number of results (default: 1)")
    parser.add_argument("--hd",        action="store_true", help="Prefer higher resolution (1080p/large)")
    parser.add_argument("--out",       default=None, help="Output directory (default: assets/)")
    args = parser.parse_args()

    root      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_env(root)
    out_dir   = args.out or os.path.join(root, "assets")
    os.makedirs(out_dir, exist_ok=True)

    orientation = "portrait" if args.portrait else "landscape"
    slug        = slugify(args.query)
    api_key     = os.environ.get("PEXELS_API_KEY", "")

    if not api_key:
        print(
            "[stock] PEXELS_API_KEY not set. Free key at: https://www.pexels.com/api/\n"
            "  Add to .env: PEXELS_API_KEY=your_key\n"
        )

    # ── Video ─────────────────────────────────────────────────────────────────
    if args.media_type == "video":
        urls = pexels_search_video(args.query, orientation, args.count, args.hd)
        if not urls:
            print(
                "[stock] No video results (missing PEXELS_API_KEY or no matches).\n"
                "  Tip: images are available via Pollinations (free, no key):\n"
                f"  uv run scripts/stock.py image \"{args.query}\""
            )
            sys.exit(1)

        for i, url in enumerate(urls, 1):
            ext  = ".mp4"
            dest = os.path.join(out_dir, f"stock_{slug}_{i}{ext}")
            if download_file(url, dest, f"video {i}/{len(urls)}"):
                size = os.path.getsize(dest)
                print(f"[stock] ✅  {dest} ({size // 1024 // 1024:.1f} MB)")
                print(f"[stock] Use in edit.js:\n  layer('bg').on(t => ({{ position:'absolute', inset:0, background:'url(assets/stock_{slug}_{i}.mp4)', backgroundSize:'cover' }}));")

    # ── Image ─────────────────────────────────────────────────────────────────
    elif args.media_type == "image":
        w = 1080 if args.portrait else 1920
        h = 1920 if args.portrait else 1080

        if api_key:
            urls = pexels_search_image(args.query, orientation, args.count, args.hd)
        else:
            # Pollinations fallback: one image per count
            urls = [pollinations_image(f"{args.query}, {orientation}", w, h) for _ in range(args.count)]
            source = "Pollinations (free)"
            print(f"[stock] Using {source} (no Pexels key) — generating AI image…")

        if not urls:
            print("[stock] No results found.")
            sys.exit(1)

        for i, url in enumerate(urls, 1):
            dest = os.path.join(out_dir, f"stock_{slug}_{i}.jpg")
            if download_file(url, dest, f"image {i}/{len(urls)}"):
                size = os.path.getsize(dest)
                print(f"[stock] ✅  {dest} ({size // 1024:.0f} KB)")
                print(f"[stock] Use in edit.js:\n  at(T, imageCard('assets/stock_{slug}_{i}.jpg', {{ width: {w}, height: {h} }}));")


if __name__ == "__main__":
    main()
