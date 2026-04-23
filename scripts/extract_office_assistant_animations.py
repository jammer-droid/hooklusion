#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = ROOT / "assets" / "office-assistant"
FRAME_CANVAS_SIZE = 160
MAGENTA_THRESHOLD = 235


@dataclass(frozen=True)
class RowBand:
    index: int
    y0: int
    y1: int
    topic: str


@dataclass(frozen=True)
class FrameBox:
    index: int
    x0: int
    x1: int


@dataclass(frozen=True)
class SegmentSpec:
    state: str
    animation: str
    row_index: int
    frame_start: int
    frame_count: int
    label: str
    tier: str = "regular"
    duration_ms: int = 180
    loop: bool = True


ROW_TOPICS: tuple[str, ...] = (
    "greeting, happy idle, computer action",
    "tool props, pointing, construction-like actions",
    "small idle, crawl, slide transitions",
    "seated attentive idle and expression changes",
    "seated head-turn and talk poses",
    "documents, charts, cards, presentation props",
    "standing look-around and gesture loop",
    "walk, approach, and gesture transitions",
    "document and clipboard reading",
    "desk work and typing",
    "desk exit, run, sleep, rest poses",
    "computer/electric action and standing loop",
    "standing turn and look-around loop",
    "computer entry, props, stumble transitions",
    "sleep, sniff/search, run, happy status",
    "award, certificate, badge, presentation poses",
    "paper reading, writing, presentation gestures",
    "talk, reaction, sleep/error-like poses",
    "compact idle transitions",
    "standing idle and gesture variants",
    "wave, run, fall/recover transitions",
    "mixed attention and prop transitions",
    "computer/electric action sequences",
    "door/entry, walk, seated idle",
    "run/search, saw-like prop, happy/heart status",
    "badge/book/status symbols and cloud reaction",
    "props, hat, dance-like gestures",
    "newspaper/paper interaction and reading",
    "seated talk, open-mouth reaction, walk",
    "seated talk/reaction and standing transition",
    "seated idle variants",
    "wave, walk, crawl, mixed transitions",
    "pointer/pole, walk, crawl transitions",
    "crawl, walk, sit, stand transitions",
    "standing gesture and talk variants",
    "short idle tail",
)


# Row-first segment catalog. A row is the first unit of organization; each
# segment then selects a contiguous frame range from that detected row.
DEFAULT_SEGMENTS: tuple[SegmentSpec, ...] = (
    SegmentSpec(
        state="idle",
        animation="seated_idle",
        row_index=3,
        frame_start=0,
        frame_count=8,
        label="calm seated idle loop",
        duration_ms=220,
    ),
    SegmentSpec(
        state="prompt_received",
        animation="attentive_talk",
        row_index=4,
        frame_start=0,
        frame_count=8,
        label="attentive seated talk/head turn",
        duration_ms=180,
    ),
    SegmentSpec(
        state="thinking",
        animation="paper_think",
        row_index=16,
        frame_start=2,
        frame_count=6,
        label="paper read/write thinking loop",
        duration_ms=190,
    ),
    SegmentSpec(
        state="tool_active",
        animation="desk_work",
        row_index=9,
        frame_start=0,
        frame_count=25,
        label="desk work / typing sequence",
        duration_ms=120,
    ),
    SegmentSpec(
        state="done",
        animation="happy_status",
        row_index=24,
        frame_start=18,
        frame_count=4,
        label="happy/status reaction",
        duration_ms=160,
    ),
    SegmentSpec(
        state="error",
        animation="cloud_reaction",
        row_index=25,
        frame_start=20,
        frame_count=5,
        label="cloud/error reaction",
        duration_ms=170,
        loop=False,
    ),
    SegmentSpec(
        state="session_start",
        animation="greeting",
        row_index=0,
        frame_start=0,
        frame_count=7,
        label="happy greeting loop",
        tier="extended",
        duration_ms=160,
    ),
    SegmentSpec(
        state="tool_read",
        animation="clipboard_read",
        row_index=8,
        frame_start=2,
        frame_count=10,
        label="clipboard/document reading",
        tier="extended",
        duration_ms=150,
    ),
    SegmentSpec(
        state="tool_search",
        animation="sniff_search",
        row_index=14,
        frame_start=2,
        frame_count=6,
        label="sniff/search movement",
        tier="extended",
        duration_ms=150,
    ),
    SegmentSpec(
        state="tool_explore",
        animation="crawl_explore",
        row_index=32,
        frame_start=18,
        frame_count=10,
        label="crawl/explore movement",
        tier="extended",
        duration_ms=140,
    ),
    SegmentSpec(
        state="tool_web",
        animation="computer_action",
        row_index=22,
        frame_start=9,
        frame_count=6,
        label="computer/electric action",
        tier="extended",
        duration_ms=140,
    ),
    SegmentSpec(
        state="tool_vcs_read",
        animation="presentation_review",
        row_index=5,
        frame_start=10,
        frame_count=7,
        label="document/chart review",
        tier="extended",
        duration_ms=170,
    ),
    SegmentSpec(
        state="tool_vcs_write",
        animation="desk_typing",
        row_index=9,
        frame_start=5,
        frame_count=12,
        label="focused desk typing subset",
        tier="extended",
        duration_ms=120,
    ),
    SegmentSpec(
        state="tool_test",
        animation="inspect_react",
        row_index=17,
        frame_start=8,
        frame_count=7,
        label="inspect/reaction loop",
        tier="extended",
        duration_ms=160,
    ),
    SegmentSpec(
        state="tool_build",
        animation="tool_prop",
        row_index=1,
        frame_start=2,
        frame_count=4,
        label="tool/prop action",
        tier="extended",
        duration_ms=150,
    ),
)


