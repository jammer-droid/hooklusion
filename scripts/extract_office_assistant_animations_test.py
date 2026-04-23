from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw

from scripts.extract_office_assistant_animations import (
    RowBand,
    SegmentSpec,
    chroma_key_magenta,
    detect_frame_boxes,
    detect_row_bands,
    extract_segment_frames,
    remove_tiny_alpha_components,
    write_row_strips,
)


class ExtractOfficeAssistantAnimationsTest(unittest.TestCase):
    def test_chroma_key_magenta_makes_background_transparent(self) -> None:
        image = Image.new("RGBA", (10, 10), (255, 0, 255, 255))
        draw = ImageDraw.Draw(image)
        draw.rectangle((3, 3, 6, 6), fill=(255, 240, 0, 255))

        keyed = chroma_key_magenta(image)

        self.assertEqual(keyed.getpixel((0, 0))[3], 0)
        self.assertEqual(keyed.getpixel((4, 4))[3], 255)

    def test_remove_tiny_alpha_components_drops_orphan_pixels(self) -> None:
        image = Image.new("RGBA", (20, 20), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rectangle((2, 2, 8, 8), fill=(255, 240, 0, 255))
        draw.point((18, 18), fill=(255, 240, 0, 255))

        cleaned = remove_tiny_alpha_components(image, min_area=4)

        self.assertEqual(cleaned.getpixel((18, 18))[3], 0)
        self.assertEqual(cleaned.getpixel((5, 5))[3], 255)

    def test_detect_row_bands_finds_foreground_rows(self) -> None:
        image = Image.new("RGBA", (20, 35), (255, 0, 255, 255))
        draw = ImageDraw.Draw(image)
        draw.rectangle((2, 4, 8, 12), fill=(255, 240, 0, 255))
        draw.rectangle((2, 22, 8, 30), fill=(255, 240, 0, 255))

        rows = detect_row_bands(image, foreground_threshold=2, min_height=3)

        self.assertEqual([(row.y0, row.y1) for row in rows], [(4, 12), (22, 30)])

    def test_detect_frame_boxes_finds_row_relative_frames(self) -> None:
        image = Image.new("RGBA", (60, 40), (255, 0, 255, 255))
        draw = ImageDraw.Draw(image)
        draw.rectangle((2, 12, 9, 18), fill=(255, 240, 0, 255))
        draw.rectangle((22, 12, 29, 18), fill=(255, 240, 0, 255))
        row = RowBand(index=0, y0=10, y1=22, topic="test")

        boxes = detect_frame_boxes(image, row, foreground_threshold=1, merge_gap=2)

        self.assertEqual([(box.x0, box.x1) for box in boxes], [(2, 9), (22, 29)])

    def test_write_row_strips_writes_detected_rows(self) -> None:
        with TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            image = Image.new("RGBA", (20, 25), (255, 0, 255, 255))
            rows = [
                RowBand(index=0, y0=0, y1=9, topic="test"),
                RowBand(index=1, y0=10, y1=24, topic="test"),
            ]

            paths = write_row_strips(image, output_dir, rows=rows)

            self.assertEqual(
                [path.name for path in paths],
                ["row_00_y0000-0009.png", "row_01_y0010-0024.png"],
            )
            with Image.open(paths[-1]) as last_row:
                self.assertEqual(last_row.size, (20, 15))

    def test_extract_segment_frames_uses_row_relative_boxes(self) -> None:
        image = Image.new("RGBA", (60, 40), (255, 0, 255, 255))
        draw = ImageDraw.Draw(image)
        draw.rectangle((2, 12, 9, 18), fill=(255, 240, 0, 255))
        draw.rectangle((22, 12, 29, 18), fill=(255, 240, 0, 255))

        segment = SegmentSpec(
            state="thinking",
            animation="test",
            row_index=0,
            frame_start=0,
            frame_count=2,
            label="test segment",
        )
        row = RowBand(index=0, y0=10, y1=22, topic="test")
        boxes = detect_frame_boxes(image, row, foreground_threshold=1, merge_gap=2)

        frames = extract_segment_frames(
            image,
            segment,
            rows=[row],
            boxes_by_row={0: boxes},
            canvas_size=32,
        )

        self.assertEqual(len(frames), 2)
        for frame in frames:
            self.assertEqual(frame.size, (32, 32))
            self.assertIsNotNone(frame.getchannel("A").getbbox())


if __name__ == "__main__":
    unittest.main()
