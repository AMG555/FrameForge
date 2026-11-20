#!/usr/bin/env python3
"""Chat velocity and reaction spike scorer for live streams.

Parses YouTube live chat JSON / JSONL / subtitles or Twitch IRC logs,
computes message velocity in time buckets, identifies reaction bursts (3x baseline),
and extracts top keyword/emoji clusters (e.g. LMAO, LOL, W, POG, 💀, 🔥).

Can be used standalone from CLI:
    python chat_velocity.py input_chat.json --bucket-sec 10 --spike-multiplier 2.5
"""

import argparse
import json
import math
import os
import re
import sys
from collections import Counter
from pathlib import Path

REACTION_KEYWORDS = [
    "lol", "lmao", "lmfao", "rofl", "kekw", "kek", "pog", "poggers", "pogchamp",
    "omg", "omfg", "wtf", "wtfff", "w", "l", "gg", "wtf", "no way", "sheesh",
    "bruh", "based", "cringe", "goat", "clutch", "choke", "dead", "rip",
    "skull", "fire", "hype", "cap", "nocap", "holy", "monkas", "pepehands"
]

EMOJI_PATTERN = re.compile(r"[\U00010000-\U0010ffff]", flags=re.UNICODE)


def parse_chat_messages(file_path):
    """Extract list of {time_sec, message_text} from YouTube or Twitch chat file."""
    messages = []
    path = Path(file_path)
    if not path.exists():
        return messages

    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            line_str = line.strip()
            if not line_str:
                continue
            # Try YouTube live_chat JSON Lines format
            try:
                data = json.loads(line_str)
                # YouTube format 1: replayChatItemAction
                action = data.get("replayChatItemAction") or data
                actions = action.get("actions") or []
                offset_ms = int(action.get("videoOffsetTimeMsec", 0))
                time_sec = offset_ms / 1000.0

                for act in actions:
                    item = act.get("addChatItemAction", {}).get("item", {})
                    renderer = (item.get("liveChatTextMessageRenderer") or
                                item.get("liveChatPaidMessageRenderer") or {})
                    text_parts = renderer.get("message", {}).get("runs", [])
                    text = "".join(p.get("text", "") for p in text_parts)
                    if text:
                        messages.append({"time_sec": time_sec, "text": text})
                continue
            except (json.JSONDecodeError, ValueError, TypeError):
                pass

            # Try simple IRC / Twitch format: [HH:MM:SS] <user> message
            m = re.match(r"^\[?(\d{1,2}):(\d{2}):(\d{2})\]?\s*(?:<[^>]+>|[^:]+:)\s*(.*)$", line_str)
            if m:
                hrs, mins, secs, text = m.groups()
                t_sec = int(hrs) * 3600 + int(mins) * 60 + int(secs)
                messages.append({"time_sec": float(t_sec), "text": text.strip()})

    return sorted(messages, key=lambda x: x["time_sec"])


def score_chat_velocity(messages, bucket_sec=10, spike_mult=2.5, min_count=5):
    """Compute messages per bucket, rolling baseline, and detect spike moments."""
    if not messages:
        return {
            "total_messages": 0,
            "max_velocity_mps": 0.0,
            "mean_velocity_mps": 0.0,
            "spikes": [],
            "buckets": []
        }

    max_time = max(m["time_sec"] for m in messages)
    num_buckets = int(math.ceil(max_time / bucket_sec)) + 1
    counts = [0] * num_buckets
    texts_per_bucket = [[] for _ in range(num_buckets)]

    for m in messages:
        b = int(m["time_sec"] // bucket_sec)
        if b < num_buckets:
            counts[b] += 1
            texts_per_bucket[b].append(m["text"])

    # Compute rolling baseline (window of ~90s = 9 buckets)
    half_window = 4
    baselines = [0.0] * num_buckets
    for i in range(num_buckets):
        window_counts = counts[max(0, i - half_window): min(num_buckets, i + half_window + 1)]
        sorted_w = sorted(window_counts)
        # 60th percentile as robust baseline
        idx = int(len(sorted_w) * 0.6)
        baselines[i] = max(1.0, float(sorted_w[idx]))

    spikes = []
    for i in range(num_buckets):
        count = counts[i]
        base = baselines[i]
        ratio = count / base
        if ratio >= spike_mult and count >= min_count:
            start_sec = i * bucket_sec
            end_sec = (i + 1) * bucket_sec

            # Analyze keywords in spike bucket
            all_text = " ".join(texts_per_bucket[i]).lower()
            words = re.findall(r"\b\w+\b", all_text)
            kw_counts = Counter()
            for w in words:
                if w in REACTION_KEYWORDS or len(w) <= 3:
                    kw_counts[w] += 1
            emojis = EMOJI_PATTERN.findall(all_text)
            for e in emojis:
                kw_counts[e] += 1

            top_kw = [k for k, _ in kw_counts.most_common(5)]
            spikes.append({
                "bucket_index": i,
                "start_sec": start_sec,
                "end_sec": end_sec,
                "message_count": count,
                "velocity_mps": round(count / bucket_sec, 2),
                "spike_ratio": round(ratio, 2),
                "top_reactions": top_kw
            })

    # Merge adjacent spikes
    merged_spikes = []
    for sp in spikes:
        if merged_spikes and sp["start_sec"] <= merged_spikes[-1]["end_sec"] + bucket_sec:
            prev = merged_spikes[-1]
            prev["end_sec"] = sp["end_sec"]
            prev["message_count"] += sp["message_count"]
            prev["velocity_mps"] = max(prev["velocity_mps"], sp["velocity_mps"])
            prev["spike_ratio"] = max(prev["spike_ratio"], sp["spike_ratio"])
            prev["top_reactions"] = list(dict.fromkeys(prev["top_reactions"] + sp["top_reactions"]))[:7]
        else:
            merged_spikes.append(sp)

    mps_vals = [c / bucket_sec for c in counts if c > 0]
    return {
        "total_messages": len(messages),
        "duration_sec": round(max_time, 1),
        "max_velocity_mps": round(max(counts) / bucket_sec, 2) if counts else 0.0,
        "mean_velocity_mps": round(sum(mps_vals) / len(mps_vals), 2) if mps_vals else 0.0,
        "spikes": merged_spikes,
        "bucket_sec": bucket_sec
    }


def main():
    parser = argparse.ArgumentParser(description="Analyze chat velocity and extract reaction spikes.")
    parser.add_argument("input_file", help="Path to live chat JSON, JSONL, or IRC log")
    parser.add_argument("--bucket-sec", type=int, default=10, help="Bucket size in seconds (default: 10)")
    parser.add_argument("--spike-multiplier", type=float, default=2.5, help="Multiplier over baseline to count as spike")
    parser.add_argument("--out", help="Optional output JSON path")

    args = parser.parse_args()
    msgs = parse_chat_messages(args.input_file)
    result = score_chat_velocity(msgs, bucket_sec=args.bucket_sec, spike_mult=args.spike_multiplier)

    out_json = json.dumps(result, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out_json)
        print(f"Results written to {args.out}")
    else:
        print(out_json)


if __name__ == "__main__":
    main()
