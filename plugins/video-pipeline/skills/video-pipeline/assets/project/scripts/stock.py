#!/usr/bin/env python3
"""
stock.py — Pexels stock footage/image downloader for FrameForge HTML renderer.

Downloads free stock footage or images from Pexels and saves them to assets/.
Falls back to Pollinations AI image generation (no API key) for images when
no Pexels API key is configured.

Usage:
  uv run scripts/stock.py video "ancient cooking fire"      # download video
  uv run scripts/stock.py image "satellite orbiting earth"  # download image
  uv run scripts/stock.py video "ocean waves" --portrait    # vertical video
  uv run scripts/stock.py image "neural network" --ai       # force AI generation

Environment:
  PEXELS_API_KEY   — optional; get free at https://www.pexels.com/api/
                     Without it, video falls back to search stub; image uses Pollinations.

Output:
  assets/<slug>.mp4 or assets/<slug>.jpg
"""
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "requests>=2.28",
# ]
# ///

import sys
import os
import re
import json
import time
import pathlib
import argparse
import hashlib
import urllib.request
import urllib.parse
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────

ROOT       = pathlib.Path(__file__).parent.parent
ASSETS_DIR = ROOT / "assets"

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
PEXELS_VIDEO_URL = "https://api.pexels.com/videos/search"
PEXELS_IMAGE_URL = "https://api.pexels.com/v1/search"
POLLINATIONS_URL = "https://image.pollinations.ai/prompt/{prompt}?width={w}&height={h}&nologo=true&seed={seed}"

# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:40]


def download(url: str, dest: pathlib.Path, label: str = "") -> bool:
    """Download a URL to dest. Returns True on success."""
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": "FrameForgeBot/1.0"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp, open(dest, "wb") as f:
            total = int(resp.headers.get("Content-Length", 0))
            done  = 0
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                done += len(chunk)
                if total > 0:
                    pct = done * 100 // total
                    print(f"\r  {label}: {pct}%", end="", flush=True)
        print(f"\r  {label}: done ({done//1024}KB)" + " " * 10)
        return True
    except Exception as e:
        print(f"\n  ⚠  Download failed: {e}")
        return False


def pexels_request(url: str, params: dict) -> dict:
    """Make a Pexels API request."""
    qs     = urllib.parse.urlencode(params)
    full   = f"{url}?{qs}"
    req    = urllib.request.Request(full, headers={"Authorization": PEXELS_API_KEY})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


# ── Video download ────────────────────────────────────────────────────────────

def download_video(query: str, portrait: bool = False, page: int = 1) -> bool:
    slug     = slugify(query)
    out_path = ASSETS_DIR / f"{slug}.mp4"

    print(f"[stock] Searching Pexels videos: '{query}'")

    if not PEXELS_API_KEY:
        print("[stock] No PEXELS_API_KEY set.")
        print("  Get a free key at: https://www.pexels.com/api/")
        print(f"  Then run: PEXELS_API_KEY=<key> uv run scripts/stock.py video '{query}'")

        # Create a placeholder
        placeholder = {
            "source": "pexels",
            "query": query,
            "note": "Set PEXELS_API_KEY to download real footage",
        }
        placeholder_path = ASSETS_DIR / f"{slug}.json"
        ASSETS_DIR.mkdir(parents=True, exist_ok=True)
        with open(placeholder_path, "w") as f:
            json.dump(placeholder, f, indent=2)
        print(f"  Placeholder: {placeholder_path}")
        return False

    orientation = "portrait" if portrait else "landscape"
    data = pexels_request(PEXELS_VIDEO_URL, {
        "query":       query,
        "per_page":    5,
        "page":        page,
        "orientation": orientation,
        "min_duration": 3,
        "max_duration": 30,
    })

    videos = data.get("videos", [])
    if not videos:
        print(f"[stock] No videos found for '{query}'")
        return False

    # Pick the best resolution available (prefer HD/FHD)
    best_url  = None
    best_res  = 0

    for video in videos[:3]:
        for vf in video.get("video_files", []):
            w = vf.get("width", 0)
            h = vf.get("height", 0)
            res = w * h
            if res > best_res:
                best_res  = res
                best_url  = vf.get("link")

    if not best_url:
        print("[stock] No downloadable video files found")
        return False

    print(f"[stock] Found: {best_res // (1920 * 1080) or best_res // (1280 * 720) or 1}×  {best_url[:80]}…")
    ok = download(best_url, out_path, slug)
    if ok:
        print(f"[stock] ✅  {out_path}")
        print(f"         Use in edit.js: at(T, imageCard('assets/{slug}.mp4', {{ width: 1920, height: 1080 }}))")
    return ok


# ── Image download ────────────────────────────────────────────────────────────

def download_image(query: str, portrait: bool = False, force_ai: bool = False, w: int = 1920, h: int = 1080) -> bool:
    slug     = slugify(query)
    out_path = ASSETS_DIR / f"{slug}.jpg"

    if portrait:
        w, h = 1080, 1920

    if force_ai or not PEXELS_API_KEY:
        return download_ai_image(query, out_path, w, h, slug)

    # Try Pexels first
    print(f"[stock] Searching Pexels images: '{query}'")
    try:
        orientation = "portrait" if portrait else "landscape"
        data  = pexels_request(PEXELS_IMAGE_URL, {
            "query":       query,
            "per_page":    5,
            "orientation": orientation,
        })
        photos = data.get("photos", [])
        if photos:
            img_url = photos[0]["src"].get("original") or photos[0]["src"].get("large2x")
            ok = download(img_url, out_path, slug)
            if ok:
                print(f"[stock] ✅  {out_path}")
                return True
    except Exception as e:
        print(f"[stock] Pexels error: {e} — falling back to AI generation")

    return download_ai_image(query, out_path, w, h, slug)


def download_ai_image(query: str, out_path: pathlib.Path, w: int, h: int, slug: str) -> bool:
    """Generate an image via Pollinations (free, no API key)."""
    print(f"[stock] Generating AI image via Pollinations: '{query}'")
    seed  = int(hashlib.md5(query.encode()).hexdigest()[:8], 16) % 1000000
    url   = POLLINATIONS_URL.format(
        prompt=urllib.parse.quote(query),
        w=w, h=h, seed=seed,
    )
    ok = download(url, out_path, slug)
    if ok:
        print(f"[stock] ✅  {out_path}")
        print(f"         Use in edit.js: at(T, imageCard('assets/{slug}.jpg', {{ width: {w}, height: {h} }}))")
    return ok


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="Download stock footage or images for FrameForge")
    p.add_argument("type",    choices=["video", "image"], help="Asset type")
    p.add_argument("query",   help="Search query or image description")
    p.add_argument("--portrait", action="store_true", help="Portrait/vertical orientation")
    p.add_argument("--ai",       action="store_true", help="Force AI image generation")
    p.add_argument("--width",    type=int, default=1920, help="Image width (default 1920)")
    p.add_argument("--height",   type=int, default=1080, help="Image height (default 1080)")
    p.add_argument("--page",     type=int, default=1,    help="Pexels results page (default 1)")
    args = p.parse_args()

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    if args.type == "video":
        ok = download_video(args.query, portrait=args.portrait, page=args.page)
    else:
        ok = download_image(
            args.query,
            portrait=args.portrait,
            force_ai=args.ai,
            w=args.width,
            h=args.height,
        )

    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
