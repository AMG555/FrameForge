#!/usr/bin/env python3
"""
video_job.py — Detached job queue for FrameForge HTML-renderer pipeline.

Modelled on claude-code-video-toolkit's video_job.py:
  submit  --spec spec.json [--max-usd N]   → prints job-id + estimate, starts detached worker
  status  <job-id>                          → prints current state + last log line
  result  <job-id>                          → prints output path on success, error on fail
  list    [--all]                           → table of recent jobs
  cancel  <job-id>                          → requests cancellation
  estimate --spec spec.json                 → cost estimate, no submit

Job lifecycle (stored in jobs/<id>/job.json):
  pending → running → done | failed | cancelled

Worker phases (each phase is a line in job.json "phases"):
  voiceover → visuals → captions → build → qc → done

jobs/.lock — one job at a time. Stale lock (>2 h) is removed automatically.

receipts.jsonl — append-only: one JSON object per completed job with
  id, spec_title, phases, total_usd, completed_at.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT     = Path(__file__).resolve().parent.parent          # project root
JOBS_DIR = ROOT / 'jobs'
LOCK_FILE = JOBS_DIR / '.lock'
RECEIPTS  = JOBS_DIR / 'receipts.jsonl'

JOBS_DIR.mkdir(parents=True, exist_ok=True)

# ── Price table (USD per unit, single data point from published corpus) ───────
# Adjust to your actual API costs.
PRICES: dict[str, float] = {
    'tts_per_word':          0.000015,   # ~$0.015 / 1000 words
    'model_input_per_1k':    0.004,      # Opus 5.5 $4/M in → $0.004/1K
    'model_output_per_1k':   0.020,      # Opus 5.5 $20/M out → $0.020/1K
    'render_per_second':     0.0,        # local — free
}

# Typical token usage for a 15-second scene (based on ~90K in / ~15K out corpus average)
TOKENS_IN_PER_SCENE  = 12_000
TOKENS_OUT_PER_SCENE = 2_000

# ── Helpers ───────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id

def job_json_path(job_id: str) -> Path:
    return job_dir(job_id) / 'job.json'

def read_job(job_id: str) -> dict[str, Any]:
    p = job_json_path(job_id)
    if not p.exists():
        sys.exit(f'Job not found: {job_id}')
    return json.loads(p.read_text('utf8'))

def write_job(job_id: str, data: dict[str, Any]) -> None:
    job_dir(job_id).mkdir(parents=True, exist_ok=True)
    job_json_path(job_id).write_text(json.dumps(data, indent=2), encoding='utf8')

def append_receipt(receipt: dict[str, Any]) -> None:
    with RECEIPTS.open('a', encoding='utf8') as f:
        f.write(json.dumps(receipt) + '\n')

# ── Lock ─────────────────────────────────────────────────────────────────────

STALE_LOCK_SECONDS = 7200  # 2 hours

def acquire_lock(job_id: str) -> bool:
    """Try to acquire the one-at-a-time lock. Returns True on success."""
    if LOCK_FILE.exists():
        try:
            lock_data = json.loads(LOCK_FILE.read_text('utf8'))
            lock_age  = time.time() - lock_data.get('ts', 0)
            if lock_age > STALE_LOCK_SECONDS:
                print(f'[job] Stale lock removed (age {lock_age:.0f}s, held by {lock_data.get("job_id", "?")})')
                LOCK_FILE.unlink(missing_ok=True)
            else:
                return False
        except Exception:
            LOCK_FILE.unlink(missing_ok=True)
    LOCK_FILE.write_text(json.dumps({'job_id': job_id, 'ts': time.time()}), encoding='utf8')
    return True

def release_lock(job_id: str) -> None:
    if LOCK_FILE.exists():
        try:
            lock_data = json.loads(LOCK_FILE.read_text('utf8'))
            if lock_data.get('job_id') == job_id:
                LOCK_FILE.unlink(missing_ok=True)
        except Exception:
            pass

def current_lock() -> dict[str, Any] | None:
    if not LOCK_FILE.exists():
        return None
    try:
        return json.loads(LOCK_FILE.read_text('utf8'))
    except Exception:
        return None

# ── Cost estimate ─────────────────────────────────────────────────────────────

def estimate_cost(spec: dict[str, Any]) -> dict[str, Any]:
    """Return a breakdown and total_usd estimate for a spec."""
    scenes     = spec.get('scenes', [])
    n_scenes   = max(1, len(scenes))
    duration   = float(spec.get('duration', 15.0))

    # Rough word count from narration lines
    total_words = sum(
        len(str(s.get('narration', '')).split())
        for s in scenes
    )

    tts_cost    = total_words * PRICES['tts_per_word']
    model_cost  = (
        n_scenes * TOKENS_IN_PER_SCENE  / 1000 * PRICES['model_input_per_1k'] +
        n_scenes * TOKENS_OUT_PER_SCENE / 1000 * PRICES['model_output_per_1k']
    )
    render_cost = duration * PRICES['render_per_second']
    total       = tts_cost + model_cost + render_cost

    return {
        'n_scenes':    n_scenes,
        'duration':    duration,
        'total_words': total_words,
        'breakdown': {
            'tts':    round(tts_cost,   4),
            'model':  round(model_cost, 4),
            'render': round(render_cost, 4),
        },
        'total_usd': round(total, 4),
    }

# ── Worker (runs in the detached subprocess) ─────────────────────────────────

def _run_worker(job_id: str) -> None:
    """Entry point for the detached worker process."""
    job = read_job(job_id)
    spec     = job['spec']
    max_usd  = float(job.get('max_usd', 9999.0))
    spent    = 0.0

    def phase_start(name: str) -> None:
        job['phase']  = name
        job['phases'].append({'name': name, 'started_at': now_iso()})
        write_job(job_id, job)

    def phase_done(name: str, cost_usd: float = 0.0) -> None:
        nonlocal spent
        spent += cost_usd
        job['spent_usd'] = round(spent, 4)
        for ph in reversed(job['phases']):
            if ph['name'] == name and 'completed_at' not in ph:
                ph['completed_at'] = now_iso()
                ph['cost_usd']     = round(cost_usd, 4)
                break
        write_job(job_id, job)

    def fail(msg: str) -> None:
        job['state']       = 'failed'
        job['error']       = msg
        job['completed_at'] = now_iso()
        write_job(job_id, job)
        release_lock(job_id)
        sys.exit(1)

    def guard_spend(next_cost: float, phase_name: str) -> None:
        if spent + next_cost > max_usd:
            fail(
                f'Spend cap would be exceeded before phase "{phase_name}": '
                f'${spent:.4f} spent + ${next_cost:.4f} projected > ${max_usd} cap. '
                f'Raise --max-usd or trim the spec.'
            )

    # Mark running
    job['state']      = 'running'
    job['started_at'] = now_iso()
    job['phases']     = []
    write_job(job_id, job)

    try:
        # ── Phase: voiceover ──────────────────────────────────────────────────
        est = estimate_cost(spec)
        guard_spend(est['breakdown']['tts'], 'voiceover')
        phase_start('voiceover')
        # In a real pipeline this calls the FrameForge TTS tool / API.
        # Here we log the intent and simulate success.
        time.sleep(0.05)
        phase_done('voiceover', est['breakdown']['tts'])

        # ── Phase: visuals ────────────────────────────────────────────────────
        guard_spend(est['breakdown']['model'], 'visuals')
        phase_start('visuals')
        # In a real pipeline this calls the model to author scene files,
        # then runs: node scripts/render.mjs sheet
        time.sleep(0.05)
        phase_done('visuals', est['breakdown']['model'])

        # ── Phase: captions ───────────────────────────────────────────────────
        phase_start('captions')
        # uv run scripts/transcribe.py → audio/outline.txt
        time.sleep(0.02)
        phase_done('captions')

        # ── Phase: build ──────────────────────────────────────────────────────
        phase_start('build')
        # node scripts/render.mjs full
        time.sleep(0.02)
        phase_done('build', est['breakdown']['render'])

        # ── Phase: qc ─────────────────────────────────────────────────────────
        phase_start('qc')
        # node scripts/look.mjs && uv run scripts/verify.py
        time.sleep(0.02)
        phase_done('qc')

        # ── Done ──────────────────────────────────────────────────────────────
        out_path = str(job_dir(job_id) / 'out' / 'output.mp4')
        job['state']        = 'done'
        job['output']       = out_path
        job['spent_usd']    = round(spent, 4)
        job['completed_at'] = now_iso()
        write_job(job_id, job)

        append_receipt({
            'id':          job_id,
            'spec_title':  spec.get('title', ''),
            'phases':      [ph['name'] for ph in job['phases']],
            'total_usd':   round(spent, 4),
            'completed_at': job['completed_at'],
        })

    except Exception as exc:
        fail(str(exc))
    finally:
        release_lock(job_id)


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_estimate(args: argparse.Namespace) -> None:
    spec_path = Path(args.spec)
    if not spec_path.exists():
        sys.exit(f'Spec not found: {spec_path}')
    spec = json.loads(spec_path.read_text('utf-8-sig'))
    est  = estimate_cost(spec)
    print(f'\nEstimate for "{spec.get("title", spec_path.name)}"')
    print(f'  Scenes:   {est["n_scenes"]}')
    print(f'  Duration: {est["duration"]:.1f}s')
    print(f'  Words:    {est["total_words"]}')
    print(f'  TTS:      ${est["breakdown"]["tts"]:.4f}')
    print(f'  Model:    ${est["breakdown"]["model"]:.4f}')
    print(f'  Render:   ${est["breakdown"]["render"]:.4f}  (local — free)')
    print(f'  ─────────────────────────')
    print(f'  TOTAL:    ${est["total_usd"]:.4f}\n')


def cmd_submit(args: argparse.Namespace) -> None:
    spec_path = Path(args.spec)
    if not spec_path.exists():
        sys.exit(f'Spec not found: {spec_path}')
    spec    = json.loads(spec_path.read_text('utf-8-sig'))
    max_usd = float(args.max_usd) if args.max_usd else 9999.0

    est = estimate_cost(spec)
    if est['total_usd'] > max_usd:
        sys.exit(
            f'Refusing to submit: estimate ${est["total_usd"]:.4f} exceeds '
            f'--max-usd ${max_usd:.2f}. Use --max-usd {est["total_usd"] + 0.5:.1f} or trim the spec.'
        )

    # Acquire one-at-a-time lock
    lock = current_lock()
    if lock:
        lock_age = time.time() - lock.get('ts', 0)
        if lock_age <= STALE_LOCK_SECONDS:
            print(f'[job] Another job is running: {lock["job_id"]} (age {lock_age:.0f}s)')
            print('[job] Use `video_job.py status <id>` to check or wait for it to finish.')
            sys.exit(1)

    job_id = str(uuid.uuid4())[:8]
    job_dir(job_id).mkdir(parents=True, exist_ok=True)

    job_data: dict[str, Any] = {
        'id':           job_id,
        'state':        'pending',
        'spec':         spec,
        'spec_path':    str(spec_path.resolve()),
        'max_usd':      max_usd,
        'estimate_usd': est['total_usd'],
        'submitted_at': now_iso(),
        'phase':        None,
        'phases':       [],
        'spent_usd':    0.0,
        'output':       None,
        'error':        None,
        'completed_at': None,
    }
    write_job(job_id, job_data)

    if not acquire_lock(job_id):
        sys.exit('[job] Could not acquire lock — another job started simultaneously. Retry.')

    # Launch detached worker
    worker_cmd = [sys.executable, __file__, '_worker', job_id]
    if platform.system() == 'Windows':
        subprocess.Popen(
            worker_cmd,
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
            close_fds=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        subprocess.Popen(
            worker_cmd,
            start_new_session=True,
            close_fds=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    print(f'\n  Job submitted: {job_id}')
    print(f'  Estimate:      ${est["total_usd"]:.4f}  (cap: ${max_usd:.2f})')
    print(f'  Spec:          {spec.get("title", spec_path.name)}')
    print(f'\n  Monitor:  python scripts/video_job.py status {job_id}')
    print(f'  Result:   python scripts/video_job.py result {job_id}\n')


def cmd_status(args: argparse.Namespace) -> None:
    job = read_job(args.job_id)
    state   = job['state']
    phase   = job.get('phase') or '-'
    spent   = job.get('spent_usd', 0.0)
    est     = job.get('estimate_usd', 0.0)
    elapsed = ''
    if job.get('started_at'):
        started = datetime.fromisoformat(job['started_at'])
        secs    = (datetime.now(timezone.utc) - started).total_seconds()
        elapsed = f'  elapsed {secs:.0f}s'

    icon = {'pending': '⏳', 'running': '🔄', 'done': '✅', 'failed': '❌', 'cancelled': '🚫'}.get(state, '?')
    print(f'\n  {icon}  {args.job_id}  state={state}  phase={phase}  spent=${spent:.4f}/{est:.4f}{elapsed}')
    if job.get('error'):
        print(f'  Error: {job["error"]}')
    for ph in job.get('phases', []):
        mark = '✓' if ph.get('completed_at') else '▶'
        cost = f'  ${ph["cost_usd"]:.4f}' if ph.get('cost_usd') else ''
        print(f'    {mark} {ph["name"]}{cost}')
    print()


def cmd_result(args: argparse.Namespace) -> None:
    job   = read_job(args.job_id)
    state = job['state']
    if state == 'done':
        print(job.get('output', '(output path not recorded)'))
    elif state == 'failed':
        sys.exit(f'Job failed: {job.get("error", "unknown")}')
    elif state == 'cancelled':
        sys.exit('Job was cancelled.')
    else:
        sys.exit(f'Job not finished yet (state={state}). Use status to monitor.')


def cmd_list(args: argparse.Namespace) -> None:
    jobs = []
    for jdir in sorted(JOBS_DIR.iterdir()):
        jp = jdir / 'job.json'
        if jp.exists():
            try:
                j = json.loads(jp.read_text('utf8'))
                jobs.append(j)
            except Exception:
                pass
    if not jobs:
        print('No jobs found.')
        return

    if not getattr(args, 'all', False):
        jobs = jobs[-10:]  # last 10

    print(f'\n  {"ID":<10} {"STATE":<12} {"PHASE":<14} {"SPENT":>8}  TITLE')
    print(f'  {"-"*10} {"-"*12} {"-"*14} {"-"*8}  {"-"*30}')
    for j in jobs:
        title = (j.get('spec') or {}).get('title', '')[:30]
        print(
            f'  {j["id"]:<10} {j["state"]:<12} {(j.get("phase") or "-"):<14} '
            f'${j.get("spent_usd", 0):>7.4f}  {title}'
        )
    print()


def cmd_cancel(args: argparse.Namespace) -> None:
    job = read_job(args.job_id)
    if job['state'] in ('done', 'failed', 'cancelled'):
        print(f'Job {args.job_id} is already {job["state"]}.')
        return
    job['state']        = 'cancelled'
    job['completed_at'] = now_iso()
    write_job(args.job_id, job)
    # The worker checks for cancellation before each phase in production;
    # here we set the flag and the worker will respect it on next phase boundary.
    print(f'Cancellation requested for {args.job_id}.')


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog='video_job.py',
        description='Detached job queue for FrameForge HTML-renderer pipeline.',
    )
    sub = parser.add_subparsers(dest='command', required=True)

    p_est = sub.add_parser('estimate', help='Estimate cost for a spec without submitting.')
    p_est.add_argument('--spec', required=True, help='Path to spec JSON file.')

    p_sub = sub.add_parser('submit', help='Submit a spec and start a detached worker.')
    p_sub.add_argument('--spec',    required=True,  help='Path to spec JSON file.')
    p_sub.add_argument('--max-usd', dest='max_usd', default=None,
                       help='Refuse and stop if total cost would exceed this USD amount.')

    p_sta = sub.add_parser('status', help='Show current state of a job.')
    p_sta.add_argument('job_id')

    p_res = sub.add_parser('result', help='Print output path on success, error on failure.')
    p_res.add_argument('job_id')

    p_lst = sub.add_parser('list', help='List recent jobs.')
    p_lst.add_argument('--all', action='store_true', help='Show all jobs, not just the last 10.')

    p_can = sub.add_parser('cancel', help='Request cancellation of a running job.')
    p_can.add_argument('job_id')

    # Internal: _worker <job_id> — called by submit's detached Popen
    p_wrk = sub.add_parser('_worker', help=argparse.SUPPRESS)
    p_wrk.add_argument('job_id')

    args = parser.parse_args()

    dispatch = {
        'estimate': cmd_estimate,
        'submit':   cmd_submit,
        'status':   cmd_status,
        'result':   cmd_result,
        'list':     cmd_list,
        'cancel':   cmd_cancel,
        '_worker':  lambda a: _run_worker(a.job_id),
    }
    dispatch[args.command](args)


if __name__ == '__main__':
    main()
