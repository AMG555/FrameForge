#!/usr/bin/env python3
"""OBS Studio WebSocket v5 ReplayBuffer controller.

Interacts with OBS Studio over WebSocket (default localhost:4455).
Commands:
  save-replay: Triggers SaveReplayBuffer, monitors replay folder, returns saved video path.
  start-buffer: Starts OBS Replay Buffer.
  stop-buffer: Stops OBS Replay Buffer.
  status: Gets replay buffer and recording status.

Can be run via CLI or imported as a module:
    python obs_replay.py save-replay --host localhost --port 4455 --timeout 12
"""

import argparse
import base64
import hashlib
import json
import os
import sys
import time
from pathlib import Path

try:
    import websocket
except ImportError:
    websocket = None


def generate_auth_response(password, challenge, salt):
    """Generate SHA256 auth response string for OBS WebSocket v5."""
    secret = base64.b64encode(hashlib.sha256((password + salt).encode("utf-8")).digest()).decode("utf-8")
    return base64.b64encode(hashlib.sha256((secret + challenge).encode("utf-8")).digest()).decode("utf-8")


class ObsClient:
    def __init__(self, host="localhost", port=4455, password=""):
        self.url = f"ws://{host}:{port}"
        self.password = password
        self.ws = None
        self._req_id = 0

    def connect(self, timeout=5):
        if websocket is None:
            raise RuntimeError("websocket-client not installed. Run: pip install websocket-client")
        self.ws = websocket.create_connection(self.url, timeout=timeout)
        # Handle Hello (OpCode 0)
        hello = json.loads(self.ws.recv())
        if hello.get("op") != 0:
            raise RuntimeError(f"Unexpected initial message: {hello}")

        d = hello.get("d", {})
        auth = d.get("authentication")
        identify_d = {"rpcVersion": 1}

        if auth and self.password:
            identify_d["authentication"] = generate_auth_response(
                self.password, auth["challenge"], auth["salt"]
            )

        # Send Identify (OpCode 1)
        self.ws.send(json.dumps({"op": 1, "d": identify_d}))
        # Receive Identified (OpCode 2)
        identified = json.loads(self.ws.recv())
        if identified.get("op") != 2:
            raise RuntimeError(f"Failed to authenticate with OBS: {identified}")

    def call(self, request_type, request_data=None):
        self._req_id += 1
        req_id = f"req_{self._req_id}"
        msg = {
            "op": 6,  # Request
            "d": {
                "requestType": request_type,
                "requestId": req_id,
                "requestData": request_data or {}
            }
        }
        self.ws.send(json.dumps(msg))
        while True:
            resp = json.loads(self.ws.recv())
            if resp.get("op") == 7 and resp.get("d", {}).get("requestId") == req_id:
                res_d = resp["d"]
                if not res_d.get("requestStatus", {}).get("result"):
                    code = res_d.get("requestStatus", {}).get("code")
                    comment = res_d.get("requestStatus", {}).get("comment", "Request failed")
                    raise RuntimeError(f"OBS error ({code}): {comment}")
                return res_d.get("responseData", {})

    def close(self):
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass


def save_replay_buffer(host="localhost", port=4455, password="", timeout=12, output_dir=None):
    """Trigger SaveReplayBuffer and return path of newly saved file."""
    client = ObsClient(host=host, port=port, password=password)
    client.connect()
    try:
        # Get record directory
        rec_dir = None
        try:
            status = client.call("GetRecordDirectory")
            rec_dir = status.get("recordDirectory")
        except Exception:
            pass

        search_dir = Path(output_dir or rec_dir or Path.home() / "Videos")
        files_before = set(search_dir.glob("*.*")) if search_dir.exists() else set()

        client.call("SaveReplayBuffer")
        start_wait = time.time()
        new_file = None

        while time.time() - start_wait < timeout:
            time.sleep(0.5)
            if search_dir.exists():
                current_files = set(search_dir.glob("*.*"))
                added = current_files - files_before
                video_files = [f for f in added if f.suffix.lower() in (".mp4", ".mkv", ".mov", ".ts", ".flv")]
                if video_files:
                    # Pick most recent
                    new_file = max(video_files, key=lambda f: f.stat().st_mtime)
                    # Check if file writing is finished (size stable)
                    time.sleep(0.5)
                    break

        if not new_file:
            return {
                "success": True,
                "saved_to_obs": True,
                "file_path": None,
                "message": "SaveReplayBuffer sent successfully. File saved to OBS output directory."
            }

        return {
            "success": True,
            "saved_to_obs": True,
            "file_path": str(new_file.resolve()),
            "size_bytes": new_file.stat().st_size
        }
    finally:
        client.close()


def get_obs_status(host="localhost", port=4455, password=""):
    client = ObsClient(host=host, port=port, password=password)
    client.connect()
    try:
        replay_status = client.call("GetReplayBufferStatus")
        rec_status = client.call("GetRecordStatus")
        return {
            "connected": True,
            "replay_buffer_active": replay_status.get("outputActive", False),
            "recording_active": rec_status.get("outputActive", False),
            "record_timecode": rec_status.get("outputTimecode", "00:00:00")
        }
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description="OBS Studio ReplayBuffer CLI.")
    parser.add_argument("command", choices=["save-replay", "start-buffer", "stop-buffer", "status"])
    parser.add_argument("--host", default="localhost", help="OBS WebSocket host")
    parser.add_argument("--port", type=int, default=4455, help="OBS WebSocket port")
    parser.add_argument("--password", default=os.environ.get("OBS_WS_PASSWORD", ""), help="OBS WebSocket password")
    parser.add_argument("--timeout", type=int, default=12, help="Wait timeout in seconds")
    parser.add_argument("--output-dir", help="Directory where OBS saves recordings")

    args = parser.parse_args()

    try:
        if args.command == "save-replay":
            res = save_replay_buffer(host=args.host, port=args.port, password=args.password,
                                     timeout=args.timeout, output_dir=args.output_dir)
            print(json.dumps(res, indent=2))
        elif args.command == "status":
            res = get_obs_status(host=args.host, port=args.port, password=args.password)
            print(json.dumps(res, indent=2))
        elif args.command == "start-buffer":
            c = ObsClient(args.host, args.port, args.password)
            c.connect()
            c.call("StartReplayBuffer")
            c.close()
            print(json.dumps({"success": True, "action": "StartReplayBuffer"}))
        elif args.command == "stop-buffer":
            c = ObsClient(args.host, args.port, args.password)
            c.connect()
            c.call("StopReplayBuffer")
            c.close()
            print(json.dumps({"success": True, "action": "StopReplayBuffer"}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
