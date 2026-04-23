#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.extract_office_assistant_animations import is_magenta_pixel

MAGENTA = np.array([255, 0, 255, 255], dtype=np.uint8)
WHITE = np.array([255, 255, 255, 255], dtype=np.uint8)
BLACK = np.array([0, 0, 0, 255], dtype=np.uint8)


def _bool_to_mask_image(mask: np.ndarray) -> Image.Image:
    return Image.fromarray((mask.astype(np.uint8) * 255), "L")


def _mask_image_to_bool(mask_image: Image.Image) -> np.ndarray:
    return np.array(mask_image) > 127


def dilate(mask: np.ndarray, iterations: int) -> np.ndarray:
    image = _bool_to_mask_image(mask)
    for _ in range(max(0, iterations)):
        image = image.filter(ImageFilter.MaxFilter(3))
    return _mask_image_to_bool(image)


def erode(mask: np.ndarray, iterations: int) -> np.ndarray:
    image = _bool_to_mask_image(mask)
    for _ in range(max(0, iterations)):
        image = image.filter(ImageFilter.MinFilter(3))
    return _mask_image_to_bool(image)


def build_guide_mask(
    support_image: Image.Image,
    *,
    protect_px: int = 6,
    unknown_px: int = 10,
) -> Image.Image:
    support_alpha = np.array(support_image.convert("RGBA"))[..., 3] > 0
    protect = erode(support_alpha, protect_px)
    remove = ~dilate(support_alpha, unknown_px)

    guide = np.zeros((support_image.height, support_image.width, 4), dtype=np.uint8)
    guide[:, :] = BLACK
    guide[remove] = MAGENTA
    guide[protect] = WHITE
    return Image.fromarray(guide, "RGBA")


def apply_guide_mask(
    source_image: Image.Image,
    guide_mask: Image.Image,
    *,
    fallback_alpha_image: Image.Image | None = None,
) -> Image.Image:
    source = np.array(source_image.convert("RGBA"))
    guide = guide_mask.convert("RGBA")
    fallback_alpha = None
    if fallback_alpha_image is not None:
        fallback_alpha = np.array(fallback_alpha_image.convert("RGBA"))[..., 3]

    out = source.copy()

    guide_pixels = guide.load()
    remove = np.zeros((guide.height, guide.width), dtype=bool)
    protect = np.zeros((guide.height, guide.width), dtype=bool)
    for y in range(guide.height):
        for x in range(guide.width):
            pixel = guide_pixels[x, y]
            if is_magenta_pixel(pixel):
                remove[y, x] = True
            elif pixel[:3] == (255, 255, 255) and pixel[3] > 0:
                protect[y, x] = True

    unknown = ~(remove | protect)
    out[remove] = 0
    out[protect, 3] = 255

    if fallback_alpha is not None:
        out[unknown, 3] = fallback_alpha[unknown]
        out[unknown & (fallback_alpha == 0)] = 0

    return Image.fromarray(out, "RGBA")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build and apply a trimap-like guide mask for sprite cleanup.",
    )
    parser.add_argument("--source", type=Path, required=True, help="Original RGBA source PNG.")
    parser.add_argument(
        "--support",
        type=Path,
        required=True,
        help="Support alpha PNG used to seed the guide mask.",
    )
    parser.add_argument("--guide-out", type=Path, required=True, help="Output guide mask PNG.")
    parser.add_argument(
        "--result-out",
        type=Path,
        required=True,
        help="Output guided result PNG.",
    )
    parser.add_argument(
        "--protect-px",
        type=int,
        default=6,
        help="How far to erode the support alpha for guaranteed keep pixels.",
    )
    parser.add_argument(
        "--unknown-px",
        type=int,
        default=10,
        help="How far outside support alpha to keep as editable unknown band.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = Image.open(args.source).convert("RGBA")
    support = Image.open(args.support).convert("RGBA")
    guide = build_guide_mask(
        support,
        protect_px=args.protect_px,
        unknown_px=args.unknown_px,
    )
    result = apply_guide_mask(source, guide, fallback_alpha_image=support)

    args.guide_out.parent.mkdir(parents=True, exist_ok=True)
    args.result_out.parent.mkdir(parents=True, exist_ok=True)
    guide.save(args.guide_out)
    result.save(args.result_out)


if __name__ == "__main__":
    main()