def is_magenta_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 0 and r > MAGENTA_THRESHOLD and g < 45 and b > MAGENTA_THRESHOLD


def chroma_key_magenta(image: Image.Image) -> Image.Image:
    keyed = image.convert("RGBA")
    pixels = keyed.load()
    for y in range(keyed.height):
        for x in range(keyed.width):
            if is_magenta_pixel(pixels[x, y]):
                pixels[x, y] = (*pixels[x, y][:3], 0)
    return keyed


def detect_row_bands(
    image: Image.Image,
    *,
    foreground_threshold: int = 50,
    min_height: int = 8,
) -> list[RowBand]:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    row_counts: list[int] = []
    for y in range(rgba.height):
        count = 0
        for x in range(rgba.width):
            if not is_magenta_pixel(pixels[x, y]):
                count += 1
        row_counts.append(count)

    bands: list[RowBand] = []
    start: int | None = None
    for y, count in enumerate(row_counts):
        if count > foreground_threshold:
            if start is None:
                start = y
        elif start is not None:
            if y - start >= min_height:
                index = len(bands)
                topic = ROW_TOPICS[index] if index < len(ROW_TOPICS) else "unclassified"
                bands.append(RowBand(index=index, y0=start, y1=y - 1, topic=topic))
            start = None

    if start is not None and rgba.height - start >= min_height:
        index = len(bands)
        topic = ROW_TOPICS[index] if index < len(ROW_TOPICS) else "unclassified"
        bands.append(RowBand(index=index, y0=start, y1=rgba.height - 1, topic=topic))
    return bands


def detect_frame_boxes(
    image: Image.Image,
    row: RowBand,
    *,
    foreground_threshold: int = 2,
    merge_gap: int = 8,
    min_width: int = 8,
) -> list[FrameBox]:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    raw_boxes: list[tuple[int, int]] = []
    start: int | None = None
    for x in range(rgba.width):
        count = 0
        for y in range(row.y0, row.y1 + 1):
            if not is_magenta_pixel(pixels[x, y]):
                count += 1
        if count > foreground_threshold:
            if start is None:
                start = x
        elif start is not None:
            raw_boxes.append((start, x - 1))
            start = None

    if start is not None:
        raw_boxes.append((start, rgba.width - 1))

    merged: list[list[int]] = []
    for x0, x1 in raw_boxes:
        if not merged or x0 - merged[-1][1] > merge_gap:
            merged.append([x0, x1])
        else:
            merged[-1][1] = x1

    return [
        FrameBox(index=index, x0=x0, x1=x1)
        for index, (x0, x1) in enumerate(merged)
        if x1 - x0 + 1 >= min_width
    ]


