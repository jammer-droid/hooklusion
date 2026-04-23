#!/usr/bin/env python3
"""
Batch background removal using BRIA RMBG-2.0.

Mirrors the input directory tree into the output directory, one RGBA PNG per
input PNG. Skips files whose outputs already exist so runs are resumable.

Requirements:
    uv venv /tmp/rmbg2_env
    uv pip install --python /tmp/rmbg2_env/bin/python \
        torch torchvision transformers pillow numpy kornia timm einops

RMBG-2.0 is a gated Hugging Face repo. Accept the license at
    https://huggingface.co/briaai/RMBG-2.0
and save a read token to ~/.cache/huggingface/token.

Usage:
    /tmp/rmbg2_env/bin/python scripts/remove_bg_rmbg2.py \
        --src /absolute/path/to/split_frames \
        --dst /absolute/path/to/split_frames_rmbg2

See docs/public/sprite-processing-workflow.md and
docs/local/sprite-background-removal-rmbg2.md for the workflow details and
license caveats.
"""
from __future__ import annotations

import argparse
import glob
import os
import time

import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

INPUT_SIZE = (1024, 1024)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--src", required=True, help="input directory (recursed)")
    p.add_argument("--dst", required=True, help="output directory (mirrors src)")
    p.add_argument(
        "--pattern",
        default="**/*.png",
        help="glob pattern under src (default: **/*.png)",
    )
    p.add_argument(
        "--model",
        default="briaai/RMBG-2.0",
        help="HuggingFace model id (default: briaai/RMBG-2.0)",
    )
    p.add_argument(
        "--device",
        default=None,
        help="torch device (default: mps if available, else cpu)",
    )
    return p.parse_args()


def pick_device(explicit: str | None) -> str:
    if explicit:
        return explicit
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def main() -> None:
    args = parse_args()
    device = pick_device(args.device)
    print(f"device: {device}")

    model = AutoModelForImageSegmentation.from_pretrained(
        args.model, trust_remote_code=True
    ).to(device).eval()

    tf = transforms.Compose([
        transforms.Resize(INPUT_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    pngs = sorted(glob.glob(os.path.join(args.src, args.pattern), recursive=True))
    print(f"found {len(pngs)} files under {args.src}")

    t0 = time.time()
    done = skipped = 0
    for i, p in enumerate(pngs, 1):
        rel = os.path.relpath(p, args.src)
        out = os.path.join(args.dst, rel)
        if os.path.exists(out):
            skipped += 1
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)

        im = Image.open(p).convert("RGB")
        w, h = im.size
        x = tf(im).unsqueeze(0).to(device)
        with torch.no_grad():
            pred = model(x)[-1].sigmoid().cpu()
        alpha = transforms.ToPILImage()(pred[0, 0]).resize((w, h), Image.BILINEAR)
        rgba = np.dstack([np.array(im), np.array(alpha)])
        Image.fromarray(rgba, "RGBA").save(out)
        done += 1
        print(f"[{i}/{len(pngs)}] {rel}  {w}x{h}")

    print(f"\ndone: {done}  skipped: {skipped}  elapsed: {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
