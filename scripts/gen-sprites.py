#!/usr/bin/env python3
"""
Batch sprite generator using ComfyUI + Flux Kontext (GGUF).

Reads poses.json, submits one job per frame to the running ComfyUI API
(http://127.0.0.1:8188), waits for completion, and copies each result into
assets/gpchan/sprites/{state}_{frame}.png.

Usage:
  python scripts/gen-sprites.py                 # run all frames
  python scripts/gen-sprites.py --only thinking # run only matching states
  python scripts/gen-sprites.py --skip-existing # resume
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

try:
    from rembg import remove as _rembg_remove, new_session as _rembg_new_session
    _RMBG_SESSION = _rembg_new_session("isnet-anime")
    _HAS_REMBG = True
except Exception:
    _HAS_REMBG = False

SERVER = "http://127.0.0.1:8188"
ROOT = Path(__file__).resolve().parent.parent
POSES_PATH = ROOT / "assets" / "gpchan" / "poses.json"
SPRITES_DIR = ROOT / "assets" / "gpchan" / "sprites"
COMFY_OUTPUT = Path(
    os.environ.get("COMFYUI_OUTPUT_DIR", str(Path.home() / "ComfyUI" / "output"))
)
COMFY_INPUT = Path(
    os.environ.get("COMFYUI_INPUT_DIR", str(Path.home() / "ComfyUI" / "input"))
)

WIDTH = 512
HEIGHT = 512
STEPS = 20
GUIDANCE = 2.5
SEED_BASE = 42


def build_workflow(reference_image: str, positive: str, negative: str, seed: int, prefix: str) -> dict:
    return {
        "1":  {"class_type": "LoadImage", "inputs": {"image": reference_image}},
        "2":  {"class_type": "FluxKontextImageScale", "inputs": {"image": ["1", 0]}},
        "11": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "3":  {"class_type": "VAEEncode", "inputs": {"pixels": ["2", 0], "vae": ["11", 0]}},
        "4":  {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "flux1-kontext-dev-Q5_K_M.gguf"}},
        "5":  {"class_type": "DualCLIPLoaderGGUF", "inputs": {
            "clip_name1": "t5-v1_1-xxl-encoder-Q5_K_M.gguf",
            "clip_name2": "clip_l.safetensors",
            "type": "flux"}},
        "6":  {"class_type": "CLIPTextEncode", "inputs": {"text": positive, "clip": ["5", 0]}},
        "7":  {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["5", 0]}},
        "8":  {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["6", 0], "latent": ["3", 0]}},
        "9":  {"class_type": "FluxGuidance", "inputs": {"conditioning": ["8", 0], "guidance": GUIDANCE}},
        "10": {"class_type": "EmptySD3LatentImage", "inputs": {"width": WIDTH, "height": HEIGHT, "batch_size": 1}},
        "12": {"class_type": "KSampler", "inputs": {
            "model": ["4", 0], "seed": seed, "steps": STEPS, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple",
            "positive": ["9", 0], "negative": ["7", 0],
            "latent_image": ["10", 0], "denoise": 1.0}},
        "13": {"class_type": "VAEDecode", "inputs": {"samples": ["12", 0], "vae": ["11", 0]}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": prefix}},
    }


def queue_prompt(workflow: dict) -> str:
    req = urllib.request.Request(
        f"{SERVER}/prompt",
        data=json.dumps({"prompt": workflow}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTPError {e.code}: {e.read().decode()}", file=sys.stderr)
        return ""
    if result.get("node_errors"):
        print(f"  node_errors: {result['node_errors']}", file=sys.stderr)
    return result.get("prompt_id", "")


def wait_for(prompt_id: str, timeout_sec: int = 900) -> list[dict]:
    t0 = time.time()
    last_log = 0.0
    while time.time() - t0 < timeout_sec:
        try:
            h = json.loads(urllib.request.urlopen(f"{SERVER}/history/{prompt_id}", timeout=10).read())
        except Exception:
            h = {}
        if prompt_id in h:
            entry = h[prompt_id]
            status = entry.get("status", {})
            if status.get("completed"):
                images = []
                for _, out in entry.get("outputs", {}).items():
                    for img in out.get("images", []):
                        images.append(img)
                return images
            if status.get("status_str") == "error":
                print(f"  error: {json.dumps(status)[:300]}", file=sys.stderr)
                return []
        now = time.time()
        if now - last_log >= 30:
            elapsed = int(now - t0)
            print(f"    … {elapsed}s elapsed", flush=True)
            last_log = now
        time.sleep(3)
    print("  TIMEOUT", file=sys.stderr)
    return []


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated state names to include")
    ap.add_argument("--skip-existing", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="stop after N successful frames (0 = no limit)")
    args = ap.parse_args()

    poses = json.loads(POSES_PATH.read_text())
    style = poses["style_prompt"]
    negative = poses["negative"]
    ref_name = poses.get("reference_comfy_filename") or Path(poses["reference"]).name
    dst = COMFY_INPUT / ref_name
    if not dst.exists():
        print(f"reference image not found in ComfyUI/input: {ref_name}", file=sys.stderr)
        return 1

    SPRITES_DIR.mkdir(parents=True, exist_ok=True)

    only = set(args.only.split(",")) if args.only else None
    frames = poses["frames"]
    total = len(frames)
    done = 0

    for idx, frame in enumerate(frames, 1):
        state = frame["state"]
        fkey = frame.get("frame")
        base = f"{state}_{fkey}" if fkey else state
        dest = SPRITES_DIR / f"{base}.png"
        if only and state not in only:
            continue
        if args.skip_existing and dest.exists():
            print(f"[{idx}/{total}] skip {dest.name} (exists)")
            done += 1
            continue

        positive = f"{style}. Pose: {frame['pose_prompt']}. Keep identical character identity as the reference image."
        seed = SEED_BASE + idx
        prefix = f"_gen/{base}"

        print(f"[{idx}/{total}] {base} — queueing …", flush=True)
        pid = queue_prompt(build_workflow(ref_name, positive, negative, seed, prefix))
        if not pid:
            print(f"  queue failed, skip")
            continue

        t_start = time.time()
        images = wait_for(pid)
        dur = time.time() - t_start
        if not images:
            print(f"  failed after {dur:.1f}s")
            continue

        img = images[0]
        src_img = COMFY_OUTPUT / img.get("subfolder", "") / img["filename"]
        if not src_img.exists():
            print(f"  output missing: {src_img}")
            continue
        shutil.copy(src_img, dest)
        if _HAS_REMBG:
            try:
                with open(dest, "rb") as f:
                    raw = f.read()
                cut = _rembg_remove(raw, session=_RMBG_SESSION)
                with open(dest, "wb") as f:
                    f.write(cut)
            except Exception as exc:
                print(f"  rembg failed: {exc}", file=sys.stderr)
        tag = "+rembg" if _HAS_REMBG else "raw"
        print(f"  -> {dest.name}  ({dur:.1f}s, {tag})")
        done += 1
        if args.limit and done >= args.limit:
            print(f"  reached --limit {args.limit}, stopping.")
            break

    print(f"\n{done}/{total} frames done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