def write_row_strips(
    image: Image.Image,
    output_dir: Path,
    *,
    rows: list[RowBand] | None = None,
    row_height: int | None = None,
) -> list[Path]:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    row_paths: list[Path] = []
    if rows is None:
        if row_height is None:
            raise ValueError("rows or row_height must be provided")
        rows = [
            RowBand(index=index, y0=y, y1=min(image.height, y + row_height) - 1, topic="fixed-height")
            for index, y in enumerate(range(0, image.height, row_height))
        ]

    for row in rows:
        strip = image.crop((0, row.y0, image.width, row.y1 + 1))
        strip = chroma_key_magenta(strip)
        row_path = output_dir / f"row_{row.index:02d}_y{row.y0:04d}-{row.y1:04d}.png"
        strip.save(row_path)
        row_paths.append(row_path)
    return row_paths


def extract_segment_frames(
    image: Image.Image,
    segment: SegmentSpec,
    *,
    rows: list[RowBand] | None = None,
    boxes_by_row: dict[int, list[FrameBox]] | None = None,
    canvas_size: int = FRAME_CANVAS_SIZE,
) -> list[Image.Image]:
    rows = rows if rows is not None else detect_row_bands(image)
    row = rows[segment.row_index]
    boxes_by_row = boxes_by_row if boxes_by_row is not None else {
        row.index: detect_frame_boxes(image, row)
    }
    frame_boxes = boxes_by_row[row.index]
    selected_boxes = frame_boxes[segment.frame_start : segment.frame_start + segment.frame_count]
    if len(selected_boxes) != segment.frame_count:
        raise ValueError(
            f"{segment.state}:{segment.animation} requested {segment.frame_count} frames "
            f"from row {segment.row_index}, but only {len(selected_boxes)} were available"
        )

    frames: list[Image.Image] = []
    for box in selected_boxes:
        frame = image.crop(
            (
                max(0, box.x0 - 4),
                max(0, row.y0 - 1),
                min(image.width, box.x1 + 5),
                min(image.height, row.y1 + 9),
            )
        )
        frame = chroma_key_magenta(frame)
        frame = remove_tiny_alpha_components(frame)
        frame = trim_alpha(frame)
        frame = normalize_frame_canvas(frame, canvas_size=canvas_size)
        frames.append(frame)
    return frames


def remove_tiny_alpha_components(
    image: Image.Image,
    *,
    min_area: int = 24,
) -> Image.Image:
    cleaned = image.convert("RGBA")
    alpha = cleaned.getchannel("A")
    width, height = cleaned.size
    visited = bytearray(width * height)
    pixels = cleaned.load()

    for start_y in range(height):
        for start_x in range(width):
            start_offset = start_y * width + start_x
            if visited[start_offset] or alpha.getpixel((start_x, start_y)) == 0:
                continue

            stack = [(start_x, start_y)]
            component: list[tuple[int, int]] = []
            visited[start_offset] = 1
            while stack:
                x, y = stack.pop()
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    offset = ny * width + nx
                    if visited[offset] or alpha.getpixel((nx, ny)) == 0:
                        continue
                    visited[offset] = 1
                    stack.append((nx, ny))

            if len(component) < min_area:
                for x, y in component:
                    r, g, b, _ = pixels[x, y]
                    pixels[x, y] = (r, g, b, 0)
    return cleaned


def trim_alpha(image: Image.Image, *, padding: int = 8) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image
    left, top, right, bottom = bbox
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


def normalize_frame_canvas(
    image: Image.Image,
    *,
    canvas_size: int = FRAME_CANVAS_SIZE,
) -> Image.Image:
    fitted = ImageOps.contain(
        image.convert("RGBA"),
        (canvas_size - 16, canvas_size - 16),
        method=Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - fitted.width) // 2
    y = canvas_size - fitted.height - 8
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def write_animation_outputs(
    source: Image.Image,
    output_dir: Path,
    segments: tuple[SegmentSpec, ...] = DEFAULT_SEGMENTS,
) -> dict[str, object]:
    rows = detect_row_bands(source)
    boxes_by_row = {row.index: detect_frame_boxes(source, row) for row in rows}
    animations_dir = output_dir / "animations"
    if animations_dir.exists():
        shutil.rmtree(animations_dir)
    animations_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, object] = {}
    for segment in segments:
        state_dir = animations_dir / segment.state / segment.animation
        state_dir.mkdir(parents=True, exist_ok=True)
        for stale_frame in state_dir.glob("frame_*.png"):
            stale_frame.unlink()

        frames = extract_segment_frames(
            source,
            segment,
            rows=rows,
            boxes_by_row=boxes_by_row,
        )
        frame_records: list[dict[str, object]] = []
        selected_boxes = boxes_by_row[segment.row_index][
            segment.frame_start : segment.frame_start + segment.frame_count
        ]
        for index, (frame, box) in enumerate(zip(frames, selected_boxes, strict=True)):
            frame_path = state_dir / f"frame_{index:03d}.png"
            frame.save(frame_path)
            frame_records.append(
                {
                    "index": index,
                    "sourceBox": asdict(box),
                    "path": str(frame_path),
                }
            )

        row = rows[segment.row_index]
        manifest[f"{segment.state}:{segment.animation}"] = {
            **asdict(segment),
            "sourceRow": asdict(row),
            "frames": frame_records,
        }

    (output_dir / "animation-catalog.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False)
    )
    build_preview_sheet(manifest, output_dir / "preview.png")
    return manifest


def build_preview_sheet(manifest: dict[str, object], output_path: Path) -> Path:
    rows = list(manifest.items())
    max_frames = max(len(row[1]["frames"]) for row in rows) if rows else 0
    thumb = 88
    label_width = 250
    row_height = 104
    sheet = Image.new(
        "RGBA",
        (label_width + max_frames * thumb, max(1, len(rows)) * row_height),
        (246, 246, 246, 255),
    )
    draw = ImageDraw.Draw(sheet)
    for row_index, (key, spec) in enumerate(rows):
        y = row_index * row_height
        draw.text((6, y + 12), key, fill=(0, 0, 0, 255))
        draw.text((6, y + 32), f"row {spec['row_index']} / {spec['tier']}", fill=(80, 80, 80, 255))
        for frame in spec["frames"]:
            frame_image = Image.open(frame["path"]).convert("RGBA")
            background = Image.new("RGBA", (thumb, thumb), (255, 255, 255, 255))
            fitted = ImageOps.contain(frame_image, (thumb, thumb))
            background.alpha_composite(
                fitted,
                ((thumb - fitted.width) // 2, (thumb - fitted.height) // 2),
            )
            sheet.alpha_composite(background, (label_width + frame["index"] * thumb, y))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    return output_path


def write_catalog_summary(output_dir: Path, source: Image.Image) -> Path:
    rows = detect_row_bands(source)
    row_catalog: list[dict[str, object]] = []
    for row in rows:
        row_catalog.append(
            {
                **asdict(row),
                "frames": [asdict(box) for box in detect_frame_boxes(source, row)],
                "selectedSegments": [
                    asdict(segment)
                    for segment in DEFAULT_SEGMENTS
                    if segment.row_index == row.index
                ],
            }
        )
    path = output_dir / "row-segment-catalog.json"
    path.write_text(json.dumps(row_catalog, indent=2, ensure_ascii=False))
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Image.open(args.source).convert("RGBA")
    rows = detect_row_bands(source)
    write_row_strips(source, args.output / "rows", rows=rows)
    write_catalog_summary(args.output, source)
    write_animation_outputs(source, args.output)
    print(f"rows: {args.output / 'rows'}")
    print(f"catalog: {args.output / 'row-segment-catalog.json'}")
    print(f"animations: {args.output / 'animations'}")
    print(f"preview: {args.output / 'preview.png'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
